const validateJsonBody = async (c, next) => {
    const method = c.req.method;
    const contentType = c.req.header("Content-Type") || "";
    if (["POST", "PUT", "PATCH"].includes(method) && contentType.includes("application/json")) {
        try {
            await c.req.json();
        } catch {
            return c.json({ error: 'Invalid JSON' }, 400);
        }
    }
    return await next();
};

export default validateJsonBody;
