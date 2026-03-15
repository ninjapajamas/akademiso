'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, HelpCircle, FileText, Users, Send, AlertCircle, CheckCircle2, Edit2, Check, CalendarRange, Clock3 } from 'lucide-react';
import { CertificationExam, CertificationAlternative } from '@/types';
import { formatApiDateTimeRangeForDisplay } from '@/types/datetime';

interface ExamManagerProps {
    courseId: number;
}

type ApiErrorPayload = Record<string, string[] | string | undefined>;
type CertificationQuestionItem = NonNullable<CertificationExam['questions']>[number];

const EXAM_MODE_OPTIONS: Array<{
    value: CertificationExam['exam_mode'];
    label: string;
    description: string;
}> = [
    {
        value: 'QUESTIONS_ONLY',
        label: 'Soal Saja',
        description: 'Siswa mengerjakan soal, dan Anda tetap bisa meminta instruktur menyiapkan slot sesi pengawasan bila diperlukan.',
    },
    {
        value: 'INTERVIEW_ONLY',
        label: 'Wawancara Saja',
        description: 'Siswa memilih jadwal wawancara, lalu penilaian dilakukan dari sesi wawancara.',
    },
    {
        value: 'HYBRID',
        label: 'Soal + Wawancara',
        description: 'Siswa mengerjakan soal pada sesi yang diawasi instruktur lalu tetap wajib mengikuti wawancara.',
    },
];

function getModeMeta(mode: CertificationExam['exam_mode']) {
    return EXAM_MODE_OPTIONS.find((option) => option.value === mode) || EXAM_MODE_OPTIONS[0];
}

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

