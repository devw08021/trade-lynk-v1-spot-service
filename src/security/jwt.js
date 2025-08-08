import { Hono } from "hono";
import { SignJWT, jwtVerify } from "jose";

const app = new Hono();

const secretKey = new TextEncoder().encode(
  "your-secret-key-make-it-longer-and-more-secure"
);

// Create JWT token
async function createToken(data) {
  return await new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secretKey);
}

async function verifyToken(ctx, next) {
  const authHeader = ctx.req.header("Authorization");

  if (!authHeader) {
    return ctx.json({ error: "Authorization header missing" }, 401);
  }

  if (!authHeader.startsWith("Bearer ")) {
    return ctx.json({ error: "Invalid authorization format" }, 401);
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!token) {
    return ctx.json({ error: "Token missing" }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    ctx.set("user", payload); // Attach user info to the context
    await next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return ctx.json({ error: "Invalid or expired token" }, 401);
  }
}

// Login route (returns JWT token)
app.post("/login", async (ctx) => {
  try {
    const body = await ctx.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return ctx.json({ error: "Username and password required" }, 400);
    }

    // Mock user authentication (replace with your own logic)
    // In production, hash passwords and check against database
    if (username === "user" && password === "password") {
      const token = await createToken({ id: 1, username: "user" });
      return ctx.json({
        message: "Login successful",
        token,
        user: { id: 1, username: "user" },
      });
    }

    return ctx.json({ error: "Invalid credentials" }, 401);
  } catch (err) {
    console.error("Login error:", err);
    return ctx.json({ error: "Invalid request body" }, 400);
  }
});

// Protected route
app.get("/profile", verifyToken, (ctx) => {
  const user = ctx.get("user");
  return ctx.json({
    message: `Welcome ${user.username}`,
    userId: user.sub,
    username: user.username,
  });
});

// Another protected route example
app.get("/dashboard", verifyToken, (ctx) => {
  const user = ctx.get("user");
  return ctx.json({
    message: "Dashboard data",
    user: {
      id: user.sub,
      username: user.username,
    },
    data: ["item1", "item2", "item3"],
  });
});

// Health check route (unprotected)
app.get("/health", (ctx) => {
  return ctx.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.onError((err, ctx) => {
  console.error("Global error:", err);
  return ctx.json({ error: "Internal server error" }, 500);
});

// 404 handler
app.notFound((ctx) => {
  return ctx.json({ error: "Route not found" }, 404);
});

console.log("Server starting on http://localhost:3000");

export default {
  port: 3000,
  fetch: app.fetch,
};
