'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Clock, Video, CheckCircle2, AlertCircle, Send, Edit2, CalendarRange } from 'lucide-react';
import { CertificationExam, CertificationInstructorSlot } from '@/types';
import { formatApiDateTimeForDisplay, formatApiDateTimeForInput, formatApiDateTimeRangeForDisplay, formatInputDateTimeForApi, normalizeDateTimeInputToStartOfDay } from '@/types/datetime';

interface InstructorExamManagerProps {
    courseId: number;
    refreshKey?: number;
}

type ApiErrorPayload = Record<string, string[] | string | undefined>;

const EXAM_MODE_OPTIONS: Array<{
    value: CertificationExam['exam_mode'];
    label: string;
    description: string;
}> = [
    {
        value: 'QUESTIONS_ONLY',
        label: 'Soal Saja',
        description: 'Ujian hanya berupa soal, tetapi Anda tetap bisa menyediakan slot sesi jika perlu mengawasi peserta.',
    },
    {
        value: 'INTERVIEW_ONLY',
        label: 'Wawancara Saja',
        description: 'Siswa memilih salah satu slot sesi wawancara yang Anda sediakan.',
    },
    {
        value: 'HYBRID',
        label: 'Soal + Wawancara',
        description: 'Siswa mengerjakan soal pada slot sesi yang diawasi lalu tetap wajib mengikuti wawancara.',
    },
];

async function readJsonSafely<T>(res: Response): Promise<T | null> {
    const text = await res.text();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(
            text.startsWith('<!DOCTYPE')
                ? 'Server mengembalikan halaman HTML, bukan JSON. Biasanya ini terjadi karena endpoint sedang error atau migration backend belum dijalankan.'
                : 'Respons server tidak valid.'
        );
    }
}

function getApiErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
    if (!payload) {
        return fallback;
    }

    const firstValue = Object.values(payload)[0];
    if (Array.isArray(firstValue)) {
        return firstValue[0] || fallback;
    }

    if (typeof firstValue === 'string') {
        return firstValue;
    }

    return fallback;
}

