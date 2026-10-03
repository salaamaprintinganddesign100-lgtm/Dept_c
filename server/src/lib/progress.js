export const EXAM_MAX = {
  PAPER: 40,
  PRACTICAL: 60,
};

export const COMPUTER_BOOKS = [
  "Book One Ms-windows 11",
  "Book Two Ms-word 2016",
  "Book Three Ms-Power Point 2016",
  "Book Four Ms-Excel 2016",
  "Book Five Ms-Access 2016",
  "Book Six Hardware & Final Projects",
];

function isBookComplete(bp) {
  return (
    bp.paperStatus === "COMPLETE" &&
    bp.practicalStatus === "COMPLETE" &&
    bp.paperScore != null &&
    bp.practicalScore != null
  );
}

/** Keep every student in the class on the same level as the class. */
export async function syncClassStudentsToLevel(tx, classId, level) {
  await tx.student.updateMany({
    where: { classId },
    data: { currentLevel: level },
  });
}

/**
 * Save Paper/Practical marks for a student on the CLASS current book.
 * Does NOT advance level alone (Express-style: class advances together).
 */
export async function saveCurrentBookExam(tx, studentId, { paperScore, practicalScore }) {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });

  const level = student.class?.currentLevel || 1;

  const bp = await tx.bookProgress.findFirst({
    where: { studentId, book: { order: level } },
    include: { book: true },
  });

  if (!bp) {
    throw Object.assign(
      new Error(`No book progress for class level ${level}.`),
      { status: 400 }
    );
  }

  const data = {};

  if (paperScore !== undefined && paperScore !== null && paperScore !== "") {
    const num = Number(paperScore);
    if (Number.isNaN(num) || num < 0 || num > EXAM_MAX.PAPER) {
      throw Object.assign(new Error(`Paper marks must be 0–${EXAM_MAX.PAPER}`), {
        status: 400,
      });
    }
    data.paperScore = num;
    data.paperStatus = "COMPLETE";
    data.paperCompletedAt = new Date();
  }

  if (practicalScore !== undefined && practicalScore !== null && practicalScore !== "") {
    const num = Number(practicalScore);
    if (Number.isNaN(num) || num < 0 || num > EXAM_MAX.PRACTICAL) {
      throw Object.assign(
        new Error(`Practical marks must be 0–${EXAM_MAX.PRACTICAL}`),
        { status: 400 }
      );
    }
    data.practicalScore = num;
    data.practicalStatus = "COMPLETE";
    data.practicalCompletedAt = new Date();
  }

  const updated = await tx.bookProgress.update({
    where: { id: bp.id },
    data,
    include: { book: true },
  });

  // Keep student mirror level = class level
  await tx.student.update({
    where: { id: studentId },
    data: { currentLevel: level },
  });

  if (data.paperScore != null) {
    await tx.exam.updateMany({
      where: { studentId, type: "PAPER" },
      data: {
        score: data.paperScore,
        maxMarks: EXAM_MAX.PAPER,
        status: "COMPLETE",
        completedAt: new Date(),
      },
    });
  }
  if (data.practicalScore != null) {
    await tx.exam.updateMany({
      where: { studentId, type: "PRACTICAL" },
      data: {
        score: data.practicalScore,
        maxMarks: EXAM_MAX.PRACTICAL,
        status: "COMPLETE",
        completedAt: new Date(),
      },
    });
  }

  return {
    bookProgress: updated,
    level: {
      advanced: false,
      currentLevel: level,
      currentBookTitle: updated.book?.title || COMPUTER_BOOKS[level - 1] || null,
      classId: student.classId,
    },
    totalScore:
      updated.paperScore != null && updated.practicalScore != null
        ? Number(updated.paperScore) + Number(updated.practicalScore)
        : null,
  };
}

/**
 * Express idea: advance whole class when current level exams are done.
 * Eligible when every student has Paper+Practical COMPLETE on class.currentLevel book.
 */
export async function getClassExamProgress(tx, classId) {
  const classItem = await tx.class.findUnique({ where: { id: classId } });
  if (!classItem) return null;

  const level = classItem.currentLevel || 1;
  const students = await tx.student.findMany({
    where: { classId, enrollmentStatus: { not: "WITHDRAWN" } },
    include: {
      bookProgress: {
        where: { book: { order: level } },
        include: { book: true },
      },
    },
  });

  const rows = students.map((s) => {
    const bp = s.bookProgress[0] || null;
    const marked = Boolean(bp && isBookComplete(bp));
    return {
      studentId: s.id,
      name: s.name,
      marked,
      paperScore: bp?.paperScore ?? null,
      practicalScore: bp?.practicalScore ?? null,
    };
  });

  const markedCount = rows.filter((r) => r.marked).length;
  const eligibleForProgress =
    students.length > 0 && markedCount === students.length && level < 6;

  return {
    classId,
    currentLevel: level,
    currentBookTitle: COMPUTER_BOOKS[level - 1] || null,
    nextLevel: level < 6 ? level + 1 : null,
    nextBookTitle: level < 6 ? COMPUTER_BOOKS[level] : null,
    studentCount: students.length,
    markedCount,
    eligibleForProgress,
    courseFinished: level >= 6 && markedCount === students.length,
  };
}

export async function advanceClassLevel(tx, classId) {
  const progress = await getClassExamProgress(tx, classId);
  if (!progress) {
    throw Object.assign(new Error("Class not found"), { status: 404 });
  }
  if (!progress.eligibleForProgress) {
    throw Object.assign(
      new Error(
        `Cannot advance: ${progress.markedCount}/${progress.studentCount} students marked on ${progress.currentBookTitle}. All must complete Paper+Practical first.`
      ),
      { status: 400 }
    );
  }

  const next = progress.currentLevel + 1;
  await tx.class.update({
    where: { id: classId },
    data: { currentLevel: next },
  });
  await syncClassStudentsToLevel(tx, classId, next);

  return {
    advanced: true,
    previousLevel: progress.currentLevel,
    previousBookTitle: progress.currentBookTitle,
    currentLevel: next,
    currentBookTitle: COMPUTER_BOOKS[next - 1] || null,
  };
}

/** Used by Books page toggles — still sync student to class level only */
export async function syncStudentLevel(tx, studentId) {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!student) return null;
  const level = student.class?.currentLevel || 1;
  await tx.student.update({
    where: { id: studentId },
    data: { currentLevel: level },
  });
  return {
    currentLevel: level,
    completedBooks: level - 1,
    currentBookTitle: COMPUTER_BOOKS[level - 1] || null,
  };
}
