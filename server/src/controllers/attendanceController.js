import prisma from "../prisma.js";
import { assertClassAccess, classScopeWhere } from "../lib/scope.js";

/** 0=Sun … 4=Thu, 5=Fri — off days (class runs Sat–Wed) */
const OFF_WEEKDAYS = new Set([4, 5]);

/** Local YYYY-MM-DD (avoids UTC shift from toISOString) */
function toLocalISO(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function isOffDay(dateInput) {
  const d =
    typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateInput)
      ? parseLocalDate(dateInput)
      : dateInput instanceof Date
        ? dateInput
        : new Date(dateInput);
  return OFF_WEEKDAYS.has(d.getDay());
}

function dayBounds(dateStr) {
  const day = parseLocalDate(dateStr);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  return { day, next };
}

export async function listAttendances(req, res, next) {
  try {
    const { studentId, classId, date } = req.query;
    const where = {};
    if (studentId) where.studentId = studentId.toString();
    if (classId) where.student = { classId: classId.toString() };
    if (date) {
      const { day, next } = dayBounds(date.toString());
      where.date = { gte: day, lt: next };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            picture: true,
            phone: true,
            parentPhone: true,
            class: { select: { id: true, className: true, classCode: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { student: { name: "asc" } }],
    });

    res.json({ attendances });
  } catch (error) {
    next(error);
  }
}

/** Class + date roster: all students, default PRESENT if not marked yet */
export async function getClassDay(req, res, next) {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ message: "classId and date are required" });
    }

    const classItem = await assertClassAccess(req, classId);
    const dateStr = date.toString().slice(0, 10);
    const off = isOffDay(dateStr);
    const { day, next } = dayBounds(dateStr);

    const students = await prisma.student.findMany({
      where: { classId: classId.toString(), enrollmentStatus: { not: "WITHDRAWN" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        studentId: true,
        name: true,
        picture: true,
        phone: true,
        parentPhone: true,
        enrollmentStatus: true,
      },
    });

    const records = await prisma.attendance.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        date: { gte: day, lt: next },
      },
    });

    const byStudent = Object.fromEntries(records.map((r) => [r.studentId, r]));
    const savedCount = records.length;
    const submitted = savedCount > 0;
    const notTaken = !off && !submitted && parseLocalDate(dateStr) < startOfToday();

    const roster = students.map((s) => {
      const rec = byStudent[s.id];
      return {
        studentId: s.id,
        serial: s.studentId,
        name: s.name,
        picture: s.picture,
        phone: s.phone || "",
        parentPhone: s.parentPhone || "",
        enrollmentStatus: s.enrollmentStatus,
        attendanceId: rec?.id || null,
        status: rec?.status || "PRESENT",
        note: rec?.note || "",
        isSaved: Boolean(rec),
      };
    });

    const summary = {
      studentCount: roster.length,
      total: roster.length,
      presentCount: roster.filter((r) => r.status === "PRESENT").length,
      absentCount: roster.filter((r) => r.status === "ABSENT").length,
      lateCount: roster.filter((r) => r.status === "LATE").length,
      excusedCount: roster.filter((r) => r.status === "EXCUSED").length,
      present: roster.filter((r) => r.status === "PRESENT").length,
      absent: roster.filter((r) => r.status === "ABSENT").length,
      late: roster.filter((r) => r.status === "LATE").length,
      excused: roster.filter((r) => r.status === "EXCUSED").length,
      saved: savedCount,
    };

    res.json({
      class: {
        id: classItem.id,
        className: classItem.className,
        classCode: classItem.classCode,
        teacher: classItem.teacher,
      },
      attendanceDate: dateStr,
      date: dateStr,
      dayOff: off,
      status: off ? "DAY_OFF" : submitted ? "SUBMITTED" : "OPEN",
      notTaken,
      locked: submitted,
      roster,
      records: roster,
      summary,
      canMark: true,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}

/** Bulk save / submit marks for one class + date */
export async function saveClassDay(req, res, next) {
  try {
    const { classId, date, marks } = req.body;

    if (!classId || !date || !Array.isArray(marks)) {
      return res.status(400).json({
        message: "classId, date and marks[] are required",
      });
    }

    await assertClassAccess(req, classId);

    if (isOffDay(date)) {
      return res.status(400).json({
        message: "Thursday and Friday are off — no attendance on those days.",
      });
    }

    const { day } = dayBounds(date);
    const allowed = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

    await prisma.$transaction(
      marks.map((m) => {
        const status = String(m.status || "PRESENT").toUpperCase();
        if (!allowed.includes(status)) {
          throw Object.assign(new Error(`Invalid status: ${m.status}`), {
            status: 400,
          });
        }
        return prisma.attendance.upsert({
          where: {
            studentId_date: { studentId: m.studentId, date: day },
          },
          update: { status, note: m.note || null },
          create: {
            studentId: m.studentId,
            date: day,
            status,
            note: m.note || null,
          },
        });
      })
    );

    req.query = { classId, date };
    return getClassDay(req, res, next);
  } catch (error) {
    next(error);
  }
}

export async function upsertAttendance(req, res, next) {
  try {
    const { studentId, date, status, note } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({ message: "studentId, date and status are required" });
    }

    if (isOffDay(date)) {
      return res.status(400).json({
        message: "Thursday and Friday are off — no attendance on those days.",
      });
    }

    const normalized = status.toUpperCase();
    if (!["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(normalized)) {
      return res.status(400).json({ message: "Invalid attendance status" });
    }

    const { day } = dayBounds(date);

    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_date: { studentId, date: day },
      },
      update: { status: normalized, note: note || null },
      create: {
        studentId,
        date: day,
        status: normalized,
        note: note || null,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            class: { select: { id: true, className: true, classCode: true } },
          },
        },
      },
    });

    res.json({ attendance });
  } catch (error) {
    next(error);
  }
}

