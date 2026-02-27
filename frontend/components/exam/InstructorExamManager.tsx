'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Clock, Video, CheckCircle2, AlertCircle, Send, Edit2 } from 'lucide-react';
import { CertificationExam, CertificationInstructorSlot } from '@/types';

interface InstructorExamManagerProps {
    courseId: number;
}

export default function InstructorExamManager({ courseId }: InstructorExamManagerProps) {
    const [exam, setExam] = useState<CertificationExam | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        fetchExam();
    }, [courseId]);

    const fetchExam = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/certification-exams/?course=${courseId}`);
            const data = await res.json();
            if (data.length > 0) {
                // Fetch full details including slots
                const fullRes = await fetch(`${apiUrl}/api/certification-exams/${data[0].id}/`);
                setExam(await fullRes.json());
            }
        } catch (error) {
            console.error('Error fetching exam:', error);
        } finally {
            setLoading(false);
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
            }
        } catch (error) {
            console.error('Error confirming availability:', error);
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
            }
        } catch (error) {
            console.error('Error adding slot:', error);
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
        }
    };

    if (loading) return <div>Memuat data sertifikasi...</div>;

    if (!exam) return null;

    return (
        <div className="space-y-8 bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                        Manajemen Sertifikasi
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Kelola detail ujian sertifikasi dan jadwal wawancara.</p>
                </div>
                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest ${exam.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                    {exam.is_active ? 'STATUS: AKTIF' : 'STATUS: DRAFT'}
                </div>
            </div>

            {/* Exam Details for Instructor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group relative">
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 ml-1">Nama Sertifikasi</label>
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

            {/* Interview Slots Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-gray-800">Jadwal Wawancara</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Sediakan slot waktu untuk wawancara dengan siswa.</p>
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
                            <p className="text-sm text-gray-400 font-medium">Belum ada slot waktu yang disediakan.</p>
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
                                ? 'Admin dapat melihat bahwa Anda telah menyediakan jadwal untuk ujian ini.'
                                : 'Klik tombol di samping jika Anda sudah selesai mengatur jadwal wawancara.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={confirmAvailability}
                    disabled={confirming || exam.instructor_confirmed}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-md active:scale-95 ${exam.instructor_confirmed
                        ? 'bg-green-600 text-white cursor-default'
                        : 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200'
                        }`}
                >
                    {exam.instructor_confirmed ? <CheckCircle2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                    {exam.instructor_confirmed ? 'Telah Dikonfirmasi' : (confirming ? 'Mengirim...' : 'Konfirmasi Sekarang')}
                </button>
            </div>
        </div>
    );
}
