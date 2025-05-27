import { Context, Next } from "hono";
import { verifyToken } from "../utils/auth";

export async function authMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        { error: "Unauthorized - Missing or invalid token format" },
        401
      );
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    c.set("user", {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      isTwoFactorEnabled: payload.isTwoFactorEnabled || false,
      isVerified: payload.isVerified || false,
    });

    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized - Invalid token" }, 401);
  }
}

export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get("user");

  if (!user || user.role !== "admin") {
    return c.json({ error: "Forbidden - Admin access required" }, 403);
  }

  await next();
}
