'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Calendar,
    Award,
    Settings,
    LogOut,
    ShieldCheck,
    Menu,
    X
} from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Check auth
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push('/login');
        }
        // Mock user for now
        setUser({ name: 'Budi', email: 'budi@example.com' });
    }, [router]);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Beranda', href: '/dashboard' },
        { icon: BookOpen, label: 'Kursus Saya', href: '/dashboard/courses' },
        { icon: Calendar, label: 'Jadwal Ujian', href: '/dashboard/schedule' },
        { icon: Award, label: 'Sertifikat', href: '/dashboard/certificates' },
        { icon: Settings, label: 'Pengaturan', href: '/dashboard/settings' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 transition-all duration-300 transform 
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 translate-x-0'} 
        hidden md:flex flex-col`}
            >
                <div className="h-20 flex items-center px-6 border-b border-gray-50">
                    <Link href="/" className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        {isSidebarOpen && (
                            <div className="font-bold text-lg text-gray-900 duration-200">
                                Akademiso
                                <span className="block text-[10px] text-gray-500 font-normal">Platform ISO Indonesia</span>
                            </div>
                        )}
                    </Link>
                </div>

                <div className="flex-1 py-6 px-3 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group relative
                  ${isActive
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                {isSidebarOpen && (
                                    <span className={`font-medium ${isActive ? 'font-bold' : ''}`}>
                                        {item.label}
                                    </span>
                                )}
                                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l-full"></div>}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-50">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors w-full
              ${!isSidebarOpen && 'justify-center'}
            `}
                    >
                        <LogOut className="w-5 h-5" />
                        {isSidebarOpen && <span className="font-medium">Keluar</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
