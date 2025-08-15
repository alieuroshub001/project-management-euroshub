// components/Employee/MyProfile/MyProfile.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { uploadFileToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  profileImage?: string;
  employeeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Define interface for Cloudinary upload result
interface CloudinaryUploadResult {
  secure_url?: string;
  url?: string;
  public_id?: string;
  [key: string]: unknown;
}

// Extract Cloudinary public_id from a secure URL like
// https://res.cloudinary.com/<cloud>/image/upload/v1700000000/folder/file_name.jpg
const extractCloudinaryPublicId = (url: string): string | null => {
  const match = url.match(/\/upload\/(?:v\d+\/)?([^.#?]+)(?:\.[a-z0-9]+)?(?:[#?].*)?$/i);
  return match ? match[1] : null; // e.g. "profile-images/file_name"
};

export default function MyProfile() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (session?.user?.email) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/employee/profile');
      setProfile(response.data.data);
      setFormData({
        name: response.data.data.name,
        phone: response.data.data.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error('Failed to fetch profile');
      console.error('Profile fetch error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setImageUploading(true);
    try {
      // Delete old image if exists
      if (profile?.profileImage) {
        const publicId = extractCloudinaryPublicId(profile.profileImage);
        if (publicId) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (deleteError) {
            console.warn('Failed to delete old image:', deleteError);
            // Continue with upload even if delete fails
          }
        }
      }

      // Upload new image
      const result = await uploadFileToCloudinary(file, 'profile-images') as CloudinaryUploadResult;

      // Get the image URL from the upload result
      const newImageUrl: string = result.secure_url ?? result.url ?? '';
      if (!newImageUrl) throw new Error('Upload did not return a URL');

      // Update profile with new image
      const response = await axios.patch('/api/employee/profile', {
        profileImage: newImageUrl
      });

      // Update local state
      const updatedProfile = response.data.data;
      setProfile(updatedProfile);
      
      // Update session with new image - this will update the layout
      await update({ 
        image: newImageUrl,
        name: updatedProfile.name 
      });
      
      toast.success('Profile image updated successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to update profile image');
    } finally {
      setImageUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password change if any password field is filled
      if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
        if (!formData.currentPassword) {
          throw new Error('Current password is required to change password');
        }
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        if (formData.newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
      }

      const updateData: Record<string, string> = {
        name: formData.name,
        phone: formData.phone
      };

      // Only include password fields if they're being changed
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await axios.patch('/api/employee/profile', updateData);
      const updatedProfile = response.data.data;

      setProfile(updatedProfile);
      
      // Update session with new name
      await update({ 
        name: updatedProfile.name,
        image: updatedProfile.profileImage 
      });
      
      setEditing(false);
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message
        : axios.isAxiosError(error)
        ? error.response?.data?.message || 'Update failed'
        : 'Update failed';
      
      toast.error(errorMessage);
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-sm opacity-75 animate-pulse"></div>
          <div className="relative bg-white rounded-full p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">My Profile</h1>
          <p className="text-slate-600">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card - Left Column */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 sticky top-8">
              <div className="text-center">
                {/* Profile Image */}
                <div className="relative inline-block mb-6">
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                    {profile.profileImage ? (
                      <Image
                        src={profile.profileImage}
                        alt="Profile"
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-110"
                        sizes="(max-width: 640px) 128px, 160px"
                        priority
                        onError={() => {
                          console.error('Image failed to load:', profile.profileImage);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold text-white">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    {/* Loading overlay */}
                    {imageUploading && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>

                  {/* Camera icon overlay */}
                  <div className="absolute -bottom-2 -right-2">
                    <label className={`flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl cursor-pointer transition-all duration-200 hover:scale-110 ${
                      imageUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={imageUploading}
                      />
                    </label>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-800">{profile.name}</h2>
                  <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-sm font-medium rounded-full">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </div>
                  {profile.employeeId && (
                    <p className="text-slate-600 text-sm">ID: {profile.employeeId}</p>
                  )}
                  <p className="text-slate-500 text-xs">
                    Member since {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-xs text-blue-600 font-medium">Days Active</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                    <div className="text-2xl font-bold text-purple-600">100%</div>
                    <div className="text-xs text-purple-600 font-medium">Profile Complete</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Right Columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Information Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white">Profile Information</h3>
                    <p className="text-blue-100 text-sm">Update your personal details</p>
                  </div>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-6 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                  ) : (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setEditing(false);
                          fetchProfile();
                        }}
                        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-2 bg-white text-blue-600 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105 flex items-center space-x-2 ${
                          loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Save Changes</span>
                          </>)}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-8">
                {editing ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                        <input
                          type="email"
                          value={profile.email}
                          readOnly
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 cursor-not-allowed text-slate-500"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700">Phone Number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>

                    {/* Password Section */}
                    <div className="bg-slate-50 rounded-2xl p-6 mt-8">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-800">Change Password</h4>
                          <p className="text-sm text-slate-600">Leave blank to keep current password</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Current Password</label>
                          <input
                            type="password"
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white"
                            placeholder="Current password"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">New Password</label>
                          <input
                            type="password"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white"
                            placeholder="New password (min 6 chars)"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
                          <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-white"
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8">
                    {/* Information Grid */}
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Full Name</p>
                          <p className="text-xl font-semibold text-slate-800">{profile.name}</p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Phone Number</p>
                          <p className="text-xl font-semibold text-slate-800">{profile.phone || 'Not provided'}</p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Role</p>
                          <p className="text-xl font-semibold text-slate-800 capitalize">{profile.role}</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Email Address</p>
                          <p className="text-xl font-semibold text-slate-800">{profile.email}</p>
                        </div>

                        {profile.employeeId && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Employee ID</p>
                            <p className="text-xl font-semibold text-slate-800">{profile.employeeId}</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Last Updated</p>
                          <p className="text-xl font-semibold text-slate-800">{new Date(profile.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Account Timeline */}
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-6">
                      <h4 className="text-lg font-semibold text-slate-800 mb-4">Account Timeline</h4>
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium text-slate-800">Account Created</p>
                          <p className="text-sm text-slate-600">{new Date(profile.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}