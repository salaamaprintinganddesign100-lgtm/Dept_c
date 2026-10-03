import prisma from "../prisma.js";

export async function listPermissions(_req, res, next) {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    });
    res.json({ permissions });
  } catch (error) {
    next(error);
  }
}

export async function createPermission(req, res, next) {
  try {
    const { name, description, resource, action } = req.body;

    if (!name || !resource || !action) {
      return res.status(400).json({
        message: "Name, resource and action are required",
      });
    }

    const permission = await prisma.permission.create({
      data: { name, description, resource, action },
    });

    res.status(201).json({ permission });
  } catch (error) {
    next(error);
  }
}
