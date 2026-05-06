"use client"
import Image from 'next/image';
import { Clock, CreditCard, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { Course, PublicTrainingSession } from '@/types';
import { getElearningPriceSummary, getPublicModePriceSummary } from '@/utils/coursePricing';

type PaymentOffer = 'elearning' | 'public';

type SnapResult = Record<string, unknown>;

type SnapPayOptions = {
    onSuccess?: (result: SnapResult) => void | Promise<void>;
    onPending?: (result: SnapResult) => void | Promise<void>;
    onError?: (error: SnapResult) => void;
    onClose?: () => void;
};

declare global {
    interface Window {
        snap?: {
            pay: (token: string, options: SnapPayOptions) => void;
        };
    }
}

type ReferralPreview = {
    valid: boolean;
    code: string;
    label?: string;
    description?: string;
    discount_type?: 'percent' | 'fixed';
    discount_value?: string;
    original_amount: string;
    discount_amount: string;
    final_amount: string;
    owner_name?: string | null;
};

function getSelectedPublicSession(
    course: Course | null,
    sessionId: string | null,
    offerMode: string | null
): PublicTrainingSession | null {
    const sessions = Array.isArray(course?.public_sessions) ? course.public_sessions : [];

    if (sessionId) {
        const matchedById = sessions.find((session) => session.id === sessionId);
        if (matchedById) return matchedById;
    }

    if (offerMode) {
        const matchedByMode = sessions.find((session) => session.delivery_mode === offerMode);
        if (matchedByMode) return matchedByMode;
    }

    return sessions[0] || null;
}

function PaymentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = searchParams.get('slug');
    const offer = (searchParams.get('offer') || 'elearning') as PaymentOffer;
    const offerMode = searchParams.get('mode');
    const publicSessionId = searchParams.get('session');
    const paymentQuery = searchParams.toString();

    const [selectedMethod, setSelectedMethod] = useState<string>('mandiri');
    const [isProcessing, setIsProcessing] = useState(false);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [referralCodeInput, setReferralCodeInput] = useState('');
    const [referralPreview, setReferralPreview] = useState<ReferralPreview | null>(null);
    const [referralLoading, setReferralLoading] = useState(false);
    const [referralMessage, setReferralMessage] = useState('');

    const selectedPublicSession = offer === 'public' ? getSelectedPublicSession(course, publicSessionId, offerMode) : null;
    const resolvedPublicMode = offerMode === 'offline' || selectedPublicSession?.delivery_mode === 'offline' ? 'offline' : 'online';
    const publicPriceSummary = resolvedPublicMode === 'offline'
        ? getPublicModePriceSummary(course, 'offline', selectedPublicSession)
        : getPublicModePriceSummary(course, 'online', selectedPublicSession);
    const elearningPriceSummary = getElearningPriceSummary(course);
    const selectedPriceSummary = offer === 'public' ? publicPriceSummary : elearningPriceSummary;
    const isPriceUnavailable = offer === 'public' && selectedPriceSummary.finalPrice === null;
    const price = selectedPriceSummary.finalPrice ?? 0;
    const payablePrice = referralPreview ? Number(referralPreview.final_amount) : price;

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push(`/login?redirect=/payment${paymentQuery ? `?${paymentQuery}` : ''}`);
            return;
        }

        if (!slug) {
            router.push('/courses');
            return;
        }

        const fetchCourse = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/courses/${slug}/`);
                if (res.ok) {
                    const data: Course = await res.json();
                    setCourse(data);
                } else {
                    router.push('/courses');
                }
            } catch (error) {
                console.error('Error fetching course:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [paymentQuery, router, slug]);

    // Midtrans Snap declaration
    const snapPay = (token: string, orderId: number) => {
        if (!window.snap) {
            alert('Midtrans Snap is not loaded yet');
            return;
        }

        const handleSync = async () => {
            try {
                const authToken = localStorage.getItem('access_token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                await fetch(`${apiUrl}/api/orders/${orderId}/sync/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
            } catch (error) {
                console.error('Sync error:', error);
            }
        };

        window.snap.pay(token, {
            onSuccess: async (result) => {
                console.log('Payment success:', result);
                await handleSync();
                router.push('/dashboard/courses');
            },
            onPending: async (result) => {
                console.log('Payment pending:', result);
                await handleSync();
                router.push('/dashboard/courses');
            },
            onError: (error) => {
                console.error('Payment error:', error);
                alert('Pembayaran gagal. Silakan coba lagi.');
            },
            onClose: () => {
                console.log('Customer closed the popup without finishing the payment');
            }
        });
    };

    const handlePayment = async () => {
        if (!course) return;
        if (isPriceUnavailable) {
            alert('Harga sesi public ini belum tersedia. Silakan kembali dan pilih sesi lain.');
            return;
        }
        setIsProcessing(true);
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const res = await fetch(`${apiUrl}/api/orders/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course: course.id,
                    offer_type: offer,
                    offer_mode: offerMode || '',
                    public_session_id: publicSessionId || '',
                    referral_code_input: referralPreview?.code || referralCodeInput,
                    total_amount: payablePrice,
                    status: 'Pending'
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.snap_token) {
                    snapPay(data.snap_token, data.id);
                } else {
                    router.push('/dashboard/courses');
                }
            } else {
                const data = await res.json();
                const errorMsg = data.error || (data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : 'Gagal memproses pembayaran');
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('Terjadi kesalahan koneksi atau server');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApplyReferral = async () => {
        if (!course) return;
        const normalizedCode = referralCodeInput.trim().toUpperCase();
        if (!normalizedCode) {
            setReferralPreview(null);
            setReferralMessage('Masukkan kode referral terlebih dahulu.');
            return;
        }

        setReferralLoading(true);
        setReferralMessage('');
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const params = new URLSearchParams({
                code: normalizedCode,
                course: String(course.id),
                offer_type: offer,
                offer_mode: offerMode || '',
                public_session_id: publicSessionId || '',
            });
            const res = await fetch(`${apiUrl}/api/referrals/validate/?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setReferralPreview(data);
                setReferralCodeInput(data.code || normalizedCode);
                setReferralMessage('Kode referral berhasil diterapkan.');
            } else {
                setReferralPreview(null);
                setReferralMessage(data.error || data.detail || 'Kode referral tidak bisa digunakan.');
            }
        } catch (error) {
            console.error('Referral validation error:', error);
            setReferralPreview(null);
            setReferralMessage('Terjadi masalah saat memvalidasi kode referral.');
        } finally {
            setReferralLoading(false);
        }
    };

    const handleRemoveReferral = () => {
        setReferralPreview(null);
        setReferralCodeInput('');
        setReferralMessage('');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>;
    }

    if (!course) return null;
    const offerLabel = offer === 'public'
        ? `Public Training ${resolvedPublicMode === 'online' ? 'Online' : 'Offline'}`
        : 'Paket E-Learning';

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
                                    <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden">
                                        {course.thumbnail ? (
                                            <Image src={course.thumbnail} alt={course.title} width={64} height={64} unoptimized className="w-full h-full object-cover" />
                                        ) : (
                                            'ISO'
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm line-clamp-2">{course.title}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{course.category?.name || 'Sesi Online + Sertifikat Resmi'}</p>
                                        <div className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">{offerLabel}</div>
                                        <div className="mt-2 inline-block bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded">Batch Termudah</div>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6 pb-6 border-b border-gray-100 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="font-medium text-gray-900">{isPriceUnavailable ? 'Harga belum tersedia' : selectedPriceSummary.isFree ? 'Gratis' : `Rp ${price.toLocaleString('id-ID')}`}</span>
                                    </div>
                                    {selectedPriceSummary.hasDiscount && selectedPriceSummary.originalPrice != null && selectedPriceSummary.discountPrice != null && (
                                        <div className="flex justify-between text-green-600">
                                            <span className="font-medium flex items-center gap-1">Potongan Harga</span>
                                            <span className="font-bold">- Rp {(selectedPriceSummary.originalPrice - selectedPriceSummary.discountPrice).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-blue-900">Kode Referral</p>
                                                <p className="text-xs text-blue-700">Masukkan kode referral untuk mendapatkan diskon pembayaran.</p>
                                            </div>
                                            {referralPreview && (
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveReferral}
                                                    className="text-xs font-bold text-blue-700 hover:text-blue-900"
                                                >
                                                    Hapus
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                value={referralCodeInput}
                                                onChange={(event) => {
                                                    setReferralCodeInput(event.target.value.toUpperCase());
                                                    if (referralPreview) {
                                                        setReferralPreview(null);
                                                    }
                                                }}
                                                placeholder="Contoh: AKD123ABC"
                                                className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold uppercase tracking-wide text-gray-900 outline-none focus:ring-2 focus:ring-blue-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyReferral}
                                                disabled={referralLoading || isPriceUnavailable}
                                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {referralLoading ? 'Cek...' : 'Pakai'}
                                            </button>
                                        </div>
                                        {referralPreview && (
                                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                                                <p className="font-bold">{referralPreview.code} aktif</p>
                                                <p className="mt-1">Diskon referral: Rp {Number(referralPreview.discount_amount).toLocaleString('id-ID')}</p>
                                                {referralPreview.owner_name && (
                                                    <p className="mt-1 text-xs text-emerald-700">Kode milik affiliator: {referralPreview.owner_name}</p>
                                                )}
                                            </div>
                                        )}
                                        {referralMessage && !referralPreview && (
                                            <p className="text-xs font-medium text-amber-700">{referralMessage}</p>
                                        )}
                                        {referralPreview && (
                                            <div className="flex justify-between text-emerald-700">
                                                <span className="font-medium">Diskon Referral</span>
                                                <span className="font-bold">- Rp {Number(referralPreview.discount_amount).toLocaleString('id-ID')}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Biaya Admin</span>
                                        <span className="font-medium text-gray-900">Rp 0</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mb-6">
                                    <span className="font-bold text-gray-900 text-sm">Total Pembayaran</span>
                                    <span className="font-bold text-2xl text-blue-600">{isPriceUnavailable ? 'Hubungi Tim' : selectedPriceSummary.isFree || payablePrice <= 0 ? 'Gratis' : `Rp ${payablePrice.toLocaleString('id-ID')}`}</span>
                                </div>

                                {isPriceUnavailable && (
                                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                        Harga sesi public ini belum tersedia. Kembali ke halaman course untuk memilih sesi lain.
                                    </div>
                                )}

                                <button
                                    onClick={handlePayment}
                                    disabled={isProcessing || isPriceUnavailable}
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

export default function Payment() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
            <PaymentContent />
        </Suspense>
    );
}
