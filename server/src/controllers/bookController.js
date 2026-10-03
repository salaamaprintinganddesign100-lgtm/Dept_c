import prisma from "../prisma.js";
import {
  EXAM_MAX,
  COMPUTER_BOOKS,
  syncStudentLevel,
  saveCurrentBookExam,
} from "../lib/progress.js";
import { assertClassAccess } from "../lib/scope.js";

function mapBook(bp) {
  return {
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
  };
}

export async function listBooks(_req, res, next) {
  try {
    const books = await prisma.book.findMany({ orderBy: { order: "asc" } });
    res.json({ books });
  } catch (error) {
    next(error);
  }
}

export async function listBookProgress(req, res, next) {
  try {
    const { studentId, classId } = req.query;
    const where = {};
    if (studentId) where.studentId = studentId.toString();
    if (classId) where.student = { classId: classId.toString() };

    const progress = await prisma.bookProgress.findMany({
      where,
      include: {
        book: true,
        student: {
          select: {
            id: true,
            studentId: true,
            name: true,
            currentLevel: true,
            class: { select: { id: true, className: true, classCode: true } },
          },
        },
      },
      orderBy: [{ student: { name: "asc" } }, { book: { order: "asc" } }],
    });

    res.json({ progress: progress.map(mapBook) });
  } catch (error) {
    next(error);
  }
}

export async function classBoard(req, res, next) {
  try {
    const { classId } = req.query;
    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    const classItem = await assertClassAccess(req, classId);
    const level = classItem.currentLevel || 1;
    await prisma.student.updateMany({
      where: { classId: classItem.id },
      data: { currentLevel: level },
    });

    const students = await prisma.student.findMany({
      where: { classId: classItem.id },
      include: {
        bookProgress: {
          include: { book: true },
          orderBy: { book: { order: "asc" } },
        },
      },
      orderBy: { name: "asc" },
    });

    const board = students.map((s) => {
      const books = s.bookProgress.map(mapBook);
      const partsDone = books.reduce(
        (n, b) =>
          n +
          (b.paperStatus === "COMPLETE" ? 1 : 0) +
          (b.practicalStatus === "COMPLETE" ? 1 : 0),
        0
      );
      const completedBooks = books.filter((b) => b.isFullyComplete).length;
      const currentBook =
        books.find((b) => b.book?.order === level) || null;

      return {
        id: s.id,
        studentId: s.studentId,
        name: s.name,
        picture: s.picture,
        currentLevel: level,
        currentBookTitle: COMPUTER_BOOKS[level - 1] || null,
        currentBook,
        completedBooks,
        books,
        partsDone,
        partsTotal: books.length * 2 || 12,
        allComplete: books.length > 0 && books.every((b) => b.isFullyComplete),
      };
    });

    res.json({
      class: {
        ...classItem,
        currentLevel: level,
        currentBookTitle: COMPUTER_BOOKS[level - 1] || null,
      },
      board,
      summary: {
        students: board.length,
        fullyComplete: board.filter((b) => b.allComplete).length,
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}

/** Exams page: save marks for student's CURRENT book → COMPLETE → next level */
export async function saveStudentBookExam(req, res, next) {
  try {
    const { studentId, paperScore, practicalScore } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const studentCheck = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });
    if (!studentCheck) {
      return res.status(404).json({ message: "Student not found" });
    }
    await assertClassAccess(req, studentCheck.classId);

    const result = await prisma.$transaction(async (tx) =>
      saveCurrentBookExam(tx, studentId, { paperScore, practicalScore })
    );

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        bookProgress: {
          include: { book: true },
          orderBy: { book: { order: "asc" } },
        },
      },
    });

    res.json({
      ...result,
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        currentLevel: student.currentLevel,
        currentBookTitle:
          COMPUTER_BOOKS[student.currentLevel - 1] || null,
        books: student.bookProgress.map(mapBook),
      },
      max: EXAM_MAX,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}

export async function updateBookProgress(req, res, next) {
  try {
    const { paperStatus, practicalStatus, paperScore, practicalScore } = req.body;
    const data = {};

    if (paperStatus) {
      const normalized = paperStatus.toUpperCase();
      if (!["PENDING", "COMPLETE"].includes(normalized)) {
        return res.status(400).json({ message: "Invalid paper status" });
      }
      data.paperStatus = normalized;
      data.paperCompletedAt = normalized === "COMPLETE" ? new Date() : null;
      if (normalized === "PENDING") data.paperScore = null;
    }

    if (practicalStatus) {
      const normalized = practicalStatus.toUpperCase();
      if (!["PENDING", "COMPLETE"].includes(normalized)) {
        return res.status(400).json({ message: "Invalid practical status" });
      }
      data.practicalStatus = normalized;
      data.practicalCompletedAt = normalized === "COMPLETE" ? new Date() : null;
      if (normalized === "PENDING") data.practicalScore = null;
    }

    if (paperScore !== undefined && paperScore !== null && paperScore !== "") {
      const num = Number(paperScore);
      if (Number.isNaN(num) || num < 0 || num > EXAM_MAX.PAPER) {
        return res.status(400).json({ message: `Paper 0–${EXAM_MAX.PAPER}` });
      }
      data.paperScore = num;
      data.paperStatus = "COMPLETE";
      data.paperCompletedAt = new Date();
    }

    if (
      practicalScore !== undefined &&
      practicalScore !== null &&
      practicalScore !== ""
    ) {
      const num = Number(practicalScore);
      if (Number.isNaN(num) || num < 0 || num > EXAM_MAX.PRACTICAL) {
        return res
          .status(400)
          .json({ message: `Practical 0–${EXAM_MAX.PRACTICAL}` });
      }
      data.practicalScore = num;
      data.practicalStatus = "COMPLETE";
      data.practicalCompletedAt = new Date();
    }

    const result = await prisma.$transaction(async (tx) => {
      const progress = await tx.bookProgress.update({
        where: { id: req.params.id },
        data,
        include: {
          book: true,
          student: {
            select: { id: true, studentId: true, name: true, currentLevel: true },
          },
        },
      });

      const levelInfo = await syncStudentLevel(tx, progress.studentId);
      const student = await tx.student.findUnique({
        where: { id: progress.studentId },
        select: { id: true, studentId: true, name: true, currentLevel: true },
      });

      return { progress, levelInfo, student };
    });

    res.json({
      progress: {
        ...mapBook(result.progress),
        student: result.student,
      },
      level: result.levelInfo,
    });
  } catch (error) {
    next(error);
  }
}
