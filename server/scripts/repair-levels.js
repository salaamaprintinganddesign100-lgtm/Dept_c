/**
 * Align every student currentLevel to their class.currentLevel
 * and clear mismatched per-student book completes beyond class level.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.findMany({ include: { students: true } });

  for (const cls of classes) {
    const level = cls.currentLevel || 1;
    await prisma.student.updateMany({
      where: { classId: cls.id },
      data: { currentLevel: level },
    });
    console.log(
      `${cls.classCode}: Level ${level} · ${cls.students.length} students synced`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
