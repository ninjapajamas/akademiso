'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Award, BookOpen, BriefcaseBusiness, GraduationCap, KeyRound, LayoutDashboard, Tags, Users } from 'lucide-react';

interface AdminStats {
    total_users: number;
    total_courses: number;
    total_instructors: number;
    active_courses: number;
    inhouse_requests: number;
    pending_certificates: number;
    pending_affiliate_applications?: number;
    total_referral_codes?: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/stats/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    setStats(await res.json());
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = stats ? [
        { label: 'Total Pengguna', value: stats.total_users.toLocaleString('id-ID'), icon: Users, color: 'bg-blue-100 text-blue-600', href: '/admin/users' },
        { label: 'Total Kursus', value: stats.total_courses.toLocaleString('id-ID'), icon: BookOpen, color: 'bg-violet-100 text-violet-600', href: '/admin/courses' },
        { label: 'Trainer', value: stats.total_instructors.toLocaleString('id-ID'), icon: GraduationCap, color: 'bg-indigo-100 text-indigo-600', href: '/admin/instructors' },
        { label: 'Kursus Aktif', value: stats.active_courses.toLocaleString('id-ID'), icon: LayoutDashboard, color: 'bg-emerald-100 text-emerald-600', href: '/admin/courses' },
    ] : [];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Dashboard Admin</h1>
                    <p className="text-blue-100 text-base leading-relaxed max-w-2xl">
                        Panel admin sekarang fokus ke operasional Akademiso: kursus, trainer, pengguna, sertifikat, dan lead inhouse.
                        Semua transaksi keuangan sudah dipindahkan khusus ke role akuntan.
                    </p>
                    <div className="flex gap-3 mt-5 flex-wrap">
                        <Link href="/admin/courses/new" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-blue-50">
                            + Tambah Kursus
                        </Link>
                        <Link href="/admin/referrals" className="inline-flex items-center gap-2 bg-white/20 text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/30 border border-white/30">
                            Kelola Referral <Tags className="w-4 h-4" />
                        </Link>
                        <Link href="/admin/certificates" className="inline-flex items-center gap-2 bg-white/20 text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/30 border border-white/30">
                            Validasi Sertifikat <Award className="w-4 h-4" />
                        </Link>
                        <Link href="/admin/inhouse-requests" className="inline-flex items-center gap-2 bg-white/20 text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/30 border border-white/30">
                            Inhouse Leads <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link href="/admin/access-links" className="inline-flex items-center gap-2 bg-white/20 text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-white/30 border border-white/30">
                            Student Access Links <KeyRound className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
                <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {loading ? (
                    [1, 2, 3, 4].map((item) => <div key={item} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)
                ) : statCards.map((card) => (
                    <Link key={card.label} href={card.href} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-blue-200 transition-all group">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${card.color}`}>
                            <card.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                            <h3 className="text-2xl font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors">{card.value}</h3>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-5">
                {stats && [
                    { label: 'Lead Inhouse', value: stats.inhouse_requests, icon: BriefcaseBusiness, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Sertifikat Menunggu', value: stats.pending_certificates, icon: Award, color: 'text-rose-600 bg-rose-50' },
                    { label: 'Pengajuan Affiliate', value: stats.pending_affiliate_applications ?? 0, icon: Tags, color: 'text-emerald-600 bg-emerald-50' },
                ].map((item) => (
                    <div key={item.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium mb-0.5">{item.label}</p>
                            <p className="text-2xl font-extrabold text-gray-900">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { href: '/admin/courses', label: 'Kursus', desc: 'Kelola program aktif' },
                    { href: '/admin/instructors', label: 'Trainer', desc: 'Atur pengajar & profil' },
                    { href: '/admin/users', label: 'Pengguna', desc: 'Kelola akun dan role' },
                    { href: '/admin/referrals', label: 'Referral', desc: 'Kode promo & affiliator' },
                    { href: '/admin/access-links', label: 'Access Link', desc: 'Buat akun student via link' },
                    { href: '/admin/certificates', label: 'Sertifikat', desc: 'Validasi kelulusan' },
                    { href: '/admin/inhouse-requests', label: 'Inhouse', desc: 'Tindak lanjuti lead' },
                ].map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                        <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}

