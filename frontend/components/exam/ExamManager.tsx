'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, HelpCircle, FileText, Users, Send, AlertCircle, CheckCircle2, Edit2, Check } from 'lucide-react';
import { CertificationExam, CertificationQuestion, CertificationAlternative } from '@/types';

interface ExamManagerProps {
    courseId: number;
}

export default function ExamManager({ courseId }: ExamManagerProps) {
    const [exam, setExam] = useState<CertificationExam | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        fetchExam();
    }, [courseId]);

    const fetchExam = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-exams/?course=${courseId}`);
            const data = await res.json();
            if (data.length > 0) {
                // Fetch full details including questions
                const fullRes = await fetch(`${apiUrl}/api/certification-exams/${data[0].id}/`);
                setExam(await fullRes.json());
            }
        } catch (error) {
            console.error('Error fetching exam:', error);
        } finally {
            setLoading(false);
        }
    };

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
                    is_active: false
                })
            });
            if (res.ok) {
                fetchExam();
            }
        } catch (error) {
            console.error('Error creating exam:', error);
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
                setExam({ ...exam, ...updates });
            }
        } catch (error) {
            console.error('Error updating exam:', error);
        } finally {
            setSaving(false);
        }
    };

    const addQuestion = async (type: 'MC' | 'Essay' | 'Interview') => {
        if (!exam) return;
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-questions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    exam: exam.id,
                    question_type: type,
                    text: '',
                    order: (exam.questions?.length || 0) + 1,
                    points: type === 'MC' ? 5 : (type === 'Essay' ? 20 : 50)
                })
            });
            if (res.ok) {
                const newQuestion = await res.json();
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
            }
        } catch (error) {
            console.error('Error adding question:', error);
        }
    };

    const addAlternative = async (questionId: number) => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            await fetch(`${apiUrl}/api/certification-alternatives/`, {
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
            fetchExam();
        } catch (error) {
            console.error('Error adding alternative:', error);
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
            }
        } catch (error) {
            console.error('Error requesting availability:', error);
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
                                ? 'Instruktur telah mengonfirmasi jadwal (Slot tersedia).'
                                : 'Minta instruktur untuk menentukan jadwal wawancara jika ada.'}
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

            {/* Questions List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        Daftar Pertanyaan
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{(exam.questions?.length || 0)}</span>
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={() => addQuestion('MC')} className="flex items-center gap-2 bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
                            <Plus className="w-4 h-4" /> Pilihan Ganda
                        </button>
                        <button onClick={() => addQuestion('Essay')} className="flex items-center gap-2 bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
                            <Plus className="w-4 h-4" /> Isian (Essay)
                        </button>
                        <button onClick={() => addQuestion('Interview')} className="flex items-center gap-2 bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
                            <Plus className="w-4 h-4" /> Wawancara
                        </button>
                    </div>
                </div>

                {exam.questions?.map((q, idx) => (
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
                            <textarea
                                className="w-full text-gray-900 border-none focus:ring-0 p-4 bg-gray-50 rounded-xl mb-6 resize-none font-semibold placeholder:text-gray-300 leading-relaxed text-base min-h-[100px] border-2 border-transparent focus:border-indigo-100 focus:bg-white transition"
                                value={q.text}
                                placeholder="Tuliskan isi pertanyaan di sini secara lengkap..."
                                onChange={(e) => {
                                    const newQuestions = [...(exam.questions || [])];
                                    newQuestions[idx] = { ...q, text: e.target.value };
                                    setExam({ ...exam, questions: newQuestions });
                                }}
                                onBlur={async () => {
                                    try {
                                        const token = localStorage.getItem('access_token');
                                        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                                        await fetch(`${apiUrl}/api/certification-questions/${q.id}/`, {
                                            method: 'PATCH',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify({ text: q.text })
                                        });
                                    } catch (error) {
                                        console.error('Error updating question:', error);
                                    }
                                }}
                            />

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
                                                    onChange={(e) => {
                                                        const newQuestions = [...(exam.questions || [])];
                                                        const altIdx = q.alternatives?.findIndex(a => a.id === alt.id);
                                                        if (altIdx !== undefined && altIdx !== -1) {
                                                            newQuestions[idx].alternatives![altIdx] = { ...alt, text: e.target.value };
                                                            setExam({ ...exam, questions: newQuestions });
                                                        }
                                                    }}
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
                                    <span>Instruksi: Siswa akan diminta memilih slot waktu wawancara yang telah disediakan oleh instruktur untuk menjawab bagian ini.</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
