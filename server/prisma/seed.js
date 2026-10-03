import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  { name: "dashboard:read", resource: "dashboard", action: "read", description: "View dashboard" },
  { name: "users:read", resource: "users", action: "read", description: "View users" },
  { name: "users:create", resource: "users", action: "create", description: "Create users" },
  { name: "users:update", resource: "users", action: "update", description: "Update users" },
  { name: "users:delete", resource: "users", action: "delete", description: "Delete users" },
  { name: "roles:read", resource: "roles", action: "read", description: "View roles" },
  { name: "roles:create", resource: "roles", action: "create", description: "Create roles" },
  { name: "roles:update", resource: "roles", action: "update", description: "Update roles" },
  { name: "roles:delete", resource: "roles", action: "delete", description: "Delete roles" },
  { name: "permissions:read", resource: "permissions", action: "read", description: "View permissions" },
  { name: "permissions:create", resource: "permissions", action: "create", description: "Create permissions" },
  { name: "classes:read", resource: "classes", action: "read", description: "View classes" },
  { name: "classes:create", resource: "classes", action: "create", description: "Create classes" },
  { name: "classes:update", resource: "classes", action: "update", description: "Update classes" },
  { name: "classes:delete", resource: "classes", action: "delete", description: "Delete classes" },
  { name: "students:read", resource: "students", action: "read", description: "View students" },
  { name: "students:create", resource: "students", action: "create", description: "Register students" },
  { name: "students:update", resource: "students", action: "update", description: "Update students" },
  { name: "students:delete", resource: "students", action: "delete", description: "Delete students" },
  { name: "exams:read", resource: "exams", action: "read", description: "View exams" },
  { name: "exams:update", resource: "exams", action: "update", description: "Update exam status" },
  { name: "books:read", resource: "books", action: "read", description: "View books" },
  { name: "books:update", resource: "books", action: "update", description: "Update book progress" },
  { name: "attendances:read", resource: "attendances", action: "read", description: "View attendances" },
  { name: "attendances:create", resource: "attendances", action: "create", description: "Mark attendance" },
  { name: "attendances:delete", resource: "attendances", action: "delete", description: "Delete attendance" },
];

const bookTitles = [
  "Book One Ms-windows 11",
  "Book Two Ms-word 2016",
  "Book Three Ms-Power Point 2016",
  "Book Four Ms-Excel 2016",
  "Book Five Ms-Access 2016",
  "Book Six Hardware & Final Projects",
];

async function main() {
  console.log("Seeding DEPT_C...");

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }

  const allPermissions = await prisma.permission.findMany();

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: { description: "Full system access" },
    create: { name: "ADMIN", description: "Full system access" },
  });

  const teacherRole = await prisma.role.upsert({
    where: { name: "TEACHER" },
    update: { description: "Teacher — classes, students, exams, attendance" },
    create: {
      name: "TEACHER",
      description: "Teacher — classes, students, exams, attendance",
    },
  });

  // Keep MANAGER role out of the product — only ADMIN + TEACHER
  const managerRole = await prisma.role.findUnique({ where: { name: "MANAGER" } });
  if (managerRole) {
    // Move any manager users to TEACHER
    await prisma.user.updateMany({
      where: { roleId: managerRole.id },
      data: { roleId: teacherRole.id },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: managerRole.id } });
    await prisma.role.delete({ where: { id: managerRole.id } }).catch(() => {});
  }

  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: { name: "USER", description: "Basic read-only access" },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: adminRole.id,
      permissionId: p.id,
    })),
  });

  const teacherPermNames = [
    "dashboard:read",
    "classes:read",
    "students:read",
    "students:create",
    "students:update",
    "exams:read",
    "exams:update",
    "books:read",
    "books:update",
    "attendances:read",
    "attendances:create",
  ];
  const teacherPerms = allPermissions.filter((p) =>
    teacherPermNames.includes(p.name)
  );

  for (const role of [teacherRole]) {
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: teacherPerms.map((p) => ({
        roleId: role.id,
        permissionId: p.id,
      })),
    });
  }

  const userPerms = allPermissions.filter((p) =>
    ["dashboard:read", "classes:read", "students:read", "exams:read", "books:read", "attendances:read"].includes(
      p.name
    )
  );
  await prisma.rolePermission.deleteMany({ where: { roleId: userRole.id } });
  await prisma.rolePermission.createMany({
    data: userPerms.map((p) => ({
      roleId: userRole.id,
      permissionId: p.id,
    })),
  });

  await prisma.user.upsert({
    where: { email: "admin@deptc.com" },
    update: {},
    create: {
      name: "DEPT_C Admin",
      email: "admin@deptc.com",
      password: await bcrypt.hash("admin123", 10),
      roleId: adminRole.id,
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@deptc.com" },
    update: { roleId: teacherRole.id },
    create: {
      name: "DEPT_C Teacher",
      email: "teacher@deptc.com",
      password: await bcrypt.hash("teacher123", 10),
      roleId: teacherRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@deptc.com" },
    update: { roleId: teacherRole.id, name: "DEPT_C Teacher 2" },
    create: {
      name: "DEPT_C Teacher 2",
      email: "manager@deptc.com",
      password: await bcrypt.hash("teacher123", 10),
      roleId: teacherRole.id,
    },
  });

  for (let i = 0; i < bookTitles.length; i++) {
    await prisma.book.upsert({
      where: { order: i + 1 },
      update: { title: bookTitles[i] },
      create: { order: i + 1, title: bookTitles[i] },
    });
  }

  const sampleClasses = [
    { className: "Team Group A – 2026", classCode: "TGA-2026", academicYear: "2026" },
    { className: "Team Group B – 2026", classCode: "TGB-2026", academicYear: "2026" },
    { className: "Team Group C – 2026", classCode: "TGC-2026", academicYear: "2026" },
    { className: "Team Group D – 2026", classCode: "TGD-2026", academicYear: "2026" },
  ];

  for (const item of sampleClasses) {
    await prisma.class.upsert({
      where: { classCode: item.classCode },
      update: {
        teacherId: teacherUser.id,
        teacher: teacherUser.name,
      },
      create: {
        className: item.className,
        classCode: item.classCode,
        academicYear: item.academicYear,
        teacher: teacherUser.name,
        teacherId: teacherUser.id,
        startTime: "08:00",
        endTime: "12:00",
        courseName: "Computer",
        courseDuration: "6 months",
        startDate: new Date("2026-01-15"),
        endDate: new Date("2026-07-15"),
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin:   admin@deptc.com / admin123");
  console.log("Teacher: teacher@deptc.com / teacher123");
  console.log("Sample classes assigned to Teacher.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
