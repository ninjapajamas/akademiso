'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, Plus, Save, Search, Trash2, Users, X } from 'lucide-react';
import { Course, Instructor, Project, ProjectAssignment } from '@/types';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';

type ProjectFormState = {
    title: string;
    client_name: string;
    description: string;
    deliverables: string;
    status: Project['status'];
    priority: Project['priority'];
    start_date: string;
    due_date: string;
    related_course: string;
    selected_instructor_id: string;
    assigned_instructor_ids: number[];
};

const defaultFormState: ProjectFormState = {
    title: '',
    client_name: '',
    description: '',
    deliverables: '',
    status: 'draft',
    priority: 'medium',
    start_date: '',
    due_date: '',
    related_course: '',
    selected_instructor_id: '',
    assigned_instructor_ids: [],
};

const statusBadgeClass: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    planning: 'bg-blue-100 text-blue-700',
    active: 'bg-emerald-100 text-emerald-700',
    on_hold: 'bg-amber-100 text-amber-700',
    completed: 'bg-violet-100 text-violet-700',
    cancelled: 'bg-rose-100 text-rose-700',
};

const assignmentStatusOptions: Array<{ value: ProjectAssignment['status']; label: string }> = [
    { value: 'assigned', label: 'Baru Ditugaskan' },
    { value: 'in_progress', label: 'Sedang Dikerjakan' },
    { value: 'review', label: 'Siap Direview' },
    { value: 'completed', label: 'Selesai' },
    { value: 'blocked', label: 'Tertahan' },
];

function formatDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default function ProjectManagerProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Project['status']>('all');
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<ProjectFormState>(defaultFormState);
    const { confirmAction, showError, showSuccess } = useFeedbackModal();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = () => localStorage.getItem('access_token');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token()}` };
            const [projectRes, courseRes, instructorRes] = await Promise.all([
                fetch(`${apiUrl}/api/projects/`, { headers }),
                fetch(`${apiUrl}/api/courses/`, { headers }),
                fetch(`${apiUrl}/api/instructors/`, { headers }),
            ]);

            if (projectRes.ok) {
                const data = await projectRes.json();
                setProjects(Array.isArray(data) ? data : data.results || []);
            }
            if (courseRes.ok) {
                const data = await courseRes.json();
                setCourses(Array.isArray(data) ? data : data.results || []);
            }
            if (instructorRes.ok) {
                const data = await instructorRes.json();
                setInstructors(Array.isArray(data) ? data : data.results || []);
            }
        } catch (error) {
            console.error(error);
            await showError('Data manajer proyek belum bisa dimuat.', 'Memuat Gagal');
        } finally {
            setLoading(false);
        }
    }, [apiUrl, showError]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const openCreateModal = () => {
        setEditingProject(null);
        setForm(defaultFormState);
        setModalOpen(true);
    };

    const openEditModal = (project: Project) => {
        setEditingProject(project);
        setForm({
            title: project.title,
            client_name: project.client_name || '',
            description: project.description || '',
            deliverables: project.deliverables || '',
            status: project.status,
            priority: project.priority,
            start_date: project.start_date || '',
            due_date: project.due_date || '',
            related_course: project.related_course ? String(project.related_course) : '',
            selected_instructor_id: '',
            assigned_instructor_ids: (project.assignments || []).map((assignment) => assignment.instructor),
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingProject(null);
        setForm(defaultFormState);
    };

    const handleAddSelectedInstructor = () => {
        const selectedId = Number(form.selected_instructor_id);
        if (!selectedId) {
            return;
        }

        setForm((current) => ({
            ...current,
            selected_instructor_id: '',
            assigned_instructor_ids: current.assigned_instructor_ids.includes(selectedId)
                ? current.assigned_instructor_ids
                : [...current.assigned_instructor_ids, selectedId],
        }));
    };

    const handleRemoveInstructor = (instructorId: number) => {
        setForm((current) => ({
            ...current,
            assigned_instructor_ids: current.assigned_instructor_ids.filter((id) => id !== instructorId),
        }));
    };

    const handleSaveProject = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);

        try {
            const method = editingProject ? 'PATCH' : 'POST';
            const endpoint = editingProject ? `${apiUrl}/api/projects/${editingProject.id}/` : `${apiUrl}/api/projects/`;
            const response = await fetch(endpoint, {
                method,
                headers: {
                    Authorization: `Bearer ${token()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: form.title,
                    client_name: form.client_name,
                    description: form.description,
                    deliverables: form.deliverables,
                    status: form.status,
                    priority: form.priority,
                    start_date: form.start_date || null,
                    due_date: form.due_date || null,
                    related_course: form.related_course ? Number(form.related_course) : null,
                    assigned_instructor_ids: form.assigned_instructor_ids,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                await showError(JSON.stringify(payload), editingProject ? 'Pembaruan Gagal' : 'Pembuatan Gagal');
                return;
            }

            await fetchData();
            closeModal();
            await showSuccess(
                editingProject ? 'Proyek berhasil diperbarui.' : 'Proyek baru berhasil dibuat dan trainer sudah ditugaskan.',
                editingProject ? 'Proyek Diperbarui' : 'Proyek Dibuat'
            );
        } catch (error) {
            console.error(error);
            await showError('Terjadi kesalahan koneksi saat menyimpan proyek.', 'Koneksi Bermasalah');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProject = async (project: Project) => {
        const shouldDelete = await confirmAction({
            title: `Hapus proyek "${project.title}"?`,
            message: 'Proyek dan assignment trainer di dalamnya akan ikut terhapus.',
            confirmLabel: 'Ya, Hapus',
            cancelLabel: 'Batal',
            tone: 'warning',
        });
        if (!shouldDelete) return;

        try {
            const response = await fetch(`${apiUrl}/api/projects/${project.id}/`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!response.ok) {
                await showError('Proyek belum bisa dihapus.', 'Penghapusan Gagal');
                return;
            }
            await fetchData();
            await showSuccess(`Proyek ${project.title} berhasil dihapus.`, 'Proyek Dihapus');
        } catch (error) {
            console.error(error);
            await showError('Terjadi kesalahan koneksi saat menghapus proyek.', 'Koneksi Bermasalah');
        }
    };

    const handleAssignmentStatusChange = async (projectId: number, assignmentId: number, status: ProjectAssignment['status']) => {
        try {
            const response = await fetch(`${apiUrl}/api/projects/${projectId}/update_assignment/`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    assignment_id: assignmentId,
                    status,
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                await showError(payload.error || 'Status assignment belum bisa diperbarui.', 'Pembaruan Gagal');
                return;
            }

            setProjects((current) => current.map((project) => {
                if (project.id !== projectId) return project;
                return {
                    ...project,
                    assignments: (project.assignments || []).map((assignment) => (
                        assignment.id === assignmentId ? payload.assignment : assignment
                    )),
                };
            }));
        } catch (error) {
            console.error(error);
            await showError('Terjadi kesalahan koneksi saat mengubah status assignment.', 'Koneksi Bermasalah');
        }
    };

    const filteredProjects = useMemo(() => {
        return projects.filter((project) => {
            const matchesSearch =
                project.title.toLowerCase().includes(search.toLowerCase()) ||
                (project.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
                (project.related_course_title || '').toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [projects, search, statusFilter]);

    const selectedInstructors = form.assigned_instructor_ids
        .map((instructorId) => instructors.find((item) => item.id === instructorId))
        .filter((item): item is Instructor => Boolean(item));

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Kelola Proyek</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Buat proyek, hubungkan ke pelatihan, dan tugaskan trainer yang paling sesuai.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600"
                >
                    <Plus className="h-4 w-4" />
                    Tambah Proyek
                </button>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm lg:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari nama proyek, klien, atau pelatihan..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'all' | Project['status'])}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-400"
                >
                    <option value="all">Semua Status</option>
                    <option value="draft">Draft</option>
                    <option value="planning">Perencanaan</option>
                    <option value="active">Aktif</option>
                    <option value="on_hold">Ditunda</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                </select>
            </div>

            <div className="space-y-4">
                {loading ? (
                    [1, 2, 3].map((item) => (
                        <div key={item} className="h-44 rounded-3xl border border-amber-100 bg-white animate-pulse" />
                    ))
                ) : filteredProjects.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-amber-200 bg-white px-6 py-12 text-center">
                        <ClipboardList className="mx-auto h-10 w-10 text-amber-400" />
                        <h2 className="mt-4 text-lg font-bold text-slate-900">Belum ada proyek yang cocok.</h2>
                        <p className="mt-2 text-sm text-slate-500">Coba ubah pencarian atau buat proyek baru untuk trainer Anda.</p>
                    </div>
                ) : filteredProjects.map((project) => (
                    <div key={project.id} className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-bold text-slate-900">{project.title}</h2>
                                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass[project.status] || 'bg-slate-100 text-slate-700'}`}>
                                        {project.status_label || project.status}
                                    </span>
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                        {project.priority_label || project.priority}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500">
                                    {project.client_name || 'Klien internal Akademiso'}
                                    {project.related_course_title ? ` • Pelatihan: ${project.related_course_title}` : ''}
                                </p>
                                {project.description && (
                                    <p className="max-w-3xl text-sm leading-7 text-slate-600">{project.description}</p>
                                )}
                                <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                                    <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                        <CalendarDays className="h-4 w-4 text-amber-500" />
                                        Mulai {formatDate(project.start_date)}
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                        <CalendarDays className="h-4 w-4 text-amber-500" />
                                        Deadline {formatDate(project.due_date)}
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                        <Users className="h-4 w-4 text-amber-500" />
                                        {project.assignment_count || 0} trainer
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => openEditModal(project)}
                                    className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                                >
                                    Ubah
                                </button>
                                <button
                                    onClick={() => handleDeleteProject(project)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Hapus
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Penugasan Trainer</h3>
                            <div className="mt-4 grid gap-3">
                                {(project.assignments || []).length === 0 ? (
                                    <p className="text-sm text-slate-500">Belum ada trainer yang ditugaskan ke proyek ini.</p>
                                ) : (project.assignments || []).map((assignment) => (
                                    <div key={assignment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <p className="font-bold text-slate-900">{assignment.instructor_name}</p>
                                                <p className="text-sm text-slate-500">{assignment.instructor_title || assignment.role_label || 'Trainer'}</p>
                                            </div>
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                <select
                                                    value={assignment.status}
                                                    onChange={(event) => void handleAssignmentStatusChange(project.id, assignment.id, event.target.value as ProjectAssignment['status'])}
                                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-amber-400"
                                                >
                                                    {assignmentStatusOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <span className="text-xs text-slate-400">
                                                    Ditugaskan {formatDate(assignment.assigned_at)}
                                                </span>
                                            </div>
                                        </div>
                                        {assignment.notes && (
                                            <p className="mt-3 text-sm leading-6 text-slate-600">{assignment.notes}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        <form onSubmit={handleSaveProject} className="p-6 sm:p-7">
                            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">
                                        {editingProject ? 'Ubah Proyek' : 'Tambah Proyek Baru'}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Siapkan ringkasan proyek dan pilih trainer yang akan mengerjakannya.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    aria-label="Tutup modal"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                                <div className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama Proyek</label>
                                            <input
                                                required
                                                value={form.title}
                                                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                                placeholder="Contoh: Persiapan ISO 9001 PT Maju"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Klien / Perusahaan</label>
                                            <input
                                                value={form.client_name}
                                                onChange={(event) => setForm((current) => ({ ...current, client_name: event.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                                placeholder="Nama klien"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
                                            <select
                                                value={form.status}
                                                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Project['status'] }))}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="planning">Perencanaan</option>
                                                <option value="active">Aktif</option>
                                                <option value="on_hold">Ditunda</option>
                                                <option value="completed">Selesai</option>
                                                <option value="cancelled">Dibatalkan</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Prioritas</label>
                                            <select
                                                value={form.priority}
                                                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Project['priority'] }))}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
                                            >
                                                <option value="low">Rendah</option>
                                                <option value="medium">Menengah</option>
                                                <option value="high">Tinggi</option>
                                                <option value="urgent">Mendesak</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tanggal Mulai</label>
                                            <input
                                                type="date"
                                                value={form.start_date}
                                                onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Target Selesai</label>
                                            <input
                                                type="date"
                                                value={form.due_date}
                                                onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Pelatihan Terkait</label>
                                        <select
                                            value={form.related_course}
                                            onChange={(event) => setForm((current) => ({ ...current, related_course: event.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
                                        >
                                            <option value="">Tanpa pelatihan terkait</option>
                                            {courses.map((course) => (
                                                <option key={course.id} value={course.id}>
                                                    {course.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Deskripsi Proyek</label>
                                        <textarea
                                            rows={4}
                                            value={form.description}
                                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                            placeholder="Gambaran singkat proyek, tujuan, dan konteks klien."
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Luaran Proyek</label>
                                        <textarea
                                            rows={4}
                                            value={form.deliverables}
                                            onChange={(event) => setForm((current) => ({ ...current, deliverables: event.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                            placeholder="Contoh: gap analysis, training awareness, review dokumen, simulasi audit."
                                        />
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Pilih Trainer</h3>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Pilih trainer dari dropdown, lalu tambahkan ke daftar penugasan proyek ini.
                                            </p>
                                        </div>
                                        <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-white px-3 py-2 shadow-sm">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            <span className="text-xs font-semibold text-slate-500">Trainer dipilih</span>
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                                                {form.assigned_instructor_ids.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-4">
                                        <div className="flex flex-col gap-3 sm:flex-row">
                                            <select
                                                value={form.selected_instructor_id}
                                                onChange={(event) => setForm((current) => ({ ...current, selected_instructor_id: event.target.value }))}
                                                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400"
                                            >
                                                <option value="">Pilih trainer untuk ditugaskan</option>
                                                {instructors.map((instructor) => (
                                                    <option key={instructor.id} value={instructor.id}>
                                                        {instructor.name} - {instructor.title}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={handleAddSelectedInstructor}
                                                disabled={!form.selected_instructor_id}
                                                className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60"
                                            >
                                                Tambahkan
                                            </button>
                                        </div>

                                        <div className="max-h-[340px] space-y-3 overflow-y-auto pr-1">
                                            {selectedInstructors.length === 0 ? (
                                                <div className="rounded-2xl border border-dashed border-amber-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                                                    Belum ada trainer yang dipilih.
                                                </div>
                                            ) : selectedInstructors.map((instructor) => (
                                                <div
                                                    key={instructor.id}
                                                    className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="truncate font-bold text-slate-900">{instructor.name}</p>
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                    Terpilih
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-sm text-slate-500">{instructor.title}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveInstructor(instructor.id)}
                                                            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                            Hapus
                                                        </button>
                                                    </div>
                                                    {instructor.bio && (
                                                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{instructor.bio}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60"
                                >
                                    <Save className="h-4 w-4" />
                                    {saving ? 'Menyimpan...' : editingProject ? 'Simpan Perubahan' : 'Buat Proyek'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
