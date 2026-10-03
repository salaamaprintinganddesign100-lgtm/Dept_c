import prisma from "../prisma.js";

export function isAdminUser(userOrRole) {
  const role =
    typeof userOrRole === "string"
      ? userOrRole
      : userOrRole?.role?.name || userOrRole?.name || userOrRole?.role;
  return role === "ADMIN";
}

/** Prisma where for classes visible to current user */
export function classScopeWhere(req, extra = {}) {
  const role = req.user?.role;
  if (isAdminUser(role)) return { ...extra };
  return { ...extra, teacherId: req.user.id };
}

/**
 * Load class and ensure TEACHER can only access assigned classes.
 * ADMIN always allowed.
 */
export async function assertClassAccess(req, classId) {
  const classItem = await prisma.class.findUnique({
    where: { id: classId.toString() },
    include: {
      assignedTeacher: { select: { id: true, name: true, email: true } },
    },
  });

  if (!classItem) {
    const err = new Error("Class not found");
    err.status = 404;
    throw err;
  }

  if (!isAdminUser(req.user?.role)) {
    if (classItem.teacherId !== req.user.id) {
      const err = new Error("You can only access classes assigned to you");
      err.status = 403;
      throw err;
    }
  }

  return classItem;
}

export async function resolveTeacherAssignment(req, teacherId) {
  if (teacherId) {
    const user = await prisma.user.findUnique({
      where: { id: teacherId },
      include: { role: true },
    });
    if (!user || !user.isActive) {
      const err = new Error("Selected teacher not found");
      err.status = 400;
      throw err;
    }
    if (!["TEACHER", "ADMIN"].includes(user.role.name)) {
      const err = new Error("Assigned user must be a Teacher or Admin");
      err.status = 400;
      throw err;
    }
    return { teacherId: user.id, teacher: user.name };
  }

  // Teachers creating a class → assign themselves
  if (!isAdminUser(req.user?.role)) {
    const self = await prisma.user.findUnique({ where: { id: req.user.id } });
    return { teacherId: req.user.id, teacher: self?.name || "Teacher" };
  }

  const err = new Error("Please assign a teacher to this class");
  err.status = 400;
  throw err;
}
