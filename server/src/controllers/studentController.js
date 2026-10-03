import prisma from "../prisma.js";
import { EXAM_MAX, COMPUTER_BOOKS } from "../lib/progress.js";
import { assertClassAccess, isAdminUser } from "../lib/scope.js";

async function attachStudentDefaults(studentId, tx = prisma) {
  await tx.exam.createMany({
    data: [
      {
        studentId,
        type: "PAPER",
        title: "Exam Paper",
        maxMarks: EXAM_MAX.PAPER,
        status: "PENDING",
      },
      {
        studentId,
        type: "PRACTICAL",
        title: "Exam Practical",
        maxMarks: EXAM_MAX.PRACTICAL,
        status: "PENDING",
      },
    ],
  });

  const books = await tx.book.findMany({ orderBy: { order: "asc" } });
  if (books.length) {
    await tx.bookProgress.createMany({
      data: books.map((book) => ({
        studentId,
        bookId: book.id,
        paperStatus: "PENDING",
        practicalStatus: "PENDING",
      })),
    });
  }
}

function formatStudent(student) {
  const bookProgress = (student.bookProgress || []).map((bp) => ({
    ...bp,
    paperLabel: bp.paperStatus === "COMPLETE" ? "COMPLETE" : "PENDING",
    practicalLabel: bp.practicalStatus === "COMPLETE" ? "COMPLETE" : "PENDING",
    isFullyComplete:
      bp.paperStatus === "COMPLETE" &&
      bp.practicalStatus === "COMPLETE" &&
      bp.paperScore != null &&
      bp.practicalScore != null,
    totalScore:
      bp.paperScore != null && bp.practicalScore != null
        ? Number(bp.paperScore) + Number(bp.practicalScore)
        : null,
  }));

  const level =
    student.class?.currentLevel || student.currentLevel || 1;
  const completedBooks = bookProgress.filter((b) => b.isFullyComplete).length;
  const currentBook =
    bookProgress.find((b) => b.book?.order === level) || null;
  const currentBookTitle =
    currentBook?.book?.title || COMPUTER_BOOKS[level - 1] || null;

  // Prefer current book marks; fall back to legacy Exam rows
  const exams = student.exams || [];
  const paperScore = currentBook?.paperScore ?? exams.find((e) => e.type === "PAPER")?.score ?? null;
  const practicalScore =
    currentBook?.practicalScore ??
    exams.find((e) => e.type === "PRACTICAL")?.score ??
    null;
  const totalScore =
    paperScore != null && practicalScore != null
      ? Number(paperScore) + Number(practicalScore)
      : null;

  return {
    ...student,
    currentLevel: level,
    exams: exams.map((e) => ({
      ...e,
      label: e.score != null ? "Marked" : "Not marked",
      status: e.score != null ? "COMPLETE" : "PENDING",
    })),
    bookProgress,
    examsComplete:
      (paperScore != null ? 1 : 0) + (practicalScore != null ? 1 : 0),
    examsTotal: 2,
    paperScore,
    practicalScore,
    totalScore,
    totalMax: 100,
    completedBooks,
    currentBookTitle,
    examsFullyMarked: paperScore != null && practicalScore != null,
  };
}

export async function listStudents(req, res, next) {
  try {
    const { classId, q } = req.query;
    const where = {};

    if (classId) {
      await assertClassAccess(req, classId);
      where.classId = classId.toString();
    } else if (!isAdminUser(req.user?.role)) {
      where.class = { teacherId: req.user.id };
    }

    if (q) {
      where.OR = [
        { name: { contains: q.toString(), mode: "insensitive" } },
        { studentId: { contains: q.toString(), mode: "insensitive" } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: true,
        exams: true,
        bookProgress: { include: { book: true }, orderBy: { book: { order: "asc" } } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ students: students.map(formatStudent) });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}

export async function getStudent(req, res, next) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        class: true,
        exams: { orderBy: { type: "asc" } },
        bookProgress: { include: { book: true }, orderBy: { book: { order: "asc" } } },
        attendances: { orderBy: { date: "desc" }, take: 30 },
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await assertClassAccess(req, student.classId);

    res.json({ student: formatStudent(student) });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}

export async function registerStudent(req, res, next) {
  try {
    const { studentId, name, classId, picture, enrollmentStatus, phone, parentPhone } =
      req.body;

    if (!studentId || !name || !classId) {
      return res.status(400).json({
        message: "Student ID, name and class are required",
      });
    }

    await assertClassAccess(req, classId);

    const classExists = await prisma.class.findUnique({ where: { id: classId } });
    if (!classExists) {
      return res.status(404).json({ message: "Selected class not found" });
    }

    const existing = await prisma.student.findUnique({ where: { studentId } });
    if (existing) {
      return res.status(409).json({ message: "Student ID / Serial already exists" });
    }

    const student = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          studentId,
          name,
          classId,
          picture: picture || null,
          phone: phone?.trim() || null,
          parentPhone: parentPhone?.trim() || null,
          enrollmentStatus: enrollmentStatus || "ENROLLED",
          currentLevel: classExists.currentLevel || 1,
        },
      });
      await attachStudentDefaults(created.id, tx);
      return tx.student.findUnique({
        where: { id: created.id },
        include: {
          class: true,
          exams: true,
          bookProgress: { include: { book: true }, orderBy: { book: { order: "asc" } } },
        },
      });
    });

    res.status(201).json({ student: formatStudent(student) });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Student ID / Serial already exists" });
    }
    next(error);
  }
}

export async function updateStudent(req, res, next) {
  try {
    const { name, classId, picture, enrollmentStatus, studentId, phone, parentPhone } =
      req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (classId !== undefined) data.classId = classId;
    if (picture !== undefined) data.picture = picture;
    if (enrollmentStatus !== undefined) data.enrollmentStatus = enrollmentStatus;
    if (studentId !== undefined) data.studentId = studentId;
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (parentPhone !== undefined) data.parentPhone = parentPhone?.trim() || null;

    if (classId !== undefined) {
      await assertClassAccess(req, classId);
      const dest = await prisma.class.findUnique({ where: { id: classId } });
      if (!dest) {
        return res.status(404).json({ message: "Selected class not found" });
      }
      data.currentLevel = dest.currentLevel || 1;
    }

    const student = await prisma.student.update({
      where: { id: req.params.id },
      data,
      include: {
        class: true,
        exams: true,
        bookProgress: { include: { book: true }, orderBy: { book: { order: "asc" } } },
      },
    });

    res.json({ student: formatStudent(student) });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Student ID / Serial already exists" });
    }
    next(error);
  }
}

export async function deleteStudent(req, res, next) {
  try {
    await prisma.student.delete({ where: { id: req.params.id } });
    res.json({ message: "Student deleted" });
  } catch (error) {
    next(error);
  }
}
