import prisma from "../prisma.js";
import {
  EXAM_MAX,
  COMPUTER_BOOKS,
  getClassExamProgress,
  advanceClassLevel,
} from "../lib/progress.js";
import { assertClassAccess } from "../lib/scope.js";

/**
 * Exam board uses CLASS.currentLevel for every student (Express-style).
 */
export async function classBoard(req, res, next) {
  try {
    const { classId } = req.query;
    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    const classItem = await assertClassAccess(req, classId);

    const level = classItem.currentLevel || 1;

    // Keep students aligned
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
      const current =
        s.bookProgress.find((bp) => bp.book.order === level) || null;
      const paperScore = current?.paperScore ?? null;
      const practicalScore = current?.practicalScore ?? null;
      const total =
        paperScore != null && practicalScore != null
          ? Number(paperScore) + Number(practicalScore)
          : null;
      const bothDone =
        current?.paperStatus === "COMPLETE" &&
        current?.practicalStatus === "COMPLETE";

      return {
        id: s.id,
        studentId: s.studentId,
        name: s.name,
        picture: s.picture,
        currentLevel: level,
        currentBookTitle: COMPUTER_BOOKS[level - 1] || null,
        bookProgressId: current?.id || null,
        paperScore,
        practicalScore,
        paperStatus: current?.paperStatus || "PENDING",
        practicalStatus: current?.practicalStatus || "PENDING",
        totalScore: total,
        totalMax: 100,
        maxPaper: EXAM_MAX.PAPER,
        maxPractical: EXAM_MAX.PRACTICAL,
        allComplete: bothDone,
      };
    });

    const progress = await prisma.$transaction((tx) =>
      getClassExamProgress(tx, classItem.id)
    );

    const marked = board.filter(
      (b) => b.paperScore != null && b.practicalScore != null
    );

    res.json({
      class: {
        ...classItem,
        currentLevel: level,
        currentBookTitle: COMPUTER_BOOKS[level - 1] || null,
      },
      board,
      progress,
      summary: {
        students: board.length,
        fullyMarked: marked.length,
        averageTotal:
          marked.length > 0
            ? Math.round(
                (marked.reduce((n, b) => n + b.totalScore, 0) / marked.length) *
                  10
              ) / 10
            : null,
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}

export async function listExams(req, res, next) {
  try {
    const { classId } = req.query;
    if (classId) {
      req.query = { classId };
      return classBoard(req, res, next);
    }
    res.json({ exams: [] });
  } catch (error) {
    next(error);
  }
}

export async function updateExam(_req, res) {
  res.status(400).json({
    message: "Use POST /api/books/exam-marks for current class book marks.",
  });
}

export async function advanceClass(req, res, next) {
  try {
    const { classId } = req.body;
    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    await assertClassAccess(req, classId);

    const result = await prisma.$transaction((tx) =>
      advanceClassLevel(tx, classId)
    );

    res.json({ level: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}
