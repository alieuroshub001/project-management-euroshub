// components/Employee/MyProfile/MyProfile.tsx
"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { uploadFileToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';
import axios, { AxiosError } from 'axios';
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

interface CloudinaryUploadResult {
  secure_url?: string;
  url?: string;
  public_id?: string;
  [key: string]: unknown;
}

interface FormData {
  name: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const extractCloudinaryPublicId = (url: string): string | null => {
  const match = url.match(/\/upload\/(?:v\d+\/)?([^.#?]+)(?:\.[a-z0-9]+)?(?:[#?].*)?$/i);
  return match ? match[1] : null;
};

export default function MyProfile() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
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

  const fetchProfile = async (): Promise<void> => {
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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setImageUploading(true);
    try {
      if (profile?.profileImage) {
        const publicId = extractCloudinaryPublicId(profile.profileImage);
        if (publicId) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (deleteError) {
            console.warn('Failed to delete old image:', deleteError);
          }
        }
      }

      const result = await uploadFileToCloudinary(file, 'profile-images') as CloudinaryUploadResult;
      const newImageUrl: string = result.secure_url ?? result.url ?? '';
      if (!newImageUrl) throw new Error('Upload did not return a URL');

      const response = await axios.patch('/api/employee/profile', {
        profileImage: newImageUrl
      });

      const updatedProfile = response.data.data;
      setProfile(updatedProfile);
      
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
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
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

      const updateData: Partial<FormData> = {
        name: formData.name,
        phone: formData.phone
      };

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await axios.patch('/api/employee/profile', updateData);
      const updatedProfile = response.data.data;

      setProfile(updatedProfile);
      await update({ 
        name: updatedProfile.name,
        image: updatedProfile.profileImage 
      });
      
      setEditing(false);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
      let errorMessage = 'Update failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || 'Update failed';
      }
      
      toast.error(errorMessage);
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 flex justify-center items-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-100 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Elegant Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-3">My Profile</h1>
          <div className="w-24 h-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600 mx-auto rounded-full mb-4"></div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Manage your professional identity and account settings
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card - Left Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100 transition-all duration-300 hover:shadow-2xl hover:border-cyan-100">
              {/* Profile Header */}
              <div className="bg-gradient-to-br from-cyan-700 to-cyan-600 p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('/pattern.svg')] bg-cover"></div>
                <div className="relative inline-block mb-4">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/90 shadow-lg mx-auto transition-all duration-300 hover:scale-105">
                    {profile.profileImage ? (
                      <Image
                        src={profile.profileImage}
                        alt="Profile"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 128px, 160px"
                        priority
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-4xl font-bold text-white">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {imageUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  
                  <label className={`absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:bg-cyan-50 ${
                    imageUploading ? 'opacity-50 pointer-events-none' : ''
                  }`}>
                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                <h2 className="text-xl font-semibold text-white relative">{profile.name}</h2>
                <div className="inline-flex items-center px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full mt-2 transition-all hover:bg-white/30">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                  <span className="text-sm font-medium text-white">
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </span>
                </div>
              </div>

              {/* Profile Details */}
              <div className="p-6">
                <div className="space-y-5">
                  <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</h3>
                    <p className="mt-2 text-sm text-slate-800 font-medium break-all min-w-0">
                      {profile.email}
                    </p>
                  </div>

                  {profile.phone && (
                    <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</h3>
                      <p className="mt-2 text-sm text-slate-800 font-medium">{profile.phone}</p>
                    </div>
                  )}

                  {profile.employeeId && (
                    <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Employee ID</h3>
                      <p className="mt-2 text-sm text-slate-800 font-medium">{profile.employeeId}</p>
                    </div>
                  )}

                  <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Member Since</h3>
                    <p className="mt-2 text-sm text-slate-800 font-medium">
                      {new Date(profile.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long'
                      })}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                      <p className="text-2xl font-bold text-cyan-600">
                        {Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                      </p>
                      <p className="text-xs font-medium text-slate-500">Days Active</p>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                      <p className="text-2xl font-bold text-cyan-600">100%</p>
                      <p className="text-xs font-medium text-slate-500">Profile Complete</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Right Columns */}
          <div className="lg:col-span-2">
            {/* Profile Information Card */}
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100 transition-all duration-300 hover:shadow-2xl hover:border-cyan-100">
              <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-cyan-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800">Personal Information</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {editing ? 'Update your professional details' : 'View your profile information'}
                    </p>
                  </div>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-300 hover:shadow-md"
                    >
                      <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setEditing(false);
                          fetchProfile();
                        }}
                        className="inline-flex items-center px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg bg-white hover:bg-slate-50 transition-all duration-300 hover:shadow-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-300 hover:shadow-md ${
                          loading ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-5">
                {editing ? (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="transition-all hover:shadow-sm">
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="block w-full px-4 py-3 rounded-lg border-slate-300 shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 border transition duration-150 ease-in-out hover:border-cyan-300"
                        />
                      </div>

                      <div className="transition-all hover:shadow-sm">
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={profile.email}
                          readOnly
                          className="block w-full px-4 py-3 rounded-lg border-slate-300 bg-slate-50 cursor-not-allowed text-slate-500 border break-all"
                        />
                      </div>

                      <div className="md:col-span-2 transition-all hover:shadow-sm">
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="block w-full px-4 py-3 rounded-lg border-slate-300 shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 border transition duration-150 ease-in-out hover:border-cyan-300"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>

                    {/* Password Change Section */}
                    <div className="mt-10 pt-8 border-t border-slate-200">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="flex-shrink-0">
                          <svg className="h-8 w-8 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-800">Change Password</h4>
                          <p className="mt-1 text-sm text-slate-500">
                            Update your account password here. Leave blank to keep current password.
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="transition-all hover:shadow-sm">
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-2">
                            Current Password
                          </label>
                          <input
                            type="password"
                            id="currentPassword"
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleInputChange}
                            className="block w-full px-4 py-3 rounded-lg border-slate-300 shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 border transition duration-150 ease-in-out hover:border-cyan-300"
                            placeholder="Enter current password"
                          />
                        </div>

                        <div className="transition-all hover:shadow-sm">
                          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                            New Password
                          </label>
                          <input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            className="block w-full px-4 py-3 rounded-lg border-slate-300 shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 border transition duration-150 ease-in-out hover:border-cyan-300"
                            placeholder="Enter new password (min 6 chars)"
                          />
                        </div>

                        <div className="transition-all hover:shadow-sm">
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="block w-full px-4 py-3 rounded-lg border-slate-300 shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 border transition duration-150 ease-in-out hover:border-cyan-300"
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Full Name</h4>
                          <p className="mt-2 text-base font-semibold text-slate-800">{profile.name}</p>
                        </div>

                        <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Phone Number</h4>
                          <p className="mt-2 text-base font-semibold text-slate-800">
                            {profile.phone || <span className="text-slate-400">Not provided</span>}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Role</h4>
                          <p className="mt-2 text-base font-semibold text-slate-800 capitalize">{profile.role}</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email Address</h4>
                          <p className="mt-2 text-base font-semibold text-slate-800 break-all min-w-0">
                            {profile.email}
                          </p>
                        </div>

                        {profile.employeeId && (
                          <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Employee ID</h4>
                            <p className="mt-2 text-base font-semibold text-slate-800">{profile.employeeId}</p>
                          </div>
                        )}

                        <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Last Updated</h4>
                          <p className="mt-2 text-base font-semibold text-slate-800">
                            {new Date(profile.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Account Activity */}
                    <div className="mt-10 pt-8 border-t border-slate-200">
                      <h4 className="text-lg font-semibold text-slate-800 mb-6">Account Activity</h4>
                      <div className="space-y-6">
                        <div className="relative pl-8 group">
                          <div className="absolute left-0 top-0 w-4 h-4 bg-cyan-500 rounded-full group-hover:bg-cyan-600 transition-colors"></div>
                          <div className="absolute left-2 top-4 bottom-0 w-0.5 bg-slate-200"></div>
                          <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <h5 className="text-sm font-medium text-slate-800">Account Created</h5>
                            <p className="mt-1 text-sm text-slate-500">
                              {new Date(profile.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="relative pl-8 group">
                          <div className="absolute left-0 top-0 w-4 h-4 bg-cyan-500 rounded-full group-hover:bg-cyan-600 transition-colors"></div>
                          <div className="absolute left-2 top-4 bottom-0 w-0.5 bg-slate-200"></div>
                          <div className="p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <h5 className="text-sm font-medium text-slate-800">Last Profile Update</h5>
                            <p className="mt-1 text-sm text-slate-500">
                              {new Date(profile.updatedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
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