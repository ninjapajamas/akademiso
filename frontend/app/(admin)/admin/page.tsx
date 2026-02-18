'use client';

import { Users, BookOpen, GraduationCap, DollarSign, ArrowUpRight } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-3">Dashboard Admin</h1>
                    <p className="text-blue-100 max-w-xl text-lg leading-relaxed">
                        Selamat datang kembali di panel administrasi Akademiso.
                        Kelola kursus, instruktur, dan siswa dengan mudah dari sini.
                    </p>
                </div>

                {/* Decorative Circles */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute right-20 bottom-0 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/2"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Kursus', value: '12', color: 'bg-blue-100 text-blue-600', icon: BookOpen },
                    { label: 'Total Instruktur', value: '5', color: 'bg-purple-100 text-purple-600', icon: GraduationCap },
                    { label: 'Total Siswa', value: '1,234', color: 'bg-green-100 text-green-600', icon: Users },
                    { label: 'Pendapatan', value: 'Rp 45.2M', color: 'bg-orange-100 text-orange-600', icon: DollarSign },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-extrabold text-gray-900">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Recent Activity / Chart Placeholder */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-80 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <ArrowUpRight className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Statistik Pendaftaran</h3>
                    <p className="text-gray-500 text-sm max-w-xs">Grafik pertumbuhan siswa dan pendaftaran kursus baru.</p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-80 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <DollarSign className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Laporan Pendapatan</h3>
                    <p className="text-gray-500 text-sm max-w-xs">Analisis pendapatan bulanan dan performa penjualan kursus.</p>
                </div>
            </div>
        </div>
    );
}