export async function deleteAttendance(req, res, next) {
  try {
    await prisma.attendance.delete({ where: { id: req.params.id } });
    res.json({ message: "Attendance deleted" });
  } catch (error) {
    next(error);
  }
}

/** Today's Done / Not taken / Day off badge per accessible class */
export async function todayWorkflow(req, res, next) {
  try {
    const today = startOfToday();
    const iso = toLocalISO(today);
    const off = isOffDay(iso);

    const classes = await prisma.class.findMany({
      where: classScopeWhere(req),
      orderBy: { className: "asc" },
      select: {
        id: true,
        className: true,
        classCode: true,
        teacher: true,
        startTime: true,
        endTime: true,
      },
    });

    const items = await Promise.all(
      classes.map(async (c) => {
        if (off) {
          return {
            class: c,
            today: { status: "DAY_OFF", notTaken: false, attendanceDate: iso },
          };
        }

        const students = await prisma.student.findMany({
          where: { classId: c.id, enrollmentStatus: { not: "WITHDRAWN" } },
          select: { id: true },
        });
        const { day, next } = dayBounds(iso);
        const saved = await prisma.attendance.count({
          where: {
            studentId: { in: students.map((s) => s.id) },
            date: { gte: day, lt: next },
          },
        });
        const submitted = saved > 0;
        return {
          class: c,
          today: {
            status: submitted ? "SUBMITTED" : "OPEN",
            notTaken: !submitted,
            attendanceDate: iso,
          },
        };
      })
    );

    res.json({ date: iso, dayOff: off, items });
  } catch (error) {
    next(error);
  }
}

/** Monthly calendar — Sat–Wed only (Thu + Fri off) */
export async function monthlySummary(req, res, next) {
  try {
    const { classId, year, month } = req.query;
    if (!classId || !year || !month) {
      return res.status(400).json({ message: "classId, year and month are required" });
    }

    const y = Number(year);
    const m = Number(month);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = startOfToday();

    const classItem = await assertClassAccess(req, classId);

    const students = await prisma.student.findMany({
      where: { classId: classId.toString(), enrollmentStatus: { not: "WITHDRAWN" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        studentId: true,
        name: true,
        picture: true,
        currentLevel: true,
        parentPhone: true,
      },
    });

    const records = await prisma.attendance.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        date: { gte: start, lt: end },
      },
    });

    const byStudent = {};
    const dayMap = {};
    for (const r of records) {
      const local = parseLocalDate(toLocalISO(r.date));
      if (OFF_WEEKDAYS.has(local.getDay())) continue;

      const iso = toLocalISO(local);
      if (!byStudent[r.studentId]) {
        byStudent[r.studentId] = { present: 0, absent: 0, late: 0, excused: 0 };
      }
      const key = r.status.toLowerCase();
      if (byStudent[r.studentId][key] !== undefined) {
        byStudent[r.studentId][key] += 1;
      }

      if (!dayMap[iso]) {
        dayMap[iso] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      }
      dayMap[iso].total += 1;
      if (dayMap[iso][key] !== undefined) dayMap[iso][key] += 1;
    }

    const sessions = [];
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateObj = new Date(y, m - 1, dayNum, 0, 0, 0, 0);
      if (OFF_WEEKDAYS.has(dateObj.getDay())) continue;

      const iso = toLocalISO(dateObj);
      const stats = dayMap[iso] || {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
      };
      const isFuture = dateObj.getTime() > today.getTime();
      const isToday = dateObj.getTime() === today.getTime();
      const submitted = stats.total > 0;

      let status = "OPEN";
      if (isFuture) status = "UPCOMING";
      else if (submitted) status = "SUBMITTED";

      sessions.push({
        id: iso,
        attendanceDate: iso,
        dayNumber: dayNum,
        weekday: dateObj.toLocaleDateString("en-GB", { weekday: "short" }),
        status,
        isToday,
        notTaken: !isFuture && !submitted,
        summary: {
          presentCount: stats.present,
          absentCount: stats.absent,
          lateCount: stats.late,
          excusedCount: stats.excused,
          studentCount: students.length,
          markedCount: stats.total,
        },
      });
    }

    const classDaysPastOrToday = sessions.filter((s) => s.status !== "UPCOMING").length;

    const studentSummary = students
      .map((s) => {
        const stats = byStudent[s.id] || {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        };
        const markedDays =
          stats.present + stats.absent + stats.late + stats.excused;
        const notTakenDays = Math.max(0, classDaysPastOrToday - markedDays);
        return {
          id: s.id,
          studentId: s.studentId,
          name: s.name,
          picture: s.picture,
          parentPhone: s.parentPhone || "",
          currentLevel: s.currentLevel,
          presentDays: stats.present,
          absentDays: stats.absent,
          lateDays: stats.late,
          excusedDays: stats.excused,
          notTakenDays,
          submittedDays: markedDays,
          markedDays,
          student: {
            id: s.id,
            fullName: s.name,
            studentCode: s.studentId,
            parentPhone: s.parentPhone || "",
          },
        };
      })
      .sort((a, b) => b.absentDays - a.absentDays || a.name.localeCompare(b.name));

    res.json({
      year: y,
      month: m,
      class: classItem,
      monthStats: {
        openCount: sessions.filter((s) => s.status === "OPEN" && s.notTaken).length,
        doneCount: sessions.filter((s) => s.status === "SUBMITTED").length,
        notTakenCount: sessions.filter((s) => s.notTaken).length,
        daysInMonth: sessions.length,
        scheduleNote: "Sat–Wed (Thu & Fri off)",
      },
      sessions,
      days: sessions,
      students: studentSummary,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}
