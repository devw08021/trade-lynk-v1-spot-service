// src/controllers/AuthController.ts
import { Context } from "hono";

// controllers/
import { ValidationController } from "./index";

// services
import { UserService, TwoFaService } from "../services/index";

// units
import { ApiError } from "../utils/error";

const twoFaService = new TwoFaService();
const userService = new UserService();

export class TwoFaController {
  async get2FaStatus(c: Context) {
    try {
      const { id, email, role } = c.get("user");
      const user = await twoFaService.getUserById(id, "isTwoFactorEnabled");
      return c.json({ success: true, result: user }, 200);
    } catch (err) {
      throw err;
    }
  }

  async getTwoFaCode(c: Context) {
    try {
      const { id, email, role, isTwoFactorEnabled } = c.get("user");

      if (!id) {
        return c.json({ success: false, error: "User ID is required" }, 400);
      }
      if (isTwoFactorEnabled) {
        return c.json({ success: false, error: "2FA is already enabled for this user" }, 400);
      }

      let data = {
        id,
        email,
      }
      const result = await twoFaService.getTwoFaCode(data);

      return c.json({ success: true, result }, 200);
    } catch (err) {
      throw err;
    }
  }

  async enableTwoFa(c: Context) {
    try {
      const { id, email, role } = c.get("user");
      if (!id) {
        return c.json({ success: false, error: "User ID is required" }, 400);
      }
      const data = await c.req.json();

      const validationPayload = [
        { field: "password", type: "password", value: data.password },
        { field: "code", type: "number", value: data.code ?? "" },
        // { field: "secret", type: "string", value: data.secret },
      ];
      const { errors } = ValidationController.validate(validationPayload);

      if (Object.keys(errors).length) {
        throw new ApiError(400, {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: errors,
        });
      }

      // 4. no errors → go ahead and register
      const result = await twoFaService.enableTwoFa(id, {
        code: data.code,
        secret: data.secret,
        password: data.password
      });

      return c.json({ success: true, message: "TWOFA_ENABLED_SUCCESSFULLY", result }, 200);
    } catch (err) {
      throw err
    }
  }

  // controller
  async disableTwoFa(c: Context) {
    try {
      const { id } = c.get('user');
      if (!id) {
        throw new ApiError(400, {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required',
        });
      }

      const { password, code } = await c.req.json();

      const validationPayload = [
        { field: "password", type: "password", value: password },
        { field: "code", type: "number", value: code ?? "" },
      ];

      const { errors } = ValidationController.validate(validationPayload);

      if (Object.keys(errors).length) {
        throw new ApiError(400, {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: errors,
        });
      }

      const result = await twoFaService.disableTwoFa(id, {
        code,
        password
      });

      return c.json({
        success: true,
        message: 'TWOFA_DISABLED_SUCCESSFULLY',
        result: { ...result, },
      });
    } catch (error) {
      console.error('[updatePassword]', error);
      throw error; // ⬅️ Let global handler process it
    }
  }

}
