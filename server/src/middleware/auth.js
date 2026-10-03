import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authorize(...requiredPermissions) {
  return async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      });

      if (!user || !user.isActive) {
        return res.status(403).json({ message: "Account inactive or not found" });
      }

      const userPermissions = user.role.permissions.map(
        (rp) => rp.permission.name
      );

      const hasAll = requiredPermissions.every((p) =>
        userPermissions.includes(p)
      );

      if (!hasAll) {
        return res.status(403).json({
          message: "You do not have permission to perform this action",
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
