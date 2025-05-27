import { UserSettingModel } from "@/models/schema/index";
import { getRepository } from "@/models/repositoryFactory";

import { User, UserSettingsInterface } from "@/interfaces/user"; // Adjust path as 

//import error handling
import { ApiError } from "../utils/error";

export class UserSettingsService {
  private userSettingRep = getRepository(UserSettingModel);

  async getUserSettings(userId: string): Promise<UserSettingsInterface> {
    const user = await this.userSettingRep.findById(userId);
    if (!user) {
      throw new ApiError(404, {
        code: 'USER_NOT_FOUND',
        message: 'USER_NOT_FOUND',
      });
    }
    return { result: user };
  }

  async updateUserSettings(
    userId: string,
    updateData: Partial<User>
  ): Promise<UserSettingsInterface> {
    const {
      _id,
      password,
      role,
      isVerified,
      isTwoFactorEnabled,
      twoFactorSecret,
      ...safeUpdateData
    } = updateData;

    const result = await this.userSettingRep.update(userId, {
      ...safeUpdateData,
      updatedAt: new Date(),
    });

    if (!result) {
      throw new ApiError(400, {
        code: 'USER_SETTINGS_UPDATE_FAILED',
        message: 'USER_SETTINGS_UPDATE_FAILED',
      })
    }

    return { result: result };
  }

}