export default function ExamManager({ courseId }: ExamManagerProps) {
    const [exam, setExam] = useState<CertificationExam | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [savingQuestionId, setSavingQuestionId] = useState<number | null>(null);

    const fetchExam = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-exams/?course=${courseId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            });
            const data = await readJsonSafely<CertificationExam[]>(res);
            if (!res.ok) {
                throw new Error(getApiErrorMessage(data as ApiErrorPayload | null, 'Data ujian sertifikasi belum bisa dimuat.'));
            }

            const examList = data || [];
            if (examList.length > 0) {
                // Fetch full details including questions
                const fullRes = await fetch(`${apiUrl}/api/certification-exams/${examList[0].id}/`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
                });
                const fullData = await readJsonSafely<CertificationExam>(fullRes);
                if (!fullRes.ok || !fullData) {
                    throw new Error('Detail ujian sertifikasi belum bisa dimuat.');
                }
                setExam(fullData);
            }
        } catch (error) {
            console.error('Error fetching exam:', error);
            alert(error instanceof Error ? error.message : 'Data ujian sertifikasi belum bisa dimuat.');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        void fetchExam();
    }, [fetchExam]);

    const handleCreateExam = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-exams/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course: courseId,
                    title: `Sertifikasi - ${courseId}`,
                    description: 'Ujian untuk mendapatkan sertifikat kelulusan.',
                    exam_mode: 'QUESTIONS_ONLY',
                    tested_materials: '',
                    passing_percentage: 70,
                    is_active: false
                })
            });
            if (res.ok) {
                fetchExam();
            } else {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                alert(getApiErrorMessage(errorData, 'Ujian sertifikasi belum bisa dibuat.'));
            }
        } catch (error) {
            console.error('Error creating exam:', error);
            alert(error instanceof Error ? error.message : 'Ujian sertifikasi belum bisa dibuat.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateExam = async (updates: Partial<CertificationExam>) => {
        if (!exam) return;
        setSaving(true);
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
                setExam(prev => prev ? { ...prev, ...updates } : prev);
            } else {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                alert(getApiErrorMessage(errorData, 'Perubahan ujian belum bisa disimpan.'));
                fetchExam();
            }
        } catch (error) {
            console.error('Error updating exam:', error);
            alert(error instanceof Error ? error.message : 'Perubahan ujian belum bisa disimpan.');
        } finally {
            setSaving(false);
        }
    };

    const updateQuestionLocal = (questionId: number, updates: Partial<CertificationQuestionItem>) => {
        setExam(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                questions: (prev.questions || []).map(question => (
                    question.id === questionId ? { ...question, ...updates } : question
                ))
            };
        });
    };

    const updateAlternativeLocal = (
        questionId: number,
        alternativeId: number,
        updates: Partial<CertificationAlternative>
    ) => {
        setExam(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                questions: (prev.questions || []).map(question => {
                    if (question.id !== questionId) {
                        return question;
                    }

                    return {
                        ...question,
                        alternatives: (question.alternatives || []).map(alternative => (
                            alternative.id === alternativeId ? { ...alternative, ...updates } : alternative
                        ))
                    };
                })
            };
        });
    };

    const persistQuestion = async (questionId: number) => {
        const question = exam?.questions?.find(item => item.id === questionId);
        if (!question) return;
        if (!question.text.trim()) {
            alert('Isi komponen ujian tidak boleh kosong.');
            return;
        }

        setSavingQuestionId(questionId);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-questions/${questionId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    text: question.text,
                    order: Math.max(1, Number(question.order) || 1),
                    points: Math.max(1, Number(question.points) || 1),
                })
            });

            if (!res.ok) {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                alert(getApiErrorMessage(errorData, 'Komponen ujian belum bisa diperbarui.'));
                await fetchExam();
                return;
            }

            await fetchExam();
        } catch (error) {
            console.error('Error updating question:', error);
            alert(error instanceof Error ? error.message : 'Komponen ujian belum bisa diperbarui.');
        } finally {
            setSavingQuestionId(null);
        }
    };

    const addQuestion = async (type: 'MC' | 'Essay' | 'Interview') => {
        if (!exam) return;
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const defaultQuestionText = type === 'MC'
                ? 'Tuliskan pertanyaan pilihan ganda di sini.'
                : type === 'Essay'
                    ? 'Tuliskan instruksi atau pertanyaan essay di sini.'
                    : 'Tuliskan panduan atau topik wawancara di sini.';
            const res = await fetch(`${apiUrl}/api/certification-questions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    exam: exam.id,
                    question_type: type,
                    text: defaultQuestionText,
                    order: Math.max(0, ...(exam.questions || []).map(question => question.order || 0)) + 1,
                    points: type === 'MC' ? 5 : (type === 'Essay' ? 20 : 50)
                })
            });
            if (res.ok) {
                const newQuestion = await readJsonSafely<{ id: number }>(res);
                if (!newQuestion) {
                    throw new Error('Pertanyaan baru belum bisa dibuat.');
                }
                if (type === 'MC') {
                    // Add default options for MC
                    const options = ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'];
                    for (const optText of options) {
                        await fetch(`${apiUrl}/api/certification-alternatives/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                question: newQuestion.id,
                                text: optText,
                                is_correct: optText === 'Pilihan A'
                            })
                        });
                    }
                }
                fetchExam();
            } else {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                alert(getApiErrorMessage(errorData, 'Komponen ujian belum bisa ditambahkan.'));
            }
        } catch (error) {
            console.error('Error adding question:', error);
            alert(error instanceof Error ? error.message : 'Komponen ujian belum bisa ditambahkan.');
        }
    };

    const addAlternative = async (questionId: number) => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-alternatives/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: questionId,
                    text: 'Pilihan baru...',
                    is_correct: false
                })
            });
            if (!res.ok) {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                alert(getApiErrorMessage(errorData, 'Pilihan jawaban belum bisa ditambahkan.'));
                return;
            }
            fetchExam();
        } catch (error) {
            console.error('Error adding alternative:', error);
            alert(error instanceof Error ? error.message : 'Pilihan jawaban belum bisa ditambahkan.');
        }
    };

    const updateAlternative = async (altId: number, updates: Partial<CertificationAlternative>) => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            await fetch(`${apiUrl}/api/certification-alternatives/${altId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            // Update local state for immediate feedback if needed, or just refetch
            fetchExam();
        } catch (error) {
            console.error('Error updating alternative:', error);
            alert(error instanceof Error ? error.message : 'Pilihan jawaban belum bisa diperbarui.');
        }
    };

    const deleteAlternative = async (altId: number) => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            await fetch(`${apiUrl}/api/certification-alternatives/${altId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchExam();
        } catch (error) {
            console.error('Error deleting alternative:', error);
            alert(error instanceof Error ? error.message : 'Pilihan jawaban belum bisa dihapus.');
        }
    };

    const requestAvailability = async () => {
        if (!exam) return;
        setRequesting(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-exams/${exam.id}/request_instructor_availability/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                alert('Permintaan kesediaan jadwal telah dikirim ke Instruktur.');
                fetchExam();
            } else {
                const errorData = await readJsonSafely<ApiErrorPayload>(res);
                alert(getApiErrorMessage(errorData, 'Permintaan jadwal belum bisa dikirim.'));
            }
        } catch (error) {
            console.error('Error requesting availability:', error);
            alert(error instanceof Error ? error.message : 'Permintaan jadwal belum bisa dikirim.');
        } finally {
            setRequesting(false);
        }
    };

    if (loading) return <div>Memuat data ujian...</div>;

    if (!exam) {
        return (
            <div className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-200 text-center">
                <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">Belum Ada Ujian Sertifikasi</h3>
                <p className="text-gray-500 mb-6">Buat ujian untuk memungkinkan siswa mendapatkan sertifikat setelah menyelesaikan kursus ini.</p>
                <button
                    onClick={handleCreateExam}
                    disabled={saving}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition"
                >
                    Buat Ujian Sekarang
                </button>
            </div>
        );
    }

    const modeMeta = getModeMeta(exam.exam_mode);
    const canAddWrittenQuestions = exam.exam_mode !== 'INTERVIEW_ONLY';
    const canAddInterviewComponent = exam.exam_mode !== 'QUESTIONS_ONLY';
    const sortedQuestions = [...(exam.questions || [])].sort((left, right) => {
        const orderDelta = (left.order || 0) - (right.order || 0);
        if (orderDelta !== 0) return orderDelta;
        return left.id - right.id;
    });

    return (
        <div className="space-y-6">
            {/* Exam Header */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
                <div className="flex-1 space-y-4">
                    <div className="group relative">
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 ml-1">Judul Sertifikasi</label>
                        <div className="flex items-center gap-2">
                            <input
                                className="text-2xl font-bold text-gray-900 w-full bg-gray-50/50 hover:bg-gray-100 px-4 py-2 rounded-xl transition border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none"
                                value={exam.title}
                                placeholder="Contoh: Sertifikasi Keahlian ISO 9001"
                                onChange={(e) => setExam({ ...exam, title: e.target.value })}
                                onBlur={() => handleUpdateExam({ title: exam.title })}
                            />
                            <Edit2 className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition" />
                        </div>
                    </div>
                    <div className="group relative">
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 ml-1">Deskripsi Sertifikasi</label>
                        <div className="flex items-start gap-2">
                            <textarea
                                className="text-sm text-gray-600 w-full bg-gray-50/50 hover:bg-gray-100 px-4 py-3 rounded-xl transition border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none min-h-[80px]"
                                value={exam.description}
                                placeholder="Berikan penjelasan singkat mengenai manfaat sertifikasi ini..."
                                onChange={(e) => setExam({ ...exam, description: e.target.value })}
                                onBlur={() => handleUpdateExam({ description: exam.description })}
                            />
                            <Edit2 className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 mt-3 transition" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black ${exam.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                        {exam.is_active ? 'AKTIF' : 'DRAFT'}
                    </div>
                    <button
                        onClick={() => handleUpdateExam({ is_active: !exam.is_active })}
                        className={`text-sm font-bold px-4 py-2 rounded-lg transition ${exam.is_active ? 'text-red-600 border border-red-100 hover:bg-red-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    >
                        {exam.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr,1fr] gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Mode Ujian</p>
                        <h4 className="font-bold text-gray-900">Tentukan cara siswa mengikuti sertifikasi</h4>
                        <p className="text-sm text-gray-500 mt-1">{modeMeta.description}</p>
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

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Materi yang Diujikan</p>
                        <h4 className="font-bold text-gray-900">Kompetensi atau topik yang akan dinilai</h4>
                    </div>
                    <textarea
                        value={exam.tested_materials || ''}
                        placeholder="Contoh: Interpretasi klausul ISO 9001, audit temuan mayor/minor, simulasi wawancara implementasi."
                        onChange={(e) => setExam({ ...exam, tested_materials: e.target.value })}
                        onBlur={() => handleUpdateExam({ tested_materials: exam.tested_materials || '' })}
                        className="min-h-[180px] w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-300 focus:bg-white"
                    />
                    <p className="text-xs text-gray-500">
                        Bagian ini membantu admin, instruktur, dan siswa memahami apa saja yang diuji, terlepas dari bentuk ujiannya.
                    </p>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            Persentase Kelulusan
                        </label>
                        <div className="mt-3 flex items-center gap-3">
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={exam.passing_percentage ?? 70}
                                onChange={(e) => {
                                    const nextValue = Number(e.target.value);
                                    setExam({
                                        ...exam,
                                        passing_percentage: Number.isFinite(nextValue) ? nextValue : 70,
                                    });
                                }}
                                onBlur={(e) => {
                                    const rawValue = Number(e.target.value);
                                    const normalizedValue = Math.min(100, Math.max(1, Number.isFinite(rawValue) ? rawValue : 70));
                                    setExam(prev => prev ? { ...prev, passing_percentage: normalizedValue } : prev);
                                    void handleUpdateExam({ passing_percentage: normalizedValue });
                                }}
                                className="w-28 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            />
                            <span className="text-sm font-semibold text-emerald-900">% jawaban benar minimal</span>
                        </div>
                        <p className="mt-2 text-xs text-emerald-800">
                            Sertifikat hanya akan diproses jika skor otomatis peserta mencapai minimal {exam.passing_percentage ?? 70}%.
                        </p>
                    </div>
                </div>
            </div>

            {/* Instructor Confirmation Section */}
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl flex items-center justify-between">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-indigo-900">Konfirmasi Instruktur</h4>
                        <p className="text-sm text-indigo-700 mt-1">
                            {exam.instructor_confirmed
                                ? (exam.exam_mode === 'QUESTIONS_ONLY'
                                    ? 'Instruktur telah mengonfirmasi periode ujian untuk siswa.'
                                    : 'Instruktur telah mengonfirmasi periode ujian dan menyiapkan beberapa slot sesi.')
                                : (exam.exam_mode === 'QUESTIONS_ONLY'
                                    ? 'Minta instruktur mengunci periode ujian dan, jika perlu, menyiapkan slot sesi pengawasan.'
                                    : 'Minta instruktur mengisi beberapa slot sesi sesuai mode ujian ini.')}
                        </p>
                    </div>
                </div>
                <button
                    onClick={requestAvailability}
                    disabled={requesting || exam.instructor_confirmed}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition ${exam.instructor_confirmed
                        ? 'bg-green-600 text-white'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                >
                    {exam.instructor_confirmed ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    {exam.instructor_confirmed ? 'Sudah Dikonfirmasi' : (requesting ? 'Mengirim...' : 'Minta Jadwal')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <CalendarRange className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Jadwal Ujian</p>
                            <h4 className="font-bold text-gray-900">Rentang yang dikonfirmasi instruktur</h4>
                        </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                        {formatApiDateTimeRangeForDisplay(exam.confirmed_start_at, exam.confirmed_end_at)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                        {exam.exam_mode === 'QUESTIONS_ONLY'
                            ? 'Siswa hanya bisa mulai mengerjakan soal pada rentang waktu ini.'
                            : 'Rentang ini menjadi jadwal umum sertifikasi. Slot sesi detail diatur terpisah oleh instruktur.'}
                    </p>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Clock3 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Status Publikasi</p>
                            <h4 className="font-bold text-gray-900">Kesiapan untuk siswa</h4>
                        </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                        {exam.is_active
                            ? exam.instructor_confirmed
                                ? 'Aktif dan siap dibuka sesuai jadwal'
                                : 'Aktif, tetapi masih menunggu konfirmasi instruktur'
                            : 'Masih draft dan belum bisa diikuti siswa'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                        {exam.exam_mode === 'QUESTIONS_ONLY'
                            ? 'Mode ini fokus pada soal tertulis, tetapi instruktur tetap bisa menyiapkan slot sesi pengawasan.'
                            : 'Mode ini memerlukan pengaturan beberapa slot sesi dari instruktur.'}
                    </p>
                </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        Komponen Ujian
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{sortedQuestions.length}</span>
                    </h3>
                    <div className="flex gap-2">
                        {canAddWrittenQuestions && (
                            <button onClick={() => addQuestion('MC')} className="flex items-center gap-2 bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
                                <Plus className="w-4 h-4" /> Pilihan Ganda
                            </button>
                        )}
                        {canAddWrittenQuestions && (
                            <button onClick={() => addQuestion('Essay')} className="flex items-center gap-2 bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
                                <Plus className="w-4 h-4" /> Isian (Essay)
                            </button>
                        )}
                        {canAddInterviewComponent && (
                            <button onClick={() => addQuestion('Interview')} className="flex items-center gap-2 bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
                                <Plus className="w-4 h-4" /> Wawancara
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    {exam.exam_mode === 'QUESTIONS_ONLY' && 'Tambahkan soal yang akan dikerjakan siswa. Jika ujian diawasi, instruktur juga bisa menyiapkan slot sesi.'}
                    {exam.exam_mode === 'INTERVIEW_ONLY' && 'Tambahkan komponen wawancara untuk menjelaskan alur sesi. Jadwal dipilih siswa dari slot yang disediakan instruktur.'}
                    {exam.exam_mode === 'HYBRID' && 'Anda bisa menggabungkan soal tertulis dan komponen wawancara dalam satu sertifikasi, dengan slot sesi dari instruktur.'}
                </div>

                {sortedQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <span className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold shadow-indigo-200 shadow-lg">{idx + 1}</span>
                                    <div className="space-y-1">
                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider w-fit ${q.question_type === 'MC' ? 'bg-blue-100 text-blue-700' :
                                            q.question_type === 'Essay' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {q.question_type === 'MC' ? <HelpCircle className="w-3 h-3" /> : (q.question_type === 'Essay' ? <FileText className="w-3 h-3" /> : <Users className="w-3 h-3" />)}
                                            {q.question_type === 'MC' ? 'PILIHAN GANDA' : (q.question_type === 'Essay' ? 'ESAI / ISIAN' : 'WAWANCARA')}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={async () => {
                                    if (!confirm('Hapus pertanyaan ini?')) return;
                                    try {
                                        const token = localStorage.getItem('access_token');
                                        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                                        await fetch(`${apiUrl}/api/certification-questions/${q.id}/`, {
                                            method: 'DELETE',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        fetchExam();
                                    } catch (error) {
                                        console.error('Error deleting question:', error);
                                    }
                                }} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr),140px,140px]">
                                <label className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ringkasan Komponen</span>
                                    <p className="mt-2 text-sm font-semibold text-gray-700">
                                        Atur isi komponen, bobot poin, dan urutannya sebelum dipublikasikan ke siswa.
                                    </p>
                                </label>
                                <label className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Urutan</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={q.order}
                                        onChange={(e) => updateQuestionLocal(q.id, { order: Math.max(1, Number(e.target.value) || 1) })}
                                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                    />
                                </label>
                                <label className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bobot Poin</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={q.points}
                                        onChange={(e) => updateQuestionLocal(q.id, { points: Math.max(1, Number(e.target.value) || 1) })}
                                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                    />
                                </label>
                            </div>
                            <textarea
                                className="w-full text-gray-900 border-none focus:ring-0 p-4 bg-gray-50 rounded-xl mb-6 resize-none font-semibold placeholder:text-gray-300 leading-relaxed text-base min-h-[100px] border-2 border-transparent focus:border-indigo-100 focus:bg-white transition"
                                value={q.text}
                                placeholder="Tuliskan isi pertanyaan di sini secara lengkap..."
                                onChange={(e) => updateQuestionLocal(q.id, { text: e.target.value })}
                            />

                            <div className="mb-6 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => persistQuestion(q.id)}
                                    disabled={savingQuestionId === q.id}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {savingQuestionId === q.id ? 'Menyimpan Komponen...' : 'Simpan Komponen'}
                                </button>
                            </div>

                            {q.question_type === 'MC' && (
                                <div className="space-y-3 ml-4">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Pilihan Jawaban</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {q.alternatives?.map((alt) => (
                                            <div key={alt.id} className="flex items-center gap-3 bg-white p-1 pr-3 rounded-2xl border border-gray-100 group">
                                                <button
                                                    onClick={() => updateAlternative(alt.id, { is_correct: !alt.is_correct })}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition shadow-sm ${alt.is_correct ? 'bg-green-600 text-white shadow-green-100' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'}`}
                                                >
                                                    <Check className="w-5 h-5" />
                                                </button>
                                                <input
                                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 p-2"
                                                    value={alt.text}
                                                    onChange={(e) => updateAlternativeLocal(q.id, alt.id, { text: e.target.value })}
                                                    onBlur={() => updateAlternative(alt.id, { text: alt.text })}
                                                />
                                                <button
                                                    onClick={() => deleteAlternative(alt.id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => addAlternative(q.id)}
                                        className="mt-4 flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl text-xs font-bold transition"
                                    >
                                        <Plus className="w-3 h-3" /> Tambah Pilihan Jawaban
                                    </button>
                                </div>
                            )}

                            {q.question_type === 'Interview' && (
                                <div className="flex items-center gap-3 bg-purple-50 p-4 rounded-2xl text-purple-700 text-xs font-bold border border-purple-100">
                                    <AlertCircle className="w-5 h-5" />
                                    <span>Instruksi: Siswa akan diminta memilih slot sesi yang telah disediakan oleh instruktur untuk bagian wawancara ini.</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
