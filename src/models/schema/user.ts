import mongoose, { Schema, Document, model } from "mongoose";
import { User as UserInterface } from "@/interfaces/user";

const UserSchema = new Schema<UserInterface>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    username: { type: String, required: true, minlength: 3, maxlength: 50 },
    firstName: { type: String, maxlength: 50 },
    lastName: { type: String, maxlength: 50 },
    bio: { type: String, maxlength: 200 },
    profilePicture: { type: String },
    isVerified: { type: Boolean, default: false },
    isTwoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    walletAddresses: { type: [String], default: [] },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },
  },
  {
    timestamps: true,
  }
);

// Create model
const UserModel = model<UserInterface & Document>("User", UserSchema);

export default UserModel;
