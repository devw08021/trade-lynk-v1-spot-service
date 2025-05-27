import mongoose, { Schema, Document, model } from "mongoose";
import { UserSettings as UserSettingInterface } from "@/interfaces/user";

const UserSettingSchema = new Schema<UserSettingInterface>(
  {
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    language: { type: String, enum: ["en", "fr"], default: "en" },
    timezone: { type: String, default: "UTC" },
    currency: { type: String, default: "USD" },
    siteNotifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Create model
const UserSettingModel = model<UserInterface & Document>("UserSetting", UserSettingSchema);

export default UserSettingModel;
