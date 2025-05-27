import { UserModel } from "@/models/schema/index";
import { getRepository } from "@/models/repositoryFactory";
import {
  hashPassword,
  comparePasswords,
  sanitizeUser,
  generateToken,
} from "../utils/auth";
import { User, UserResponse } from "@/interfaces/user";
import { ApiError } from "@/utils/error";

export class AuthService {
  private userRepository = getRepository(UserModel);

  async register(
    userData: Partial<Omit<User, "_id" | "createdAt" | "updatedAt">>
  ): Promise<{ user: UserResponse }> {
    const existingUser = await this.userRepository.findOne({
      email: userData.email,
    });

    if (existingUser) {
      throw new ApiError(400, {
        code: "USER_ALREADY_EXISTS",
        message: "User with this email already exists",
        fields: {
          email: "User with this email already exists",
        },
      });
    }

    const hashedPassword = await hashPassword(userData.password);

    const newUser: Partial<Omit<User, "_id">> = {
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.userRepository.create(newUser);
    if (!result) {
      throw new ApiError(400, {
        code: "USER_CREATION_FAILED",
        message: "User creation failed",
      });
    }

    return {
      user: sanitizeUser(result),
    };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: UserResponse; token: string }> {
    const user = await this.userRepository.findOne({ email });
    if (!user) {
      throw new ApiError(400, {
        code: "USER_NOT_FOUND",
        message: "User not found",
        fields: { email: "User with this email does not exist" },
      });
    }

    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(400, {
        code: "INVALID_PASSWORD",
        message: "Invalid password",
        fields: { password: "Password does not match our records" },
      });
    }

    const token = await generateToken(user);

    return {
      user: sanitizeUser(user),
      token,
    };
  }

  async submitKyc(userId: string, kycData: any): Promise<UserResponse> {
    const updatedUser = await this.userRepository.update(userId, {
      kycStatus: "pending",
      kycInfo: {
        ...kycData,
        submittedAt: new Date(),
      },
      updatedAt: new Date(),
    });

    if (!updatedUser) {
      throw new ApiError(404, {
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    return sanitizeUser(updatedUser);
  }


}
