'use client';

import { Clock, CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-3">Selamat Datang, Budi!</h1>
                    <p className="text-blue-100 max-w-xl text-lg leading-relaxed">
                        Siap melanjutkan perjalanan sertifikasi ISO kamu hari ini? Ada 2 modul
                        menunggu untuk diselesaikan.
                    </p>
                </div>

                {/* Decorative Circles */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute right-20 bottom-0 w-32 h-32 bg-white opacity-10 rounded-full translate-y-1/2"></div>

                <div className="absolute top-1/2 right-10 -translate-y-1/2 flex gap-4 hidden md:flex">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[100px] border border-white/10">
                        <div className="text-3xl font-bold">4</div>
                        <div className="text-xs font-medium uppercase tracking-wider text-blue-200">Kursus</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[100px] border border-white/10">
                        <div className="text-3xl font-bold">2</div>
                        <div className="text-xs font-medium uppercase tracking-wider text-blue-200">Selesai</div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
                {[
                    { icon: Clock, label: "Jam Belajar", value: "24 Jam", color: "bg-blue-100 text-blue-600" },
                    { icon: CheckCircle, label: "Rata-rata Skor", value: "88/100", color: "bg-green-100 text-green-600" },
                    { icon: Calendar, label: "Ujian Berikutnya", value: "15 Nov", color: "bg-orange-100 text-orange-600" },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">{stat.label}</p>
                            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Active Courses & Certificates */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Kursus Aktif</h2>
                    <Link href="/dashboard/courses" className="text-sm font-bold text-blue-600 hover:text-blue-700">Lihat Semua</Link>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Course Card 1 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow">
                        <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop)' }}></div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">ISO 9001</span>
                                    <span className="text-[10px] text-gray-400">Terakhir: 2 jam lalu</span>
                                </div>
                                <h3 className="font-bold text-gray-900 line-clamp-1">Quality Management Systems</h3>
                                <p className="text-xs text-gray-500 mt-1">Instruktur: Dr. Andi Wijaya</p>
                            </div>

                            <div className="space-y-2 mt-3">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-gray-500">Progres</span>
                                    <span className="text-blue-600">75%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full w-3/4"></div>
                                </div>
                                <Link href="/learn/iso-9001" className="w-full mt-2 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1">
                                    Lanjut Belajar <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Course Card 2 */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow">
                        <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop)' }}></div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">ISO 45001</span>
                                    <span className="text-[10px] text-gray-400">Baru dimulai</span>
                                </div>
                                <h3 className="font-bold text-gray-900 line-clamp-1">Occupational Health & Safety</h3>
                                <p className="text-xs text-gray-500 mt-1">Instruktur: Ir. Sarah Melati</p>
                            </div>

                            <div className="space-y-2 mt-3">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-gray-500">Progres</span>
                                    <span className="text-blue-600">12%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full w-[12%]"></div>
                                </div>
                                <Link href="/learn/iso-45001" className="w-full mt-2 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1">
                                    Lanjut Belajar <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Certificates Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Sertifikat Saya</h2>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                    {[
                        { title: "Awareness ISO 14001:2015", subtitle: "Environmental Management Systems • Lulus 12 Okt 2023" },
                        { title: "Basic Internal Audit ISO 19011", subtitle: "Guidelines for Auditing Management • Lulus 05 Sep 2023" }
                    ].map((cert, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{cert.title}</h4>
                                    <p className="text-xs text-gray-500">{cert.subtitle}</p>
                                </div>
                            </div>
                            <button className="text-xs font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-700">
                                Unduh
                            </button>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
