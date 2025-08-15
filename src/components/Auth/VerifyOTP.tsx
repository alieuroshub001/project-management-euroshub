"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface VerifyOTPFormProps {
  email: string;
  type: 'verification' | 'password-reset';
  originalEmail?: string; // Add this for admin approval cases
}

export default function VerifyOTPForm({ email, type, originalEmail }: VerifyOTPFormProps) {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // For password reset, validate passwords match
      if (type === 'password-reset' && newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Use originalEmail for verification if available (admin approval cases)
      const verificationEmail = originalEmail || email;

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: verificationEmail, // Use the correct email for verification
          otp,
          type,
          ...(type === 'password-reset' && { newPassword })
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      setSuccess(data.message);
      
      // Redirect to login after short delay
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Display appropriate messages based on email context
  const getDisplayMessage = () => {
    if (originalEmail && originalEmail !== email) {
      return `Enter the OTP sent to ${email} for verification of ${originalEmail}`;
    }
    return `Enter the OTP sent to ${email}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {type === 'password-reset' ? 'Reset Password' : 'Verify Email'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getDisplayMessage()}
          </p>
          {originalEmail && originalEmail !== email && (
            <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 text-xs rounded">
              <strong>Admin Verification:</strong> OTP was sent to system administrator for approval.
            </div>
          )}
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            {success}
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="otp" className="sr-only">
                OTP
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                maxLength={6}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm text-center tracking-wider"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            
            {type === 'password-reset' && (
              <>
                <div>
                  <label htmlFor="newPassword" className="sr-only">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    minLength={6}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="New Password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || (type === 'verification' && otp.length !== 6)}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading || (type === 'verification' && otp.length !== 6) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading 
                ? type === 'password-reset' ? 'Processing...' : 'Verifying...' 
                : type === 'password-reset' ? 'Reset Password' : 'Verify OTP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}