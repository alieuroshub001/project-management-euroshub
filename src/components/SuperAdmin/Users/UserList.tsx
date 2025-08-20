'use client'
import { useEffect, useState } from 'react';
import { UserRole } from '@/types';

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch users');
      
      setUsers(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, newRole }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to update role');

      setSuccess('Role updated successfully');
      fetchUsers(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setDeleteConfirm(null);

      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to delete user');

      setSuccess('User deleted successfully');
      fetchUsers(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">User Management</h2>
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.emailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {user.emailVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user._id, e.target.value as UserRole)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      disabled={loading}
                    >
                      <option value="admin">Admin</option>
                      <option value="hr">HR</option>
                      <option value="employee">Employee</option>
                      <option value="client">Client</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {deleteConfirm === user._id ? (
                      <>
                        <button
                          onClick={() => deleteUser(user._id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                          disabled={loading}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-gray-600 hover:text-gray-900"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(user._id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={loading}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}