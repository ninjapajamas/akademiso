'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, BookOpen, Users, LogOut, GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';

function decodeJwt(token: string) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [username, setUsername] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) { router.replace('/login'); return; }
        const payload = decodeJwt(token);
        if (!payload) { router.replace('/login'); return; }
        setUsername(payload.username || '');
    }, [router]);

    const menuItems = [
        { label: 'Dashboard', href: '/instructor', icon: LayoutDashboard },
        { label: 'Kursus Saya', href: '/instructor/courses', icon: BookOpen },
        { label: 'Siswa', href: '/instructor/students', icon: Users },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 w-64 flex flex-col">
                <div className="h-20 flex items-center px-6 border-b border-gray-50">
                    <Link href="/instructor" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="font-bold text-gray-900">
                            Akademiso
                            <span className="block text-[10px] text-gray-500 font-normal">Portal Instruktur</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1">
                    {menuItems.map(item => {
                        const isActive = pathname === item.href || (item.href !== '/instructor' && pathname.startsWith(item.href));
                        return (
                            <Link key={item.href} href={item.href}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors relative ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                                <span className={`font-medium ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-l-full" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-50">
                    <div className="flex items-center gap-2 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{username}</span>
                    </div>
                    <button onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors w-full">
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium text-sm">Keluar</span>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 md:ml-64 p-8">
                {children}
            </main>
        </div>
    );
}
