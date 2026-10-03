import { PrismaClient } from "@prisma/client";
import { EXAM_MAX } from "../src/lib/progress.js";

const prisma = new PrismaClient();

/**
 * Class-level progress (Express-style): everyone in a class shares currentLevel.
 * completedBooks = books fully done before current class book.
 * optional currentBookMarks = marks already saved on the class's current book.
 */
const classProgress = {
  "TGA-2026": {
    currentLevel: 1,
    completedBooks: 0,
    currentBookMarks: null, // no one marked yet on Book One
  },
  "TGB-2026": {
    currentLevel: 2,
    completedBooks: 1,
    currentBookMarks: { paper: 35, practical: 52 },
  },
  "TGC-2026": {
    currentLevel: 2,
    completedBooks: 1,
    currentBookMarks: { paper: 40, practical: 55 },
  },
  "TGD-2026": {
    currentLevel: 1,
    completedBooks: 0,
    currentBookMarks: null,
  },
};

const demoStudents = [
  { studentId: "AB-c0001", name: "Ahmed Abdullahi", classCode: "TGA-2026", enrollmentStatus: "ENROLLED" },
  { studentId: "AB-c0002", name: "Amina Hassan", classCode: "TGA-2026", enrollmentStatus: "ENROLLED" },
  { studentId: "AB-c0003", name: "Omar Ali", classCode: "TGA-2026", enrollmentStatus: "ENROLLED" },
  { studentId: "BB-c0001", name: "Fatima Mohamed", classCode: "TGB-2026", enrollmentStatus: "ENROLLED" },
  { studentId: "BB-c0002", name: "Yusuf Ibrahim", classCode: "TGB-2026", enrollmentStatus: "ACTIVE" },
  { studentId: "CB-c0001", name: "Hodan Abdi", classCode: "TGC-2026", enrollmentStatus: "ENROLLED" },
  { studentId: "DB-c0001", name: "Khalid Nur", classCode: "TGD-2026", enrollmentStatus: "ENROLLED" },
  { studentId: "DB-c0002", name: "Sahra Warsame", classCode: "TGD-2026", enrollmentStatus: "ENROLLED" },
];

function dayAt(offsetDays) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

async function ensureStudentDefaults(studentId, books) {
  const examCount = await prisma.exam.count({ where: { studentId } });
  if (examCount === 0) {
    await prisma.exam.createMany({
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
  }

  for (const book of books) {
    await prisma.bookProgress.upsert({
      where: { studentId_bookId: { studentId, bookId: book.id } },
      update: {},
      create: {
        studentId,
        bookId: book.id,
        paperStatus: "PENDING",
        practicalStatus: "PENDING",
      },
    });
  }
}

async function applyClassBookProgress(studentId, completedBooks, currentBookMarks, books) {
  await prisma.bookProgress.updateMany({
    where: { studentId },
    data: {
      paperStatus: "PENDING",
      practicalStatus: "PENDING",
      paperScore: null,
      practicalScore: null,
      paperCompletedAt: null,
      practicalCompletedAt: null,
    },
  });

  for (const book of books) {
    if (book.order <= completedBooks) {
      const paper = 30 + book.order;
      const practical = 45 + book.order;
      await prisma.bookProgress.update({
        where: { studentId_bookId: { studentId, bookId: book.id } },
        data: {
          paperStatus: "COMPLETE",
          practicalStatus: "COMPLETE",
          paperScore: Math.min(40, paper),
          practicalScore: Math.min(60, practical),
          paperCompletedAt: new Date(),
          practicalCompletedAt: new Date(),
        },
      });
    }
  }

  if (currentBookMarks) {
    const level = Math.min(6, completedBooks + 1);
    const book = books.find((b) => b.order === level);
    if (book) {
      await prisma.bookProgress.update({
        where: { studentId_bookId: { studentId, bookId: book.id } },
        data: {
          paperScore: currentBookMarks.paper,
          practicalScore: currentBookMarks.practical,
          paperStatus: "COMPLETE",
          practicalStatus: "COMPLETE",
          paperCompletedAt: new Date(),
          practicalCompletedAt: new Date(),
        },
      });
    }
  }

  const progress = await prisma.bookProgress.findMany({
    where: { studentId },
    include: { book: true },
    orderBy: { book: { order: "desc" } },
  });
  const latest = progress.find(
    (bp) => bp.paperScore != null && bp.practicalScore != null
  );
  if (latest) {
    await prisma.exam.updateMany({
      where: { studentId, type: "PAPER" },
      data: {
        score: latest.paperScore,
        status: "COMPLETE",
        maxMarks: 40,
        completedAt: new Date(),
      },
    });
    await prisma.exam.updateMany({
      where: { studentId, type: "PRACTICAL" },
      data: {
        score: latest.practicalScore,
        status: "COMPLETE",
        maxMarks: 60,
        completedAt: new Date(),
      },
    });
  }
}

async function seedAttendance(studentIds) {
  const statuses = ["PRESENT", "PRESENT", "PRESENT", "ABSENT", "LATE", "EXCUSED"];
  for (const offset of [-2, -1, 0]) {
    const date = dayAt(offset);
    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i];
      const status = statuses[(i + Math.abs(offset)) % statuses.length];
      await prisma.attendance.upsert({
        where: {
          studentId_date: { studentId, date },
        },
        update: { status },
        create: { studentId, date, status },
      });
    }
  }
}

async function main() {
  console.log("Seeding DEPT_C demo data (class-level exams)...");

  const classes = await prisma.class.findMany();
  if (!classes.length) {
    throw new Error("No classes found. Run: npm run db:seed first");
  }

  const books = await prisma.book.findMany({ orderBy: { order: "asc" } });
  if (books.length < 6) {
    throw new Error("Books missing. Run: npm run db:seed first");
  }

  const classByCode = Object.fromEntries(classes.map((c) => [c.classCode, c]));

  // Set each class currentLevel first
  for (const [code, prog] of Object.entries(classProgress)) {
    const cls = classByCode[code];
    if (!cls) continue;
    await prisma.class.update({
      where: { id: cls.id },
      data: { currentLevel: prog.currentLevel },
    });
    console.log(`✓ Class ${code} → Level ${prog.currentLevel}`);
  }

  const createdIds = [];

  for (const demo of demoStudents) {
    const cls = classByCode[demo.classCode];
    if (!cls) {
      console.warn(`Skip ${demo.studentId}: class ${demo.classCode} not found`);
      continue;
    }

    const prog = classProgress[demo.classCode] || {
      currentLevel: 1,
      completedBooks: 0,
      currentBookMarks: null,
    };

    const student = await prisma.student.upsert({
      where: { studentId: demo.studentId },
      update: {
        name: demo.name,
        classId: cls.id,
        enrollmentStatus: demo.enrollmentStatus,
        currentLevel: prog.currentLevel,
      },
      create: {
        studentId: demo.studentId,
        name: demo.name,
        classId: cls.id,
        enrollmentStatus: demo.enrollmentStatus,
        currentLevel: prog.currentLevel,
      },
    });

    await ensureStudentDefaults(student.id, books);
    await applyClassBookProgress(
      student.id,
      prog.completedBooks,
      prog.currentBookMarks,
      books
    );

    createdIds.push(student.id);
    console.log(
      `✓ ${student.name} (${student.studentId}) → ${cls.classCode} · Level ${prog.currentLevel}`
    );
  }

  await seedAttendance(createdIds);
  console.log(`✓ Attendance seeded (${createdIds.length} students)`);
  console.log("\nDemo ready. Login: admin@deptc.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
