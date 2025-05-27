// src/controllers/AuthController.ts
import { Context } from "hono";

//controllers/
import { ValidationController } from "./index";

//services
import { AuthService } from "../services/index";

//units
import { ApiError } from "../utils/error";
const authService = new AuthService();

export class AuthController {
  async register(c: Context) {
    try {
      const data = await c.req.json();

      // 1. map your incoming body to ValidationInput[]
      const validationPayload = [
        { field: "email", type: "email", value: data.email },
        { field: "password", type: "password", value: data.password },
        { field: "confirmPassword", type: "password", value: data.confirmPassword },
        { field: "username", type: "string", value: data.username },
        // optional fields:
        // { field: "firstName", type: "string", value: data.firstName ?? "" },
        // { field: "lastName", type: "string", value: data.lastName ?? "" },
      ];

      // 2. run your controller
      const { errors } = ValidationController.validate(validationPayload);

      // 3. if any, return early
      if (Object.keys(errors).length > 0) {
        throw new ApiError(400, {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: errors,
        });
      }

      // 4. no errors → go ahead and register
      const result = await authService.register({
        email: data.email,
        password: data.password,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      return c.json({ success: true, ...result }, 201);
    } catch (err) {
      throw err;
    }
  }

  async login(c: Context) {
    try {
      const data = await c.req.json();

      const validationPayload = [
        { field: "email", type: "email", value: data.email },
        { field: "password", type: "password", value: data.password },
      ];
      const { errors } = ValidationController.validate(validationPayload);

      if (Object.keys(errors).length) {
        throw new ApiError(400, {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: errors,
        });
      }

      const result = await authService.login(data.email, data.password);
      return c.json({ success: true, result: { ...result }, message: "LOGIN_SUCCESS" }, 200);
    } catch (err) {
      throw err;
    }
  }
  async submitKyc(c: Context) {
    try {
      const user = c.get("user");
      const form = await c.req.formData();

      const documentType = form.get("documentType")?.toString() ?? "";
      const documentNumber = form.get("documentNumber")?.toString() ?? "";
      const country = form.get("country")?.toString() ?? "";

      // validate these three fields
      const validationPayload = [
        { field: "documentType", type: "string", value: documentType },
        { field: "documentNumber", type: "string", value: documentNumber },
        { field: "country", type: "string", value: country },
      ];

      const { errors } = ValidationController.validate(validationPayload);
      if (Object.keys(errors).length) {
        throw new ApiError(400, {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: errors,
        });
      }

      const result = await authService.submitKyc(user.id, {
        documentType,
        documentNumber,
        country,
      });

      return c.json({
        success: true,
        status: result.kycStatus,
        message: "KYC submission received and is under review",
      }, 200);
    } catch (err) {
      throw err;
    }
  }
}
