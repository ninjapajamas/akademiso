'use client';

import { useState, useEffect } from 'react';
import { Award, Download, Search, Shield, CheckCircle2 } from 'lucide-react';

const MOCK_CERTS = [
    {
        id: 'CERT-ISO-9001-2024',
        title: 'ISO 9001:2015 Quality Management Systems',
        subtitle: 'Lead Implementer',
        issued: '2024-10-12',
        expiry: '2027-10-12',
        issuer: 'Akademiso — Terakreditasi KAN',
        color: 'from-blue-600 to-blue-800',
    },
    {
        id: 'CERT-ISO-14001-2024',
        title: 'ISO 14001:2015 Environmental Management',
        subtitle: 'Internal Auditor',
        issued: '2024-01-18',
        expiry: '2027-01-18',
        issuer: 'Akademiso — Terakreditasi KAN',
        color: 'from-green-600 to-green-800',
    },
    {
        id: 'CERT-ISO-19011-2023',
        title: 'ISO 19011:2018 Auditing Management Systems',
        subtitle: 'Awareness',
        issued: '2023-09-05',
        expiry: '2026-09-05',
        issuer: 'Akademiso — Terakreditasi KAN',
        color: 'from-purple-600 to-purple-800',
    },
];

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isExpiringSoon(expiry: string) {
    const diff = new Date(expiry).getTime() - Date.now();
    return diff > 0 && diff < 180 * 24 * 60 * 60 * 1000; // < 6 months
}

export default function CertificatesPage() {
    const [search, setSearch] = useState('');
    const [fromApi, setFromApi] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) { setLoading(false); return; }
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/my-courses/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Only completed orders are certifiable
                    setFromApi(data.filter((e: any) => e.status === 'Completed'));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const combined = [
        ...MOCK_CERTS.filter(c =>
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            c.subtitle.toLowerCase().includes(search.toLowerCase())
        ),
    ];

    const handleDownload = (cert: typeof MOCK_CERTS[0]) => {
        alert(`Mengunduh sertifikat: ${cert.title}\n\nFitur download PDF akan segera tersedia.`);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Sertifikat Saya</h1>
                <p className="text-gray-500 mt-1">Koleksi sertifikat pelatihan dan ujian yang telah Anda selesaikan.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Sertifikat', value: MOCK_CERTS.length, icon: Award, color: 'bg-blue-50 text-blue-600' },
                    { label: 'Masih Berlaku', value: MOCK_CERTS.filter(c => new Date(c.expiry) > new Date()).length, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
                    { label: 'Segera Expired', value: MOCK_CERTS.filter(c => isExpiringSoon(c.expiry)).length, icon: Shield, color: 'bg-orange-50 text-orange-600' },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${s.color}`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
                            <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari sertifikat..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                />
            </div>

            {/* Certificate Cards */}
            <div className="grid md:grid-cols-2 gap-5">
                {combined.map(cert => (
                    <div key={cert.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                        {/* Header gradient */}
                        <div className={`bg-gradient-to-r ${cert.color} p-5 relative overflow-hidden`}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                                    <Award className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-white font-bold text-sm leading-snug">{cert.title}</h3>
                                <span className="text-white/70 text-[11px] font-medium">{cert.subtitle}</span>
                            </div>
                        </div>
                        {/* Body */}
                        <div className="p-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Diterbitkan: <strong className="text-gray-700">{formatDate(cert.issued)}</strong></span>
                            </div>
                            <div className={`flex justify-between text-xs mb-3 ${isExpiringSoon(cert.expiry) ? 'text-orange-600 font-semibold' : 'text-gray-500'}`}>
                                <span>Berlaku sampai: <strong>{formatDate(cert.expiry)}</strong></span>
                                {isExpiringSoon(cert.expiry) && <span>⚠ Segera perpanjang</span>}
                            </div>
                            <div className="text-[10px] text-gray-400 mb-4">{cert.issuer} &bull; ID: {cert.id}</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDownload(cert)}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" /> Unduh PDF
                                </button>
                                <button className="flex-1 text-xs font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 py-2 rounded-lg transition-colors">
                                    Bagikan
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {combined.length === 0 && (
                    <div className="col-span-2 text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Sertifikat tidak ditemukan</p>
                    </div>
                )}
            </div>
        </div>
    );
}
