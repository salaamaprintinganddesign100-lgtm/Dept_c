import prisma from "../prisma.js";

export async function listRoles(_req, res, next) {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json({
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        userCount: role._count.users,
        permissions: role.permissions.map((rp) => rp.permission),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function createRole(req, res, next) {
  try {
    const { name, description, permissionIds = [] } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Role name is required" });
    }

    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        description,
        permissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    res.status(201).json({
      role: {
        ...role,
        permissions: role.permissions.map((rp) => rp.permission),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRole(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, permissionIds } = req.body;

    const data = {};
    if (name !== undefined) data.name = name.toUpperCase();
    if (description !== undefined) data.description = description;

    if (permissionIds) {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      });
    }

    const role = await prisma.role.update({
      where: { id },
      data,
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    res.json({
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        userCount: role._count.users,
        permissions: role.permissions.map((rp) => rp.permission),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteRole(req, res, next) {
  try {
    const { id } = req.params;
    const users = await prisma.user.count({ where: { roleId: id } });
    if (users > 0) {
      return res.status(400).json({
        message: "Cannot delete role assigned to users. Reassign users first.",
      });
    }
    await prisma.role.delete({ where: { id } });
    res.json({ message: "Role deleted" });
  } catch (error) {
    next(error);
  }
}