export default function InstructorExamManager({ courseId, refreshKey = 0 }: InstructorExamManagerProps) {
    const [exam, setExam] = useState<CertificationExam | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);

    const fetchExam = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-exams/?course=${courseId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            });
            const data = await readJsonSafely<CertificationExam[]>(res);
            if (!res.ok) {
                throw new Error(getApiErrorMessage(data as ApiErrorPayload | null, 'Data ujian akhir belum bisa dimuat.'));
            }

            const examList = data || [];
            if (examList.length > 0) {
                // Fetch full details including slots
                const fullRes = await fetch(`${apiUrl}/api/certification-exams/${examList[0].id}/`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
                });
                const fullData = await readJsonSafely<CertificationExam>(fullRes);
                if (!fullRes.ok || !fullData) {
                    throw new Error('Detail ujian akhir belum bisa dimuat.');
                }
                setExam(fullData);
            }
        } catch (error) {
            console.error('Error fetching exam:', error);
            alert(error instanceof Error ? error.message : 'Data ujian akhir belum bisa dimuat.');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        void fetchExam();
    }, [fetchExam, refreshKey]);

    const handleUpdateExam = async (updates: Partial<CertificationExam>) => {
        if (!exam) return;
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-exams/${exam.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                setExam({ ...exam, ...updates });
            } else {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                alert(getApiErrorMessage(errorData, 'Perubahan ujian belum bisa disimpan.'));
                fetchExam();
            }
        } catch (error) {
            console.error('Error updating exam:', error);
            alert(error instanceof Error ? error.message : 'Perubahan ujian belum bisa disimpan.');
        }
    };

    const confirmAvailability = async () => {
        if (!exam) return;
        setConfirming(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-exams/${exam.id}/confirm_availability/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                alert('Jadwal telah dikonfirmasi.');
                fetchExam();
            } else {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                alert(getApiErrorMessage(errorData, 'Jadwal belum bisa dikonfirmasi.'));
            }
        } catch (error) {
            console.error('Error confirming availability:', error);
            alert(error instanceof Error ? error.message : 'Jadwal belum bisa dikonfirmasi.');
        } finally {
            setConfirming(false);
        }
    };

    const addSlot = async () => {
        if (!exam) return;
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-slots/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    exam: exam.id,
                    date: new Date().toISOString().split('T')[0],
                    start_time: '09:00',
                    end_time: '10:00',
                    zoom_link: ''
                })
            });
            if (res.ok) {
                fetchExam();
            } else {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                alert(getApiErrorMessage(errorData, 'Slot belum bisa ditambahkan.'));
            }
        } catch (error) {
            console.error('Error adding slot:', error);
            alert(error instanceof Error ? error.message : 'Slot belum bisa ditambahkan.');
        }
    };

    const updateSlot = async (slotId: number, updates: Partial<CertificationInstructorSlot>) => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            await fetch(`${apiUrl}/api/certification-slots/${slotId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            fetchExam();
        } catch (error) {
            console.error('Error updating slot:', error);
            alert(error instanceof Error ? error.message : 'Slot belum bisa diperbarui.');
        }
    };

    const deleteSlot = async (slotId: number) => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            await fetch(`${apiUrl}/api/certification-slots/${slotId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchExam();
        } catch (error) {
            console.error('Error deleting slot:', error);
            alert(error instanceof Error ? error.message : 'Slot belum bisa dihapus.');
        }
    };

    if (loading) return <div>Memuat data ujian akhir...</div>;

    if (!exam) return null;

    const canConfirmSchedule = Boolean(exam.confirmed_start_at)
        && (
            !exam.confirmed_end_at
            || (exam.confirmed_start_at
                ? new Date(exam.confirmed_end_at) >= new Date(exam.confirmed_start_at)
                : false)
        );
    const requiresInterview = exam.exam_mode !== 'QUESTIONS_ONLY';

    return (
        <div className="space-y-8 bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                        Jadwal Ujian Akhir
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Atur periode dan slot sesi ujian akhir yang diawasi instruktur.</p>
                </div>
                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest ${exam.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                    {exam.is_active ? 'STATUS: AKTIF' : 'STATUS: DRAFT'}
                </div>
            </div>

            {/* Exam Details for Instructor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group relative">
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 ml-1">Nama Ujian Akhir</label>
                    <div className="flex items-center gap-2">
                        <input
                            className="w-full bg-gray-50/50 hover:bg-gray-100 px-4 py-2.5 rounded-xl transition border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none font-bold text-gray-900"
                            value={exam.title}
                            onChange={(e) => setExam({ ...exam, title: e.target.value })}
                            onBlur={() => handleUpdateExam({ title: exam.title })}
                        />
                        <Edit2 className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />
                    </div>
                </div>
                <div className="group relative">
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 ml-1">Deskripsi</label>
                    <div className="flex items-center gap-2">
                        <input
                            className="w-full bg-gray-50/50 hover:bg-gray-100 px-4 py-2.5 rounded-xl transition border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-sm text-gray-600"
                            value={exam.description}
                            onChange={(e) => setExam({ ...exam, description: e.target.value })}
                            onBlur={() => handleUpdateExam({ description: exam.description })}
                        />
                        <Edit2 className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr,1fr] gap-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Mode Ujian</p>
                        <h4 className="font-bold text-gray-900 mt-2">Sesuaikan format pelaksanaan</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {EXAM_MODE_OPTIONS.map((option) => {
                            const isSelected = exam.exam_mode === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        setExam({ ...exam, exam_mode: option.value });
                                        handleUpdateExam({ exam_mode: option.value });
                                    }}
                                    className={`rounded-2xl border p-4 text-left transition ${
                                        isSelected
                                            ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                            : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <p className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>{option.label}</p>
                                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{option.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Materi yang Diujikan</p>
                        <h4 className="font-bold text-gray-900 mt-2">Topik yang perlu dipahami siswa</h4>
                    </div>
                    <textarea
                        value={exam.tested_materials || ''}
                        onChange={(e) => setExam({ ...exam, tested_materials: e.target.value })}
                        onBlur={() => handleUpdateExam({ tested_materials: exam.tested_materials || '' })}
                        placeholder="Contoh: simulasi audit, studi kasus temuan, interpretasi klausul, presentasi implementasi."
                        className="min-h-[180px] w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-300 focus:bg-white"
                    />
                </div>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-100 rounded-[1.75rem] p-6 space-y-5">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-sm">
                        <CalendarRange className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-indigo-950">Jadwal Ujian Akhir untuk Siswa</h4>
                        <p className="text-sm text-indigo-700 mt-1">
                            {requiresInterview
                                ? 'Tentukan periode umum ujian akhir, lalu sediakan beberapa slot sesi untuk soal dan/atau wawancara sesuai kebutuhan.'
                                : 'Tentukan kapan ujian soal dibuka. Bila perlu pengawasan, Anda juga bisa menambahkan beberapa slot sesi.'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <label className="bg-white rounded-2xl border border-indigo-100 p-4 space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Tanggal Mulai Ujian</span>
                        <input
                            type="datetime-local"
                            value={formatApiDateTimeForInput(exam.confirmed_start_at)}
                            onChange={(e) => {
                                const value = formatInputDateTimeForApi(normalizeDateTimeInputToStartOfDay(e.target.value));
                                setExam({ ...exam, confirmed_start_at: value });
                            }}
                            onBlur={(e) => handleUpdateExam({ confirmed_start_at: formatInputDateTimeForApi(normalizeDateTimeInputToStartOfDay(e.target.value)) })}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-gray-800"
                        />
                        <p className="text-xs text-gray-500">Mulai dari waktu ini siswa boleh membuka attempt ujian.</p>
                    </label>

                    <label className="bg-white rounded-2xl border border-indigo-100 p-4 space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Tanggal Selesai Ujian</span>
                        <input
                            type="datetime-local"
                            value={formatApiDateTimeForInput(exam.confirmed_end_at)}
                            onChange={(e) => {
                                const value = formatInputDateTimeForApi(normalizeDateTimeInputToStartOfDay(e.target.value));
                                setExam({ ...exam, confirmed_end_at: value });
                            }}
                            onBlur={(e) => handleUpdateExam({ confirmed_end_at: formatInputDateTimeForApi(normalizeDateTimeInputToStartOfDay(e.target.value)) })}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-gray-800"
                        />
                        <p className="text-xs text-gray-500">Kosongkan bila ujian cukup punya satu waktu mulai tanpa batas akhir.</p>
                    </label>
                </div>

                <div className="bg-white rounded-2xl border border-white/80 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Ringkasan Jadwal</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                            {formatApiDateTimeRangeForDisplay(exam.confirmed_start_at, exam.confirmed_end_at)}
                        </p>
                    </div>
                    <div className="text-xs text-gray-500">
                        {exam.confirmed_start_at
                            ? `Waktu mulai: ${formatApiDateTimeForDisplay(exam.confirmed_start_at)}`
                            : 'Tanggal mulai belum diisi'}
                    </div>
                </div>
            </div>

            {/* Session Slots Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-gray-800">Slot Sesi Ujian</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Tambahkan beberapa slot bila siswa perlu memilih sesi ujian yang diawasi instruktur.</p>
                    </div>
                    <button
                        onClick={addSlot}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                    >
                        <Plus className="w-4 h-4" /> Tambah Slot
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {exam.slots?.length === 0 && (
                        <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-100">
                            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-400 font-medium">Belum ada slot sesi yang disediakan.</p>
                        </div>
                    )}
                    {exam.slots?.map((slot) => (
                            <div key={slot.id} className="flex flex-wrap items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:shadow-md">
                                <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                                    <Calendar className="w-4 h-4 text-indigo-500" />
                                    <input
                                        type="date"
                                        className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700"
                                        value={slot.date}
                                        onChange={(e) => updateSlot(slot.id, { date: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                    <Clock className="w-4 h-4 text-indigo-500" />
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="time"
                                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 p-0 w-20"
                                            value={slot.start_time.slice(0, 5)}
                                            onChange={(e) => updateSlot(slot.id, { start_time: e.target.value })}
                                        />
                                        <span className="text-gray-300">-</span>
                                        <input
                                            type="time"
                                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 p-0 w-20"
                                            value={slot.end_time.slice(0, 5)}
                                            onChange={(e) => updateSlot(slot.id, { end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-1 min-w-[250px]">
                                    <Video className="w-4 h-4 text-rose-500" />
                                    <input
                                        type="url"
                                        placeholder="Link Zoom / Meeting"
                                        className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-600 w-full"
                                        value={slot.zoom_link || ''}
                                        onChange={(e) => updateSlot(slot.id, { zoom_link: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    {slot.is_booked ? (
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">TERPESAN</span>
                                    ) : (
                                        <span className="bg-gray-200 text-gray-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">TERSEDIA</span>
                                    )}
                                    <button
                                        onClick={() => deleteSlot(slot.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Confirmation Banner */}
            <div className={`mt-8 p-6 rounded-3xl flex items-center justify-between border-2 transition-all ${exam.instructor_confirmed ? 'bg-green-50 border-green-100 text-green-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${exam.instructor_confirmed ? 'bg-white text-green-600' : 'bg-white text-amber-600'}`}>
                        {exam.instructor_confirmed ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    </div>
                    <div>
                        <h4 className="font-bold">{exam.instructor_confirmed ? 'Jadwal Sudah Dikonfirmasi' : 'Konfirmasi Jadwal Diperlukan'}</h4>
                        <p className="text-xs opacity-80 mt-1">
                            {exam.instructor_confirmed
                                ? (requiresInterview
                                    ? 'Admin dan siswa sekarang akan mengikuti periode ujian akhir yang Anda konfirmasi beserta slot sesi yang tersedia.'
                                    : 'Admin dan siswa sekarang akan mengikuti rentang tanggal ujian yang sudah Anda konfirmasi.')
                                : (requiresInterview
                                    ? 'Isi tanggal umum ujian akhir, tambahkan beberapa slot sesi, lalu konfirmasikan agar siswa bisa memilih jadwal.'
                                    : 'Isi tanggal mulai dan selesai ujian, lalu tambahkan slot sesi jika pengawasan instruktur dibutuhkan.')}
                        </p>
                    </div>
                </div>
                <button
                    onClick={confirmAvailability}
                    disabled={confirming || exam.instructor_confirmed || !canConfirmSchedule}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-md active:scale-95 ${exam.instructor_confirmed
                        ? 'bg-green-600 text-white cursor-default'
                        : canConfirmSchedule
                            ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {exam.instructor_confirmed ? <CheckCircle2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                    {exam.instructor_confirmed ? 'Telah Dikonfirmasi' : (confirming ? 'Mengirim...' : 'Konfirmasi Jadwal')}
                </button>
            </div>
        </div>
    );
}
