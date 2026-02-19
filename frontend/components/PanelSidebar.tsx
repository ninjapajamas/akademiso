'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Award, Users, CheckSquare, DollarSign, LogOut, Settings, Bell } from 'lucide-react';

const menuItems = [
    { name: 'Dasbor Utama', icon: LayoutDashboard, href: '/panel/dashboard' },
    { name: 'Sertifikat ISO', icon: Award, href: '/panel/certificates' },
    { name: 'Trainer & Audit', icon: Users, href: '/panel/trainers' },
    { name: 'Verifikasi', icon: CheckSquare, href: '/panel/verification' },
    { name: 'Pendapatan', icon: DollarSign, href: '/panel/revenue' },
];

export default function PanelSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-white border-r border-gray-100 min-h-screen fixed left-0 top-0 flex flex-col z-10">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div>
                    <h1 className="font-bold text-gray-900 leading-none">Akademiso</h1>
                    <span className="text-[10px] font-bold text-gray-400 tracking-wider">PANEL SERTIFIKASI</span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 mt-4">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">Budi Santoso</p>
                        <p className="text-xs text-gray-500 truncate">Manajer Sertifikasi</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
