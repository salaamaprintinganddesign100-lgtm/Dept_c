import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  await p.exam.updateMany({ where: { type: "PAPER" }, data: { maxMarks: 40 } });
  await p.exam.updateMany({ where: { type: "PRACTICAL" }, data: { maxMarks: 60 } });
  const books = await p.book.findMany({ orderBy: { order: "asc" } });
  console.log(
    "BOOKS:",
    books.map((b) => `${b.order}. ${b.title}`)
  );
  console.log("Exam maxMarks backfilled");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
