// src/controllers/AuthController.ts
import { Context } from "hono";
// controllers/
import { ValidationController } from "./index";
// services
import { UserSettingsService } from "../services/index";
// units
import { ApiError } from "../utils/error";

const userSettingsService = new UserSettingsService();

export class UserSettingsController {
  async getCurrentUserSettings(c: Context) {
    try {
      const { id, email, role } = c.get("user");
      const userSettingDoc = await userSettingsService.getUserSettings(id);
      return c.json({ success: true, result: userSettingDoc }, 200);
    } catch (err) {
      throw err;
    }
  }
  async updateUserSettings(c: Context) {
    try {
      const { id, email, role } = c.get("user");

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
      const result = await userSettingsService.updateUserSettings(id, {
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


}
