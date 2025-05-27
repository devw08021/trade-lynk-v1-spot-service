import { Types } from 'mongoose';


export interface User {
  _id?: Types.ObjectId;
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  profilePicture?: string;
  isVerified: boolean;
  isTwoFactorEnabled: boolean;
  twoFactorSecret?: string;
  walletAddresses: string[];
  createdAt: Date;
  updatedAt: Date;
  role: 'user' | 'admin';
  kycStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected';
}

export interface UserSettingsInterface {
  _id?: Types.ObjectId;
  theme: 'light' | 'dark';
  language: 'en' | 'fr';
  timezone: string;
  currency: string;
  siteNotifications: boolean;
  emailNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserResponse = Omit<User, 'password' | 'twoFactorSecret'>;
