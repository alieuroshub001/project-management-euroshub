//models/OTP.ts - Updated with referenceEmail field
import mongoose, { Schema, Model } from 'mongoose';
import { IOTP } from '@/types';

const OTPSchema: Schema = new Schema({
  email: { type: String, required: true }, // Email where OTP was sent
  otp: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['verification', 'password-reset'], 
    required: true 
  },
  referenceEmail: { 
    type: String, 
    required: false // Original user email (for admin approval cases)
  },
  expiresAt: { 
    type: Date, 
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  },
  createdAt: { type: Date, default: Date.now }
});

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OTPSchema.index({ email: 1, type: 1 });
OTPSchema.index({ referenceEmail: 1, type: 1 });

const OTP: Model<IOTP> = 
  mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema);

export default OTP;