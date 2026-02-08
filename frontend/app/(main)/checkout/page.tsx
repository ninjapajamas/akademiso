"use client"
import Link from 'next/link';
import { Calendar, Lock } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Checkout() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push('/login?redirect=/checkout/iso-9001'); // idealnya slug dinamis
        }
    }, [router]);

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 py-6">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex justify-between items-center mb-8 relative">
                        {/* Progress Bar */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10"></div>
                        <div className="absolute top-1/2 left-0 w-1/2 h-1 bg-blue-600 -z-10"></div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                            <span className="text-xs font-bold text-blue-600">Data Peserta</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm">2</div>
                            <span className="text-xs font-medium text-gray-500">Pembayaran</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold text-sm">3</div>
                            <span className="text-xs font-medium text-gray-400">Selesai</span>
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900">Pendaftaran Sertifikasi</h1>
                    <p className="text-gray-500">Silakan lengkapi data diri Anda untuk pendaftaran sertifikasi ISO.</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <form className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Nama Lengkap (Sesuai KTP) <span className="text-red-500">*</span></label>
                                    <input type="text" placeholder="Contoh: Budi Santoso, S.T." className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none" />
                                    <p className="text-xs text-gray-500 mt-1">Nama ini akan dicetak pada sertifikat resmi Anda.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">Alamat Email Aktif <span className="text-red-500">*</span></label>
                                        <input type="email" placeholder="nama@email.com" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-2">Nomor WhatsApp <span className="text-red-500">*</span></label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-gray-200 bg-gray-100 text-gray-500 text-sm font-bold">+62</span>
                                            <input type="tel" placeholder="812-3456-7890" className="flex-1 px-4 py-3 rounded-r-lg bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Asal Perusahaan / Instansi</label>
                                    <input type="text" placeholder="Nama Perusahaan atau Universitas" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none" />
                                </div>

                                <label className="flex items-start gap-3 cursor-pointer pt-4 border-t border-gray-100">
                                    <input type="checkbox" className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                    <span className="text-sm text-gray-600">
                                        <span className="font-bold text-gray-900">Setuju dengan Syarat & Ketentuan</span>
                                        <br />
                                        Saya menyatakan data yang diisi adalah benar dan menyetujui kebijakan privasi Akademiso.
                                    </span>
                                </label>
                            </form>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <p className="flex items-center gap-2 text-sm text-gray-500">
                                <Lock className="w-4 h-4" /> Pembayaran aman diproses oleh Midtrans
                            </p>
                        </div>
                    </div>

                    {/* Booking Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                            <div className="h-32 bg-gray-800 relative">
                                {/* Placeholder Image */}
                                <div className="absolute inset-0 bg-blue-900/50"></div>
                                <div className="absolute bottom-4 left-4 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">Best Seller</div>
                            </div>

                            <div className="p-6">
                                <h3 className="font-bold text-gray-900 mb-2">Pelatihan Lead Auditor ISO 9001:2015</h3>
                                <p className="text-sm text-gray-500 mb-6">Sistem Manajemen Mutu (Quality Management System)</p>

                                <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Jadwal Pelaksanaan</p>
                                        <p className="font-bold text-sm text-gray-900">24 - 25 Agustus 2024</p>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6 pb-6 border-b border-gray-100 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Harga Pelatihan</span>
                                        <span className="font-medium text-gray-900">Rp 5.500.000</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Biaya Admin</span>
                                        <span className="font-medium text-green-600">Gratis</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">PPN (11%)</span>
                                        <span className="font-medium text-gray-900">Termasuk</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-6">
                                    <span className="font-bold text-gray-900">Total Bayar</span>
                                    <span className="font-bold text-xl text-blue-600">Rp 5.500.000</span>
                                </div>

                                <Link href="/payment" className="block w-full text-center bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                                    Lanjut ke Pembayaran →
                                </Link>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
