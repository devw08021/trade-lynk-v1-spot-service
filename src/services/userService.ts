import { UserModel } from "@/models/schema/index";
import { getRepository } from "@/models/repositoryFactory";

import { sanitizeUser, comparePasswords, hashPassword } from "../utils/auth";
import { User, UserResponse } from "@/interfaces/user"; // Adjust path as 

//import error handling
import { ApiError } from "../utils/error";

export class UserService {
  private userRep = getRepository(UserModel);

  async getUserById(userId: string): Promise<UserResponse> {
    const user = await this.userRep.findById(userId);
    if (!user) {
      throw new ApiError(404, {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    return sanitizeUser(user);
  }

  async updateUser(
    userId: string,
    updateData: Partial<User>
  ): Promise<UserResponse> {
    const {
      _id,
      password,
      role,
      isVerified,
      isTwoFactorEnabled,
      twoFactorSecret,
      ...safeUpdateData
    } = updateData;

    const result = await this.userRep.update(userId, {
      ...safeUpdateData,
      updatedAt: new Date(),
    });

    if (!result) {
      throw new ApiError(400, {
        code: 'User_UPDATE_FAILED',
        message: 'User update failed',
      })
    }

    return sanitizeUser(result);
  }

  async updatePassword(userId: string, {
    currentPassword,
    newPassword
  }: {
    currentPassword: string;
    newPassword: string;
  }): Promise<UserResponse> {
    const user = await this.userRep.findById(userId, 'email password');

    if (!user) {
      throw new ApiError(404, {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const isPasswordValid = await comparePasswords(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new ApiError(400, {
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect',
        fields: { currentPassword: 'Does not match our records' },
      });
    }

    const hashedPassword = await hashPassword(newPassword);

    const result = await this.userRep.update(userId, {
      password: hashedPassword,
      updatedAt: new Date(),
    });

    if (!result) {
      throw new ApiError(500, {
        code: 'UPDATE_FAILED',
        message: 'Password update failed',
      });
    }

    return sanitizeUser(result);
  }

  async checkPassword(userId: string, password: string): Promise<boolean> {

    if (userId === undefined || userId === null) {
      throw new ApiError(400, {
        code: 'USER_ID_REQUIRED',
        message: 'User ID is required',
      });
    }
    const user = await this.userRep.findById(userId, 'password');
    if (!user) {
      throw new ApiError(404, {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(400, {
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect',
        fields: { currentPassword: 'Does not match our records' },
      });
    }
    return true;

  }
}