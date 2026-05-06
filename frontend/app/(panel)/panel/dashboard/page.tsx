import { ArrowUpRight, CheckCircle2, MoreHorizontal, Download, Plus, Filter } from 'lucide-react';

export default function PanelDashboard() {
    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex items-end justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <span>Dasbor</span>
                        <span>/</span>
                        <span className="font-semibold text-gray-900">Ikhtisar Sertifikasi</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Sertifikasi ISO</h1>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        <Download className="w-4 h-4" />
                        Laporan Bulanan
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                        <CheckCircle2 className="w-4 h-4" />
                        Terbitkan Sertifikat
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Penerbitan Sertifikat</p>
                            <h3 className="text-3xl font-bold text-gray-900">1,245</h3>
                        </div>
                        <div className="px-2 py-1 bg-green-50 rounded-lg flex items-center gap-1 text-xs font-bold text-green-600">
                            <ArrowUpRight className="w-3 h-3" />
                            +8.5%
                        </div>
                    </div>
                    {/* Mock Chart Area */}
                    <div className="mt-4 h-16 w-full opacity-60">
                        <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
                            <path d="M0,50 Q40,50 60,40 T120,30 T180,20 L200,10" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                            <defs>
                                <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,50 Q40,50 60,40 T120,30 T180,20 L200,10 V60 H0 Z" fill="url(#grad1)" stroke="none" />
                        </svg>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Permintaan Verifikasi</p>
                            <h3 className="text-3xl font-bold text-gray-900">42</h3>
                        </div>
                        <div className="px-2 py-1 bg-amber-50 rounded-lg flex items-center gap-1 text-xs font-bold text-amber-600">
                            ! Perlu Tindakan
                        </div>
                    </div>
                    <div className="mt-4 h-16 w-full opacity-60">
                        <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
                            <path d="M0,55 Q50,55 80,45 T140,50 T200,45" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                            <defs>
                                <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,55 Q50,55 80,45 T140,50 T200,45 V60 H0 Z" fill="url(#grad2)" stroke="none" />
                        </svg>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">Pendapatan Pelatihan</p>
                            <h3 className="text-3xl font-bold text-gray-900">Rp 85.2 Jt</h3>
                        </div>
                        <div className="px-2 py-1 bg-green-50 rounded-lg flex items-center gap-1 text-xs font-bold text-green-600">
                            <ArrowUpRight className="w-3 h-3" />
                            +12%
                        </div>
                    </div>
                    <div className="mt-4 h-16 w-full opacity-60">
                        <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
                            <path d="M0,50 L40,45 L70,48 L100,35 L140,38 L180,25 L200,28" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                            <defs>
                                <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,50 L40,45 L70,48 L100,35 L140,38 L180,25 L200,28 V60 H0 Z" fill="url(#grad3)" stroke="none" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Kepatuhan Trainer ISO */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Kepatuhan Trainer ISO</h2>
                            <p className="text-sm text-gray-500">Audit kepatuhan trainer</p>
                        </div>
                        <button className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">
                            Lihat Audit Log
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trainer</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Spesialisasi ISO</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Masa Berlaku</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {[
                                    { name: 'Siti Rahma', role: 'ISO 9001:2015', topic: 'Manajemen Mutu', date: 'Des 2024', img: 'https://i.pravatar.cc/150?u=1' },
                                    { name: 'Agus Pratama', role: 'ISO 27001:2022', topic: 'Keamanan Info', date: 'Okt 2023', img: 'https://i.pravatar.cc/150?u=2' },
                                    { name: 'Dewi Kartika', role: 'ISO 14001:2015', topic: 'Lingkungan', date: 'Feb 2025', img: 'https://i.pravatar.cc/150?u=3' },
                                    { name: 'Rudi Jaya', role: 'ISO 45001:2018', topic: 'K3', date: 'Sep 2023', img: 'https://placehold.co/150/dbeafe/1e40af?text=RJ' },
                                ].map((trainer, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <img src={trainer.img} alt={trainer.name} className="w-10 h-10 rounded-full bg-gray-100 object-cover" />
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">{trainer.name}</div>
                                                    <div className="text-xs text-gray-500">{trainer.role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-700">{trainer.topic}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-medium text-gray-700">{trainer.date}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pembayaran Sertifikasi */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Pembayaran Sertifikasi</h2>
                            <p className="text-sm text-gray-500">Arus kas kategori ISO</p>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID Transaksi</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori ISO</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {[
                                    { id: '#INV-ISO-901', cat: 'ISO 9001 (Quality)', amount: 'Rp 2.500.000' },
                                    { id: '#INV-ISO-271', cat: 'ISO 27001 (Security)', amount: 'Rp 4.500.000' },
                                    { id: '#INV-ISO-451', cat: 'ISO 45001 (K3)', amount: 'Rp 3.200.000' },
                                    { id: '#INV-ISO-141', cat: 'ISO 14001 (Env)', amount: 'Rp 2.800.000' },
                                    { id: '#INV-ISO-902', cat: 'ISO 9001 (Quality)', amount: 'Rp 2.500.000' },
                                ].map((tx, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-500">{tx.id}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-gray-700">{tx.cat}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-bold text-gray-900">{tx.amount}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
