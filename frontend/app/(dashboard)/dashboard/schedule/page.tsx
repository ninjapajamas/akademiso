'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

// Realistic schedule data
const SCHEDULES = [
    {
        id: 1,
        course: 'ISO 9001:2015 Manajemen Mutu',
        type: 'Ujian Sertifikasi',
        date: '2026-03-15',
        time: '09:00 – 12:00 WIB',
        location: 'Pusat Pengujian Akademiso, Jakarta Selatan',
        status: 'upcoming',
        instructor: 'Dr. Budi Santoso',
        notes: 'Harap membawa KTP asli dan 2 lembar fotokopi. Ujian berbasis komputer (CBT).',
    },
    {
        id: 2,
        course: 'ISO 27001:2022 Keamanan Informasi',
        type: 'Kelas Intensif – Hari 2',
        date: '2026-03-22',
        time: '08:00 – 17:00 WIB',
        location: 'Zoom Meeting (Online)',
        status: 'upcoming',
        instructor: 'Sarah Wijaya, CISA',
        notes: 'Link zoom akan dikirim H-1 melalui email. Siapkan laptop dan koneksi stabil.',
    },
    {
        id: 3,
        course: 'Audit Internal ISO 19011',
        type: 'Workshop Praktek',
        date: '2026-04-05',
        time: '09:00 – 15:00 WIB',
        location: 'Gedung Graha ISO, Lantai 7, Bandung',
        status: 'upcoming',
        instructor: 'Ahmad Fauzi, CQA',
        notes: 'Parkir tersedia. Makan siang disediakan panitia.',
    },
    {
        id: 4,
        course: 'ISO 14001:2015 Manajemen Lingkungan',
        type: 'Ujian Sertifikasi',
        date: '2026-01-18',
        time: '09:00 – 12:00 WIB',
        location: 'Pusat Pengujian Akademiso, Jakarta Selatan',
        status: 'completed',
        instructor: 'Dr. Rina Handayani',
        notes: 'Selesai. Sertifikat siap diunduh.',
    },
    {
        id: 5,
        course: 'ISO 45001:2018 Keselamatan Kerja',
        type: 'Kelas Orientasi',
        date: '2026-02-10',
        time: '13:00 – 17:00 WIB',
        location: 'Zoom Meeting (Online)',
        status: 'completed',
        instructor: 'Ir. Hendra Gunawan',
        notes: 'Selesai. Rekaman tersedia di portal.',
    },
];

const MONTHS: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agu',
    '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des',
};

function parseDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-');
    return { year: y, month: MONTHS[m], day: d };
}

export default function SchedulePage() {
    const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming');
    const filtered = SCHEDULES.filter(s => s.status === tab);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Jadwal Pelatihan & Ujian</h1>
                <p className="text-gray-500 mt-1">Pantau jadwal kelas dan sesi ujian sertifikasi Anda.</p>
            </div>

            {/* Upcoming alert */}
            {tab === 'upcoming' && filtered.length > 0 && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                    <span>
                        Anda memiliki <strong>{filtered.length}</strong> jadwal mendatang. Pastikan Anda siap dan memeriksa catatan masing-masing sesi.
                    </span>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {(['upcoming', 'completed'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t === 'upcoming' ? 'Mendatang' : 'Selesai'}
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                            {SCHEDULES.filter(s => s.status === t).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Schedule Items */}
            <div className="space-y-4">
                {filtered.length > 0 ? filtered.map(item => {
                    const d = parseDate(item.date);
                    return (
                        <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="flex">
                                {/* Date Badge */}
                                <div className={`flex-shrink-0 w-20 flex flex-col items-center justify-center text-white py-4 ${item.status === 'completed' ? 'bg-gray-400' : 'bg-blue-600'}`}>
                                    <span className="text-2xl font-extrabold leading-none">{d.day}</span>
                                    <span className="text-xs font-bold opacity-80 uppercase tracking-wider">{d.month}</span>
                                    <span className="text-[10px] opacity-60">{d.year}</span>
                                </div>
                                {/* Info */}
                                <div className="flex-1 px-5 py-4">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mr-2 ${item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {item.type}
                                            </span>
                                            <h3 className="font-bold text-gray-900 mt-1.5 text-base">{item.course}</h3>
                                        </div>
                                        {item.status === 'completed' && (
                                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {item.time}</span>
                                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {item.location}</span>
                                        <span className="flex items-center gap-1">🎓 {item.instructor}</span>
                                    </div>
                                    {item.notes && (
                                        <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                                            📌 {item.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Tidak ada jadwal {tab === 'upcoming' ? 'mendatang' : 'yang selesai'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
