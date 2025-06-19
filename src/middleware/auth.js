import { verifyToken, verifyId } from "../utils/auth";
import { env } from "../config/env";

export async function authMiddleware(c, next) {
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
      userId: payload.sub,
      userCode: payload.subCode,
      firstName: payload.firstName,
      lastName: payload.lastName,
      clientId: payload.clientId,
      email: payload.email,
      role: payload.role,
      isTwoFactorEnabled: payload.isTwoFactorEnabled || false,
      isVerified: payload.isVerified || false,
      kycStatus: payload.kycStatus || false,
    });
    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized - Invalid token" }, 401);
  }
}

export async function webhookMiddleware(c, next) {
  try {
    const authHeader = c.req.header("Authorization");
    const token = authHeader.substring(7);
    const payload = await verifyId(token);

    if (payload?.id != env.WEBHOOK_ID || !authHeader.startsWith("Bearer ")) {
      return c.json(
        { error: "Unauthorized - Missing or invalid token" },
        401
      );
    }
    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized - Invalid token" }, 401);
  }
}

export async function adminMiddleware(c, next) {
  const user = c.get("user");

  if (!user || user.role !== "admin") {
    return c.json({ error: "Forbidden - Admin access required" }, 403);
  }

  await next();
}
