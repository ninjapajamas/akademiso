'use client';

import { Clock, CreditCard, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useState } from 'react';

// Use client component for interactivity

import { useRouter } from 'next/navigation';

export default function Payment() {
    const router = useRouter();
    const [selectedMethod, setSelectedMethod] = useState<string>('mandiri');

    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = async () => {
        setIsProcessing(true);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                router.push('/login');
                return;
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            console.log('Processing payment at:', `${apiUrl}/api/orders/`);

            // Create order with status Completed
            const res = await fetch(`${apiUrl}/api/orders/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course: 1, // Hardcoded for now as per "temporarily" request
                    total_amount: 5500000,
                    status: 'Completed'
                })
            });

            if (res.ok) {
                router.push('/dashboard');
            } else {
                if (res.status === 401) {
                    alert('Sesi Anda telah berakhir. Silakan login kembali.');
                    router.push('/login');
                    return;
                }
                const data = await res.json();
                console.error('Payment failed:', res.status, data);
                alert(`Gagal memproses pembayaran: ${res.statusText}`);
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('Terjadi kesalahan koneksi. Pastikan backend berjalan.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* ... other code ... */}

            {/* Inside the Summary component where the button is */}


            {/* Header */}
            <div className="bg-white border-b border-gray-200 py-6">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex justify-between items-center mb-8 relative">
                        {/* Progress Bar */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10"></div>
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-blue-600 -z-10"></div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">✓</div>
                            <span className="text-xs font-bold text-blue-600">Data Peserta</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                            <span className="text-xs font-bold text-blue-600">Pembayaran</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold text-sm">3</div>
                            <span className="text-xs font-medium text-gray-400">Selesai</span>
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900">Metode Pembayaran</h1>
                    <p className="text-gray-500">Pilih cara pembayaran yang nyaman untuk Anda.</p>
                </div>
            </div>

            {/* Countdown */}
            <div className="bg-blue-50 border-b border-blue-100">
                <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-blue-800">
                        <Clock className="w-5 h-5" />
                        <span className="font-bold">Selesaikan Pembayaran</span>
                        <span className="text-sm">Amankan kursi pelatihan ISO Anda sebelum waktu habis.</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-white text-blue-600 font-bold px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 flex flex-col items-center min-w-[50px]">
                            <span className="text-lg leading-none">23</span>
                            <span className="text-[10px] uppercase">Jam</span>
                        </div>
                        <span className="text-blue-300 font-bold py-1">:</span>
                        <div className="bg-white text-blue-600 font-bold px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 flex flex-col items-center min-w-[50px]">
                            <span className="text-lg leading-none">59</span>
                            <span className="text-[10px] uppercase">Menit</span>
                        </div>
                        <span className="text-blue-300 font-bold py-1">:</span>
                        <div className="bg-white text-blue-600 font-bold px-3 py-1.5 rounded-lg shadow-sm border border-blue-100 flex flex-col items-center min-w-[50px]">
                            <span className="text-lg leading-none">55</span>
                            <span className="text-[10px] uppercase">Detik</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Payment Methods */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Virtual Account */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <button className="w-full flex justify-between items-center p-6 bg-white hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900">Transfer Virtual Account</h3>
                                        <p className="text-xs text-gray-500">Verifikasi Otomatis (Mandiri, BCA, BNI)</p>
                                    </div>
                                </div>
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                            </button>

                            <div className="px-6 pb-6 pt-2 space-y-3">
                                {['Mandiri', 'BCA', 'BNI'].map((bank) => (
                                    <label key={bank} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${selectedMethod === bank.toLowerCase() ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="payment"
                                                value={bank.toLowerCase()}
                                                checked={selectedMethod === bank.toLowerCase()}
                                                onChange={(e) => setSelectedMethod(e.target.value)}
                                                className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="font-bold text-gray-700 uppercase">{bank} Virtual Account</span>
                                        </div>
                                        <div className="bg-white px-2 py-1 rounded border border-gray-200 text-xs font-bold text-blue-800 uppercase w-16 text-center">
                                            {bank}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* E-Wallet */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <button className="w-full flex justify-between items-center p-6 bg-white hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 6h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2zm9 0h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900">QRIS (E-Wallet)</h3>
                                        <p className="text-xs text-gray-500">Gopay, OVO, Dana, ShopeePay</p>
                                    </div>
                                </div>
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Credit Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <button className="w-full flex justify-between items-center p-6 bg-white hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900">Kartu Kredit / Debit</h3>
                                        <p className="text-xs text-gray-500">Visa, Mastercard, JCB</p>
                                    </div>
                                </div>
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
                            <div className="shrink-0 mt-0.5 font-bold">i</div>
                            <p>Nomor Virtual Account akan dibuat setelah Anda menekan tombol &quot;Bayar Sekarang&quot;.</p>
                        </div>
                    </div>

                    {/* Booking Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                    <span className="w-4 h-4 bg-blue-600 rounded-sm inline-block"></span>
                                    Ringkasan Pesanan
                                </h3>
                            </div>

                            <div className="p-6">
                                <div className="flex gap-4 mb-6">
                                    <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">
                                        ISO
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm line-clamp-2">Pelatihan & Sertifikasi ISO 9001:2015</h4>
                                        <p className="text-xs text-gray-500 mt-1">Sesi Online + Sertifikat Resmi</p>
                                        <div className="mt-2 inline-block bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded">Batch #24 - Agustus 2024</div>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6 pb-6 border-b border-gray-100 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="font-medium text-gray-900">Rp 5.500.000</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Biaya Admin</span>
                                        <span className="font-medium text-gray-900">Rp 10.000</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">PPN (11%)</span>
                                        <span className="font-medium text-gray-900">Rp 550.000</span>
                                    </div>
                                    <div className="flex justify-between text-green-600">
                                        <span className="font-medium flex items-center gap-1">Promo Diskon</span>
                                        <span className="font-bold">- Rp 60.000</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mb-6">
                                    <span className="font-bold text-gray-900 text-sm">Total Pembayaran</span>
                                    <span className="font-bold text-2xl text-blue-600">Rp 5.500.000</span>
                                </div>

                                <button
                                    onClick={handlePayment}
                                    disabled={isProcessing}
                                    className="block w-full text-center bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed">
                                    {isProcessing ? (
                                        <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            Bayar Sekarang
                                        </>
                                    )}
                                </button>

                                <p className="text-center text-[10px] text-gray-400 mt-4 flex justify-center items-center gap-1">
                                    <Lock className="w-3 h-3" /> Data Anda dienkripsi 256-bit SSL
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                <div className="w-5 h-5 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">Butuh Bantuan?</h4>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">Hubungi CS Akademiso di +62 812-3456-7890 jika mengalami kendala.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
