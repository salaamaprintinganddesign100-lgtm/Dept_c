import prisma from "../prisma.js";
import {
  classScopeWhere,
  assertClassAccess,
  resolveTeacherAssignment,
  isAdminUser,
} from "../lib/scope.js";

export async function listClasses(req, res, next) {
  try {
    const q = (req.query.q || "").toString().trim();
    const scope = classScopeWhere(req);
    const where = q
      ? {
          AND: [
            scope,
            {
              OR: [
                { className: { contains: q, mode: "insensitive" } },
                { classCode: { contains: q, mode: "insensitive" } },
                { courseName: { contains: q, mode: "insensitive" } },
                { teacher: { contains: q, mode: "insensitive" } },
                { academicYear: { contains: q, mode: "insensitive" } },
              ],
            },
          ],
        }
      : scope;

    const classes = await prisma.class.findMany({
      where,
      include: {
        _count: { select: { students: true } },
        assignedTeacher: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      classes: classes.map((c) => ({
        ...c,
        studentCount: c._count.students,
        _count: undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getClass(req, res, next) {
  try {
    await assertClassAccess(req, req.params.id);

    const classItem = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTeacher: { select: { id: true, name: true, email: true } },
        students: {
          orderBy: { name: "asc" },
          include: {
            exams: true,
            bookProgress: { include: { book: true } },
          },
        },
      },
    });

    res.json({ class: classItem });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}

export async function createClass(req, res, next) {
  try {
    const {
      className,
      classCode,
      academicYear,
      teacherId,
      startTime,
      endTime,
      courseName,
      courseDuration,
      startDate,
      endDate,
    } = req.body;

    if (
      !className ||
      !classCode ||
      !academicYear ||
      !startTime ||
      !endTime ||
      !courseName ||
      !courseDuration ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({ message: "All class fields are required" });
    }

    // Only ADMIN creates classes and assigns teachers (Express-style)
    if (!isAdminUser(req.user?.role)) {
      return res.status(403).json({
        message: "Only Admin can create classes and assign teachers",
      });
    }

    const assignment = await resolveTeacherAssignment(req, teacherId);

    const existing = await prisma.class.findUnique({ where: { classCode } });
    if (existing) {
      return res.status(409).json({ message: "Class code must be unique" });
    }

    const classItem = await prisma.class.create({
      data: {
        className,
        classCode: classCode.toUpperCase(),
        academicYear,
        teacher: assignment.teacher,
        teacherId: assignment.teacherId,
        startTime,
        endTime,
        courseName,
        courseDuration,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        assignedTeacher: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ class: classItem });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Class code must be unique" });
    }
    next(error);
  }
}

export async function updateClass(req, res, next) {
  try {
    if (!isAdminUser(req.user?.role)) {
      return res.status(403).json({
        message: "Only Admin can edit classes / reassign teachers",
      });
    }

    const data = { ...req.body };
    if (data.classCode) data.classCode = data.classCode.toUpperCase();
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.currentLevel !== undefined) {
      const level = Number(data.currentLevel);
      if (Number.isNaN(level) || level < 1 || level > 6) {
        return res.status(400).json({ message: "currentLevel must be 1–6" });
      }
      data.currentLevel = level;
    }

    if (data.teacherId) {
      const assignment = await resolveTeacherAssignment(req, data.teacherId);
      data.teacherId = assignment.teacherId;
      data.teacher = assignment.teacher;
    }

    // Don't allow wiping teacher via empty string
    delete data.assignedTeacher;

    const classItem = await prisma.$transaction(async (tx) => {
      const updated = await tx.class.update({
        where: { id: req.params.id },
        data,
        include: {
          assignedTeacher: { select: { id: true, name: true, email: true } },
        },
      });
      if (data.currentLevel !== undefined) {
        await tx.student.updateMany({
          where: { classId: updated.id },
          data: { currentLevel: data.currentLevel },
        });
      }
      return updated;
    });

    res.json({ class: classItem });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Class code must be unique" });
    }
    next(error);
  }
}

export async function deleteClass(req, res, next) {
  try {
    if (!isAdminUser(req.user?.role)) {
      return res.status(403).json({ message: "Only Admin can delete classes" });
    }
    const count = await prisma.student.count({ where: { classId: req.params.id } });
    if (count > 0) {
      return res.status(400).json({
        message: "Cannot delete class with registered students",
      });
    }
    await prisma.class.delete({ where: { id: req.params.id } });
    res.json({ message: "Class deleted" });
  } catch (error) {
    next(error);
  }
}
