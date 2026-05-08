'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, ClipboardCheck, Clock3, Users } from 'lucide-react';
import { Project } from '@/types';

interface ProjectManagerStatsResponse {
    summary: {
        total_projects: number;
        draft_projects: number;
        planning_projects: number;
        active_projects: number;
        on_hold_projects: number;
        completed_projects: number;
        overdue_projects: number;
        total_assignments: number;
        assigned_instructors: number;
    };
    recent_projects: Project[];
    instructor_workloads: Array<{
        instructor_id: number;
        instructor_name: string;
        instructor_title: string;
        total_assignments: number;
        active_assignments: number;
        completed_assignments: number;
    }>;
}

function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    planning: 'bg-blue-100 text-blue-700',
    active: 'bg-emerald-100 text-emerald-700',
    on_hold: 'bg-amber-100 text-amber-700',
    completed: 'bg-violet-100 text-violet-700',
    cancelled: 'bg-rose-100 text-rose-700',
};

export default function ProjectManagerDashboardPage() {
    const [data, setData] = useState<ProjectManagerStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();
                const res = await fetch(`${apiUrl}/api/project-manager/stats/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        void fetchStats();
    }, []);

    const summary = data?.summary;
    const statCards = summary ? [
        { label: 'Total Proyek', value: summary.total_projects, icon: BriefcaseBusiness, tone: 'bg-amber-100 text-amber-700' },
        { label: 'Proyek Aktif', value: summary.active_projects, icon: ClipboardCheck, tone: 'bg-emerald-100 text-emerald-700' },
        { label: 'Trainer Ditugaskan', value: summary.assigned_instructors, icon: Users, tone: 'bg-sky-100 text-sky-700' },
        { label: 'Proyek Terlambat', value: summary.overdue_projects, icon: Clock3, tone: 'bg-rose-100 text-rose-700' },
    ] : [];

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-white">
                <div className="relative z-10 max-w-3xl">
                    <p className="text-sm font-semibold text-amber-100">Portal Manajer Proyek</p>
                    <h1 className="mt-2 text-3xl font-bold">Kelola proyek trainer dari satu dasbor.</h1>
                    <p className="mt-3 text-base leading-relaxed text-amber-50">
                        Pantau proyek aktif, sebar beban kerja trainer, hubungkan proyek ke pelatihan yang relevan, dan lihat penugasan mana yang perlu dipercepat.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link href="/project-manager/projects" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-50">
                            Kelola Proyek
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
                <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/10" />
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {loading ? (
                    [1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-28 rounded-2xl border border-amber-100 bg-white animate-pulse" />
                    ))
                ) : statCards.map((card) => (
                    <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>
                            <card.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{card.label}</p>
                            <p className="text-2xl font-extrabold text-slate-900">{card.value}</p>
                        </div>
                    </div>
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Proyek Terbaru</h2>
                            <p className="mt-1 text-sm text-slate-500">Proyek yang paling baru diperbarui akan muncul di sini.</p>
                        </div>
                        <Link href="/project-manager/projects" className="text-sm font-bold text-amber-600 hover:text-amber-700">
                            Lihat semua
                        </Link>
                    </div>

                    <div className="mt-5 space-y-4">
                        {(data?.recent_projects || []).length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-5 py-8 text-center text-sm text-slate-500">
                                Belum ada proyek yang dibuat.
                            </div>
                        ) : (data?.recent_projects || []).map((project) => (
                            <div key={project.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">{project.title}</h3>
                                        <p className="mt-1 text-sm text-slate-500">{project.client_name || 'Klien internal Akademiso'}</p>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass[project.status] || 'bg-slate-100 text-slate-700'}`}>
                                        {project.status_label || project.status}
                                    </span>
                                </div>
                                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                                    <p>Prioritas: <span className="font-semibold text-slate-900">{project.priority_label || project.priority}</span></p>
                                    <p>Target: <span className="font-semibold text-slate-900">{formatDate(project.due_date)}</span></p>
                                    <p>Penugasan: <span className="font-semibold text-slate-900">{project.assignment_count || 0}</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Beban Kerja Trainer</h2>
                        <p className="mt-1 text-sm text-slate-500">Ringkasan trainer dengan penugasan paling aktif di proyek Anda.</p>
                    </div>

                    <div className="mt-5 space-y-3">
                        {(data?.instructor_workloads || []).length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-5 py-8 text-center text-sm text-slate-500">
                                Belum ada trainer yang mendapat penugasan proyek.
                            </div>
                        ) : (data?.instructor_workloads || []).map((item) => (
                            <div key={item.instructor_id} className="rounded-2xl border border-slate-100 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-slate-900">{item.instructor_name}</h3>
                                        <p className="text-sm text-slate-500">{item.instructor_title}</p>
                                    </div>
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                        {item.active_assignments} aktif
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                                        <p className="text-slate-500">Total Penugasan</p>
                                        <p className="font-bold text-slate-900">{item.total_assignments}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                                        <p className="text-slate-500">Selesai</p>
                                        <p className="font-bold text-slate-900">{item.completed_assignments}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

