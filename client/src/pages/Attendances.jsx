import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import { PageHeader } from "../components/PageHeader";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayLabel(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

function toTelHref(phone) {
  if (!phone) return null;
  const value = String(phone).replace(/[^\d+]/g, "");
  return value ? `tel:${value}` : null;
}

function dayStatusLabel(day) {
  if (day.status === "UPCOMING") return "Upcoming";
  if (day.status === "DAY_OFF") return "Day off";
  if (day.notTaken) return "Not taken";
  if (day.status === "SUBMITTED" || day.status === "DONE") return "Done";
  return "Open";
}

function todayToken(today) {
  if (!today) return { label: "Not taken", className: "bg-rose-600 text-white" };
  if (today.status === "DAY_OFF") {
    return { label: "Day off", className: "bg-slate-600 text-white" };
  }
  const done = today.status === "SUBMITTED" && !today.notTaken;
  return done
    ? { label: "Done", className: "bg-emerald-600 text-white" }
    : { label: "Not taken", className: "bg-rose-600 text-white" };
}

export default function Attendances() {
  const { user, hasPermission } = useAuth();
  const canMark = hasPermission("attendances:create");
  const isAdmin = user?.role?.name === "ADMIN";
  const now = new Date();

  const [classes, setClasses] = useState([]);
  const [todayMap, setTodayMap] = useState({});
  const [dayOffToday, setDayOffToday] = useState(false);
  const [classId, setClassId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [date, setDate] = useState(todayISO());
  const [monthData, setMonthData] = useState(null);
  const [roster, setRoster] = useState([]);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [markOpen, setMarkOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  async function refreshTodayBadges() {
    try {
      const wf = await api.getAttendanceTodayWorkflow();
      setDayOffToday(Boolean(wf.dayOff));
      const map = {};
      for (const item of wf.items || []) {
        map[item.class.id] = item.today;
      }
      setTodayMap(map);
    } catch {
      /* ignore badge errors */
    }
  }

  useEffect(() => {
    Promise.all([api.getClasses(), api.getAttendanceTodayWorkflow()])
      .then(([classesRes, wf]) => {
        setClasses(classesRes.classes);
        if (classesRes.classes[0]) setClassId(classesRes.classes[0].id);
        setDayOffToday(Boolean(wf.dayOff));
        const map = {};
        for (const item of wf.items || []) {
          map[item.class.id] = item.today;
        }
        setTodayMap(map);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function loadMonth(cid = classId, y = year, m = month) {
    if (!cid) return;
    const data = await api.getAttendanceMonthly(cid, y, m);
    setMonthData(data);
  }

  useEffect(() => {
    if (!classId) return;
    loadMonth(classId, year, month).catch((err) => setError(err.message));
  }, [classId, year, month]);

  async function openDay(day) {
    if (!classId) return;
    if (day.status === "UPCOMING") return;

    setDate(day.attendanceDate);
    setMarkOpen(true);
    setError("");
    setBusy(true);
    try {
      const res = await api.getAttendanceClassDay(classId, day.attendanceDate);
      setRoster(res.roster || res.records || []);
      setSessionMeta(res);
      setLocked(Boolean(res.locked));
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(
    () => ({
      total: roster.length,
      present: roster.filter((r) => r.status === "PRESENT").length,
      absent: roster.filter((r) => r.status === "ABSENT").length,
      excused: roster.filter((r) => r.status === "EXCUSED").length,
    }),
    [roster]
  );

  function setStudentStatus(studentId, status) {
    if (!canMark || locked) return;
    setRoster((rows) =>
      rows.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
    setDirty(true);
  }

  async function submitDay() {
    if (!canMark || !classId || locked) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.saveAttendanceClassDay({
        classId,
        date,
        marks: roster.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          note: r.note || "",
        })),
      });
      setRoster(res.roster || res.records || []);
      setSessionMeta(res);
      setLocked(true);
      setDirty(false);
      await loadMonth();
      await refreshTodayBadges();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function reopenDay() {
    if (!isAdmin) return;
    setLocked(false);
    setDirty(true);
  }

  function selectClass(id) {
    setClassId(id);
    setMobileShowDetail(true);
    setMarkOpen(false);
  }

  const selected = classes.find((c) => c.id === classId);
  const sessions = monthData?.sessions || monthData?.days || [];
  const notTakenMeta = Boolean(sessionMeta?.notTaken) && locked;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        description="Select a class → tap a day → mark Absent or Excuse. Default is Present. Sat–Wed (Thu & Fri off)."
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="ui-input flex-1 sm:flex-none sm:w-40"
            >
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="ui-input w-24"
            />
          </div>
        }
      />

      {dayOffToday && (
        <p className="text-sm rounded-xl border border-[#E2E8F2] bg-fog px-3.5 py-2.5 text-[#06235C]/70">
          Today is Thursday/Friday off — class days are Sat–Wed. Sidebar shows <strong>Day off</strong>.
        </p>
      )}

      {error && (
        <p className="text-sm text-clay bg-clay/10 px-3 py-2 rounded-xl border border-clay/20">
          {error}
        </p>
      )}

      <div className="grid lg:grid-cols-[280px_1fr] gap-3 sm:gap-4 min-h-[60vh]">
        <aside
          className={`rounded-xl border border-[#E2E8F2] bg-white overflow-hidden ${
            mobileShowDetail ? "hidden lg:flex" : "flex"
          } flex-col max-h-[72vh]`}
        >
          <div className="px-4 py-3 border-b border-[#E2E8F2] bg-fog">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#06235C]/45">
              Classes
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {classes.map((c, index) => {
              const active = c.id === classId;
              const token = todayToken(todayMap[c.id]);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectClass(c.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-fog transition ${
                    index > 0 ? "border-t border-[#E2E8F2]" : ""
                  } ${active ? "bg-fog" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#06235C]/70">
                      {c.classCode}
                    </p>
                    <p className="text-[13px] font-semibold text-[#06235C] leading-snug">
                      {c.className}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#06235C]/45">
                      {c.teacher} · {c.startTime}–{c.endTime}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-2 text-[10px] font-bold ${token.className}`}
                  >
                    {token.label}
                  </span>
                </button>
              );
            })}
            {!classes.length && (
              <p className="px-4 py-10 text-center text-sm text-[#06235C]/45">
                No classes found.
              </p>
            )}
          </div>
        </aside>

        <section
          className={`space-y-3 ${mobileShowDetail ? "block" : "hidden lg:block"}`}
        >
          <button
            type="button"
            className="lg:hidden inline-flex items-center text-xs font-bold text-[#06235C]"
            onClick={() => setMobileShowDetail(false)}
          >
            ← Classes
          </button>

          {!classId ? (
            <div className="rounded-xl border border-dashed border-[#E2E8F2] bg-white p-10 text-center text-[#06235C]/45">
              Select a class
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-[#E2E8F2] bg-white p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#06235C]/35">
                      {MONTHS[month - 1]} {year}
                    </p>
                    <h2 className="mt-0.5 text-[15px] font-bold text-[#06235C]">
                      {selected?.className || monthData?.class?.className}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-[#06235C]/50">
                      {selected?.classCode} · {selected?.teacher}
                      {" · "}
                      <span className="font-medium text-[#06235C]/70">
                        Sat · Sun · Mon · Tue · Wed
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-[#06235C]/45">Today: {todayISO()}</p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 xl:grid-cols-5">
                  {sessions.map((day) => {
                    const upcoming = day.status === "UPCOMING";
                    const notTaken = Boolean(day.notTaken);
                    const submitted =
                      (day.status === "SUBMITTED" || day.status === "DONE") &&
                      !notTaken;

                    return (
                      <button
                        key={day.attendanceDate}
                        type="button"
                        disabled={upcoming}
                        onClick={() => openDay(day)}
                        className={`rounded-lg border px-3 py-2.5 text-left transition ${
                          upcoming
                            ? "border-[#E2E8F2] bg-white opacity-70 cursor-not-allowed"
                            : "border-[#E2E8F2] bg-fog hover:border-[#06235C]/30 hover:bg-[#D6E0F5]/40 active:scale-[0.98]"
                        }`}
                      >
                        <p className="text-xs font-bold text-[#06235C]">
                          {formatDayLabel(day.attendanceDate)}
                        </p>
                        <p
                          className={`mt-1 text-[10px] font-bold uppercase ${
                            notTaken
                              ? "text-slate-500"
                              : submitted
                                ? "text-emerald-700"
                                : upcoming
                                  ? "text-slate-400"
                                  : "text-amber-700"
                          }`}
                        >
                          {dayStatusLabel(day)}
                        </p>
                        <p className="mt-1 text-[11px] text-[#06235C]/45">
                          {upcoming
                            ? "Opens on this date"
                            : notTaken
                              ? "Attendance was not taken"
                              : `${day.summary?.absentCount ?? 0} absent${
                                  day.summary?.excusedCount
                                    ? ` · ${day.summary.excusedCount} excuse`
                                    : ""
                                }`}
                        </p>
                      </button>
                    );
                  })}
                  {!sessions.length && (
                    <p className="col-span-full py-8 text-center text-sm text-[#06235C]/45">
                      No class days in this month.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#E2E8F2] bg-white p-3 sm:p-4">
                <h3 className="text-sm font-bold text-[#06235C]">
                  Monthly absences
                </h3>
                <p className="mt-0.5 text-xs text-[#06235C]/45">
                  Submitted days missed this month.
                </p>

                {(monthData?.students || []).length ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-[#E2E8F2]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-fog text-[10px] uppercase tracking-wider text-[#06235C]/45">
                        <tr>
                          <th className="px-3 py-2 text-left font-bold">Student</th>
                          <th className="px-3 py-2 text-center font-bold">Absent</th>
                          <th className="px-3 py-2 text-center font-bold">Present</th>
                          <th className="px-3 py-2 text-center font-bold">Not taken</th>
                          <th className="px-3 py-2 text-center font-bold">Days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F2]">
                        {monthData.students.map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2.5">
                              <p className="font-semibold text-[#06235C]">{row.name}</p>
                              <p className="text-xs text-[#06235C]/55">{row.studentId}</p>
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-rose-700">
                              {row.absentDays}
                            </td>
                            <td className="px-3 py-2.5 text-center font-semibold text-emerald-700">
                              {row.presentDays}
                            </td>
                            <td className="px-3 py-2.5 text-center font-semibold text-slate-500">
                              {row.notTakenDays ?? 0}
                            </td>
                            <td className="px-3 py-2.5 text-center text-[#06235C]/60">
                              {row.submittedDays ?? row.markedDays ?? 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 py-8 text-center text-sm text-[#06235C]/45">
                    No monthly summary yet.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        from="center"
        title={formatDayLabel(date)}
        description={`${selected?.classCode || ""} · ${selected?.className || ""} · Absent or Excuse = one tap. Default Present.`}
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
            <button
              type="button"
              onClick={() => setMarkOpen(false)}
              className="ui-btn ui-btn-ghost"
            >
              Close
            </button>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              {isAdmin && locked ? (
                <button
                  type="button"
                  onClick={reopenDay}
                  disabled={busy}
                  className="ui-btn ui-btn-ghost"
                >
                  Reopen
                </button>
              ) : null}
              {canMark && !locked ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={submitDay}
                  className="ui-btn ui-btn-primary"
                >
                  {busy ? "Saving…" : dirty ? "Submit" : "Submit all present"}
                </button>
              ) : null}
            </div>
          </div>
        }
      >
        <div className="flex gap-2 text-center text-xs mb-3">
          <div className="flex-1 rounded-lg bg-fog px-2 py-2 font-semibold text-[#06235C]">
            {counts.total} students
          </div>
          <div className="flex-1 rounded-lg bg-emerald-100 px-2 py-2 font-semibold text-emerald-800">
            {notTakenMeta ? `${counts.present} not taken` : `${counts.present} present`}
          </div>
          <div className="flex-1 rounded-lg bg-rose-100 px-2 py-2 font-semibold text-rose-800">
            {counts.absent} absent
          </div>
          <div className="flex-1 rounded-lg bg-sky-100 px-2 py-2 font-semibold text-sky-800">
            {counts.excused} excuse
          </div>
        </div>

        <p className="text-[11px] text-[#06235C]/50 mb-3">
          {notTakenMeta
            ? "This day was not taken. Unmarked students show Not taken."
            : locked
              ? "Tap an absent student to call the parent."
              : "Absent or Excuse = one tap each. Then Submit."}
        </p>

        <div className="divide-y divide-[#E2E8F2] rounded-lg border border-[#E2E8F2] overflow-hidden">
          {roster.map((row) => {
            const parentHref = toTelHref(row.parentPhone);
            const callAbsent = locked && row.status === "ABSENT";
            const rowBg =
              row.status === "ABSENT"
                ? "bg-rose-50"
                : row.status === "EXCUSED"
                  ? "bg-sky-50"
                  : locked && notTakenMeta
                    ? "bg-fog"
                    : "bg-white";

            if (callAbsent && parentHref) {
              return (
                <a
                  key={row.studentId}
                  href={parentHref}
                  className={`flex items-center gap-3 px-3 py-3 ${rowBg}`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-rose-600 text-white text-xs font-bold">
                    ✕
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-[13px] text-[#06235C]">{row.name}</strong>
                    <span className="text-[11px] text-[#06235C]/55">{row.serial}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-[#06235C]/45">
                      {row.parentPhone || "No parent phone"}
                    </span>
                  </span>
                  <span className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold uppercase text-white">
                    Call
                  </span>
                </a>
              );
            }

            return (
              <div
                key={row.studentId}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-3 ${rowBg}`}
              >
                <div className="min-w-0 flex items-start gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                      row.status === "ABSENT"
                        ? "bg-rose-600 text-white"
                        : row.status === "EXCUSED"
                          ? "bg-sky-600 text-white"
                          : "bg-fog text-[#06235C]/40"
                    }`}
                  >
                    {row.status === "PRESENT" ? "✓" : row.status === "EXCUSED" ? "E" : "✕"}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#06235C]">{row.name}</p>
                    <p className="text-[11px] text-[#06235C]/55">{row.serial}</p>
                  </div>
                </div>

                {locked ? (
                  <span
                    className={`text-[11px] font-bold uppercase ${
                      row.status === "ABSENT"
                        ? "text-rose-700"
                        : row.status === "EXCUSED"
                          ? "text-sky-700"
                          : notTakenMeta
                            ? "text-slate-500"
                            : "text-emerald-700"
                    }`}
                  >
                    {notTakenMeta && row.status === "PRESENT"
                      ? "Not taken"
                      : row.status === "ABSENT"
                        ? "Absent"
                        : row.status === "EXCUSED"
                          ? "Excuse"
                          : "Present"}
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={!canMark}
                      onClick={() => setStudentStatus(row.studentId, "ABSENT")}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border font-bold ${
                        row.status === "ABSENT"
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : "border-rose-200 text-rose-700 bg-white"
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      disabled={!canMark}
                      onClick={() => setStudentStatus(row.studentId, "EXCUSED")}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border font-bold ${
                        row.status === "EXCUSED"
                          ? "bg-sky-100 text-sky-800 border-sky-300"
                          : "border-sky-200 text-sky-700 bg-white"
                      }`}
                    >
                      Excuse
                    </button>
                    {row.status !== "PRESENT" && canMark ? (
                      <button
                        type="button"
                        onClick={() => setStudentStatus(row.studentId, "PRESENT")}
                        className="text-[11px] px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 font-bold bg-white"
                      >
                        Present
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
          {!roster.length && !busy && (
            <p className="py-8 text-center text-xs text-[#06235C]/45">
              No students in this class.
            </p>
          )}
          {busy && !roster.length && (
            <p className="py-8 text-center text-xs text-[#06235C]/45">Loading…</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
