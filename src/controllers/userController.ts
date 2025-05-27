// src/controllers/AuthController.ts
import { Context } from "hono";
// controllers/
import { ValidationController } from "./index";
// services
import { UserService } from "../services/index";
// units
import { ApiError } from "../utils/error";

const userService = new UserService();

export class UserController {
  async getCurrentUser(c: Context) {
    try {
      const { id, email, role } = c.get("user");
      const user = await userService.getUserById(id);
      return c.json({ success: true, result: user }, 200);
    } catch (err) {
      throw err;
    }
  }
  async updateProfile(c: Context) {
    try {
      const { id, email, role } = c.get("user");
      if (!id) {
        return c.json({ success: false, error: "User ID is required" }, 400);
      }
      const data = await c.req.json();

      const validationPayload = [
        { field: "username", type: "string", value: data.username },
        { field: "firstName", type: "string", value: data.firstName ?? "" },
        { field: "bio", type: "string", value: data.bio ?? "" },
      ];
      const { errors } = ValidationController.validate(validationPayload);
      if (Object.keys(errors).length > 0) {
        return c.json({ success: false, errors }, 400);
      }

      // 4. no errors → go ahead and register
      const result = await userService.updateUser(id, {
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio,
      });

      return c.json({ success: true, ...result }, 201);
    } catch (err) {
      throw err
    }
  }

  // controller
  async updatePassword(c: Context) {
    try {
      const { id } = c.get('user');
      if (!id) {
        throw new ApiError(400, {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required',
        });
      }

      const { newPassword, confirmPassword, currentPassword } = await c.req.json();

      const { errors } = ValidationController.validate([
        { field: 'newPassword', value: newPassword, type: 'password' },
        { field: 'confirmPassword', value: confirmPassword, type: 'password' },
        { field: 'currentPassword', value: currentPassword, type: 'password' },
      ]);

      if (Object.keys(errors).length > 0) {
        throw new ApiError(400, {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: errors,
        });
      }

      if (newPassword !== confirmPassword) {
        throw new ApiError(400, {
          code: 'PASSWORD_MISMATCH',
          message: 'Passwords do not match',
          fields: { confirmPassword: 'Does not match new password' },
        });
      }

      const result = await userService.updatePassword(id, {
        newPassword,
        currentPassword,
      });

      return c.json({
        success: true,
        result: { ...result, message: 'PASSWORD_UPDATE_SUCCESS' },
      });
    } catch (error) {
      console.error('[updatePassword]', error);
      throw error; // ⬅️ Let global handler process it
    }
  }

}
