'use client';

import { useState, useEffect } from 'react';
import { Award, Calendar, Clock, Plus, Trash2, CheckCircle2, ChevronRight } from 'lucide-react';
import { CertificationExam, CertificationInstructorSlot } from '@/types';

export default function InstructorCertificationPage() {
    const [exams, setExams] = useState<CertificationExam[]>([]);
    const [slots, setSlots] = useState<CertificationInstructorSlot[]>([]);
    const [loading, setLoading] = useState(true);

    // New slot form
    const [newSlot, setNewSlot] = useState({
        exam: '',
        date: '',
        start_time: '',
        end_time: '',
        zoom_link: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const [examRes, slotRes] = await Promise.all([
                fetch(`${apiUrl}/api/certification-exams/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/api/certification-slots/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            setExams(await examRes.json());
            setSlots(await slotRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const res = await fetch(`${apiUrl}/api/certification-slots/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newSlot)
            });

            if (res.ok) {
                fetchData();
                setNewSlot({ exam: '', date: '', start_time: '', end_time: '', zoom_link: '' });
                alert('Slot ketersediaan berhasil ditambahkan.');
            }
        } catch (error) {
            console.error('Error adding slot:', error);
        }
    };

    const handleDeleteSlot = async (id: number) => {
        if (!confirm('Hapus slot ini?')) return;
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            await fetch(`${apiUrl}/api/certification-slots/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Error deleting slot:', error);
        }
    };

    if (loading) return <div>Memuat data ujian akhir...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Ujian Akhir</h1>
                <p className="text-gray-500">Kelola permintaan ujian dan atur slot sesi yang diawasi instruktur untuk siswa.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Exam Requests */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-600" />
                        Permintaan Ujian Aktif
                    </h2>

                    {exams.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">Belum ada permintaan ujian baru.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {exams.map(exam => (
                                <div key={exam.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded mb-2 inline-block">
                                                {exam.course_title}
                                            </span>
                                            <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{exam.description}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${exam.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {exam.is_active ? 'AKTIF' : 'NONAKTIF'}
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${exam.instructor_confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {exam.instructor_confirmed ? 'DIKONFIRMASI' : 'MENUNGGU JADWAL'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> 12 Siswa Menunggu</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 0 Slot Tersedia</span>
                                        </div>
                                        <button className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                                            Kelola Ujian <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Slot Management Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Slot Sesi Ujian
                    </h2>

                    {/* Add Slot Form */}
                    <form onSubmit={handleAddSlot} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm shadow-indigo-100/50 space-y-4">
                        <h3 className="text-sm font-bold text-gray-900">Tambah Slot Baru</h3>
                        <div>
                            <select
                                required
                                value={newSlot.exam}
                                onChange={e => setNewSlot({ ...newSlot, exam: e.target.value })}
                                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Pilih Ujian</option>
                                {exams.map(e => (
                                    <option key={e.id} value={e.id}>{e.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <input
                                type="date"
                                required
                                value={newSlot.date}
                                onChange={e => setNewSlot({ ...newSlot, date: e.target.value })}
                                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="time"
                                required
                                value={newSlot.start_time}
                                onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })}
                                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <input
                                type="time"
                                required
                                value={newSlot.end_time}
                                onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })}
                                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Tambah Slot
                        </button>
                    </form>

                    {/* Slots List */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Jadwal Anda</h3>
                        {slots.map(slot => (
                            <div key={slot.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold text-gray-500 line-clamp-1">
                                        <span className="text-gray-900">{slot.date.split('-')[2]}</span>
                                        <span>OKT</span>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-indigo-500 mb-0.5">{slot.exam_title}</div>
                                        <div className="text-sm font-bold text-gray-900">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-[10px] text-gray-400 font-medium">
                                                {slot.is_booked ? <span className="text-red-500">Terpesan</span> : 'Tersedia'}
                                            </div>
                                            {slot.zoom_link && <div className="text-[10px] text-indigo-500 font-bold truncate max-w-[100px]">{slot.zoom_link}</div>}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteSlot(slot.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {slots.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Belum ada jadwal ditambahkan.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
