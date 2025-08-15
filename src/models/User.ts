import mongoose, { Schema, Model, ValidatorProps } from 'mongoose';
import { IUserWithPassword } from '@/types';

// Extend your app's user type locally to include avatar fields
type IUserWithAvatar = IUserWithPassword & {
  image?: string | null;        // NextAuth standard avatar
  profileImage?: string | null; // your custom field (kept for compatibility)
};

const UserSchema: Schema<IUserWithAvatar> = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true, // single unique index
    trim: true,
    lowercase: true,
    validate: {
      validator: (v: string) => /\S+@\S+\.\S+/.test(v),
      message: (props: ValidatorProps) => `${props.value} is not a valid email!`,
    },
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false,
    minlength: [6, 'Password must be at least 6 characters'],
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'hr', 'employee', 'client'],
    default: 'employee',
    required: true,
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: (v: string) => !v || /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(v),
      message: (props: ValidatorProps) => `${props.value} is not a valid phone number!`,
    },
  },

  // ✅ avatar fields
  profileImage: { type: String, trim: true }, // legacy/custom
  image: { type: String, trim: true },        // NextAuth reads/writes this

  emailVerified: {
    type: Boolean,
    default: false,
  },
  employeeId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // allows null while enforcing uniqueness for non-null
  },
  verificationToken: {
    type: String,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Keep role index
UserSchema.index({ role: 1 });

// Keep updatedAt fresh
UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Export model with the extended type so TS knows about `image`
const User: Model<IUserWithAvatar> =
  mongoose.models.User || mongoose.model<IUserWithAvatar>('User', UserSchema);

export default User;
