import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const r = await p.exam.updateMany({
  where: { score: null, status: "COMPLETE" },
  data: { status: "PENDING" },
});
console.log("Reset COMPLETE without score:", r.count);
await p.$disconnect();
