'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Edit, Trash2, User, CheckCircle, XCircle } from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/academy/users/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/academy/users/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                fetchUsers();
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Students & Accounts</h1>
                {/* Link to create user if needed, but usually users register themselves */}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">User</th>
                            <th className="p-4 font-semibold text-gray-600">Email</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                            <th className="p-4 font-semibold text-gray-600">Joined</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                        ) : users.map((user: any) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-900 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="line-clamp-1">{user.username}</div>
                                        <div className="text-xs text-gray-500">{user.first_name} {user.last_name}</div>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-600 text-sm">{user.email}</td>
                                <td className="p-4">
                                    {user.is_active ?
                                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="w-3 h-3" /> Active</span> :
                                        <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><XCircle className="w-3 h-3" /> Inactive</span>
                                    }
                                    {user.is_staff && <span className="ml-2 bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded border border-purple-200">Staff</span>}
                                </td>
                                <td className="p-4 text-gray-500 text-xs">
                                    {new Date(user.date_joined).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    {/* Edit can be implemented later or if requested */}
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="inline-flex p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        title="Delete User"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
