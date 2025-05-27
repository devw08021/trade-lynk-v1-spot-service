import { UserModel } from "@/models/schema/index";
import { getRepository } from "@/models/repositoryFactory";

import { sanitizeUser, comparePasswords, hashPassword } from "../utils/auth";
import { User, UserResponse } from "@/interfaces/user";

import { TOTP, Secret } from 'otpauth';
import { ApiError } from "../utils/error";

export class TwoFaService {
  private userRep = getRepository(UserModel);

  async getQRCodeURL(data: string): Promise<string> {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
  }

  /**
   * Generates a new 2FA secret, stores it, and returns the otpauth URI and Base32 secret
   */
  async getTwoFaCode(data: { id: string; email: string; }): Promise<{ qrCodeUrl: string; secret: string }> {
    const { id, email } = data;

    // Generate a fresh secret of 20 bytes and get Base32
    const secretObj = new Secret({ size: 20 });
    const dbSecret = secretObj.base32;

    // Build the TOTP URI
    const totp = new TOTP({
      issuer: 'HonoApp',
      label: email,
      digits: 6,
      period: 30,
      secret: secretObj,
    });
    const otpauthUrl = totp.toString();

    return { qrCodeUrl: otpauthUrl, secret: dbSecret };
  }

  /**
   * Verifies a TOTP code and enables 2FA for the user
   */
  async enableTwoFa(userId: string, data: { code: string, secret: string, password: string }): Promise<UserResponse> {
    const { code, secret, password } = data;
    // Fetch user with necessary fields
    const userDoc = await this.userRep.findById(userId, 'twoFactorSecret password email isTwoFactorEnabled');
    if (!userDoc) {
      throw new ApiError(404, { code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    if (userDoc.isTwoFactorEnabled) {
      throw new ApiError(400, { code: 'TWO_FA_ALREADY_ENABLED', message: '2FA is already enabled for this user' });
    }

    // Verify current password
    const isPasswordValid = await comparePasswords(password, userDoc.password);
    if (!isPasswordValid) {
      throw new ApiError(400, { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect', fields: { password: 'Does not match our records' } });
    }

    // Recreate Secret and TOTP
    const secretObj = Secret.fromBase32(secret);
    const totp = new TOTP({
      issuer: 'HonoApp',
      label: userDoc.email,
      digits: 6,
      period: 30,
      secret: secretObj,
    });

    // Validate the provided code
    const isValid = totp.validate({ token: code, window: 1 });

    if (isValid == -1 || isValid === null) {
      throw new ApiError(400, { code: 'INVALID_2FA_CODE', message: 'Invalid 2FA code', fields: { code: 'The provided 2FA code is invalid' } });
    }

    // Enable 2FA
    const updated = await this.userRep.update(userId, { isTwoFactorEnabled: true, twoFactorSecret: secretObj.base32 });
    if (!updated) {
      throw new ApiError(500, { code: 'TWO_FA_ENABLE_FAILED', message: 'Failed to enable 2FA' });
    }

    return { message: "TWOFA_ENABLED_SUCCESSFULLY" };
  }

  /**
   * Disables 2FA after verifying current password
   */
  async disableTwoFa(userId: string, data: { password: string, code: string }): Promise<UserResponse> {
    const userDoc = await this.userRep.findById(userId, 'twoFactorSecret password email');
    if (!userDoc) {
      throw new ApiError(404, { code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    const isValidPass = await comparePasswords(data.password, userDoc.password);
    if (!isValidPass) {
      throw new ApiError(400, { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect', fields: { password: 'Does not match our records' } });
    }
    // Recreate Secret and TOTP
    const secretObj = Secret.fromBase32(userDoc.twoFactorSecret);
    const totp = new TOTP({
      issuer: 'HonoApp',
      label: userDoc.email,
      digits: 6,
      period: 30,
      secret: secretObj,
    });
    // Validate the provided code
    const isValid = totp.validate({ token: data.code, window: 1 });

    if (isValid == -1 || isValid === null) {
      throw new ApiError(400, { code: 'INVALID_2FA_CODE', message: 'Invalid 2FA code', fields: { code: 'The provided 2FA code is invalid' } });
    }


    const result = await this.userRep.update(userId, { twoFactorSecret: "", isTwoFactorEnabled: false });

    if (!result) {
      throw new ApiError(500, { code: 'UPDATE_FAILED', message: 'Password update failed' });
    }

    return { message: "2FA_DISABLED_SUCCESSFULLY", }
  }
}
