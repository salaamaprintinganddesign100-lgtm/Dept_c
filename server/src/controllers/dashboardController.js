import prisma from "../prisma.js";

export async function getStats(_req, res, next) {
  try {
    const [
      users,
      roles,
      permissions,
      activeUsers,
      classes,
      students,
      examsComplete,
      examsPending,
      attendancesToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.role.count(),
      prisma.permission.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.class.count(),
      prisma.student.count(),
      prisma.exam.count({ where: { status: "COMPLETE" } }),
      prisma.exam.count({ where: { status: "PENDING" } }),
      prisma.attendance.count({
        where: {
          date: {
            gte: new Date(new Date().toDateString()),
          },
        },
      }),
    ]);

    res.json({
      stats: {
        users,
        roles,
        permissions,
        activeUsers,
        classes,
        students,
        examsComplete,
        examsPending,
        attendancesToday,
      },
    });
  } catch (error) {
    next(error);
  }
}
