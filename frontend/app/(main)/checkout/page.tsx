"use client";

import { getClientApiBaseUrl } from '@/utils/api';
import Link from 'next/link';
import { Calendar, Lock, CircleAlert, CheckCircle2, Building2, Mail, Phone, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Course } from '@/types';
import { getProfileDisplayName, getRequiredProfileMissingFields, isRequiredProfileComplete, type UserProfilePayload } from '@/utils/profile';
import { getElearningPriceSummary, getPublicModePriceSummary } from '@/utils/coursePricing';

type CheckoutOffer = 'elearning' | 'public';

function getSelectedPublicSession(course: Course | null, sessionId: string | null, offerMode: string | null) {
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

function CheckoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = searchParams.get('slug');
    const offer = (searchParams.get('offer') || 'elearning') as CheckoutOffer;
    const offerMode = searchParams.get('mode');
    const publicSessionId = searchParams.get('session');
    const checkoutQuery = searchParams.toString();

    const [course, setCourse] = useState<Course | null>(null);
    const [profile, setProfile] = useState<UserProfilePayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            const redirectPath = `/checkout${checkoutQuery ? `?${checkoutQuery}` : ''}`;
            router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
            return;
        }

        if (!slug) {
            router.push('/courses');
            return;
        }

        const fetchCheckoutData = async () => {
            try {
                const apiUrl = getClientApiBaseUrl();
                const [courseRes, profileRes] = await Promise.all([
                    fetch(`${apiUrl}/api/courses/${slug}/`),
                    fetch(`${apiUrl}/api/profile/`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    })
                ]);

                if (courseRes.ok) {
                    const courseData = await courseRes.json();
                    setCourse(courseData);
                } else {
                    router.push('/courses');
                    return;
                }

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setProfile(profileData);
                }
            } catch (error) {
                console.error('Error fetching checkout data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCheckoutData();
    }, [checkoutQuery, router, slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!course) return null;

    const selectedPublicSession = offer === 'public' ? getSelectedPublicSession(course, publicSessionId, offerMode) : null;
    const resolvedPublicMode = offerMode === 'offline' || selectedPublicSession?.delivery_mode === 'offline' ? 'offline' : 'online';
    const publicPriceSummary = resolvedPublicMode === 'offline'
        ? getPublicModePriceSummary(course, 'offline', selectedPublicSession)
        : getPublicModePriceSummary(course, 'online', selectedPublicSession);
    const elearningPriceSummary = getElearningPriceSummary(course);
    const selectedPriceSummary = offer === 'public' ? publicPriceSummary : elearningPriceSummary;
    const isPriceUnavailable = offer === 'public' && selectedPriceSummary.finalPrice === null;
    const price = selectedPriceSummary.finalPrice ?? 0;
    const isFreeWebinar = course.type === 'webinar' && course.is_free;
    const isFreeOffering = !isPriceUnavailable && (isFreeWebinar || selectedPriceSummary.isFree);
    const offerTitle = offer === 'public'
        ? `Public Training ${resolvedPublicMode === 'online' ? 'Online' : 'Offline'}`
        : 'Paket E-Learning';
    const offerSchedule = offer === 'public'
        ? selectedPublicSession?.schedule || 'Jadwal akan diinformasikan'
        : 'Akses materi aktif setelah pembayaran berhasil';
    const displayName = getProfileDisplayName(profile) || '-';
    const phone = profile?.profile?.phone?.trim() || '-';
    const company = profile?.profile?.company?.trim() || '-';
    const position = profile?.profile?.position?.trim() || '-';
    const missingFields = getRequiredProfileMissingFields(profile);
    const canProceed = isRequiredProfileComplete(profile);

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <div className="bg-white border-b border-gray-200 py-5 sm:py-6">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="relative mb-6 flex items-center justify-between sm:mb-8">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10"></div>
                        <div className="absolute top-1/2 left-0 w-1/2 h-1 bg-blue-600 -z-10"></div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                            <span className="text-[11px] font-bold text-blue-600 sm:text-xs">Identitas</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm">2</div>
                            <span className="text-[11px] font-medium text-gray-500 sm:text-xs">Pembayaran</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold text-sm">3</div>
                            <span className="text-[11px] font-medium text-gray-400 sm:text-xs">Selesai</span>
                        </div>
                    </div>

                    <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Konfirmasi Identitas</h1>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500 sm:text-base">Checkout menggunakan preview identitas dari halaman pengaturan akun Anda.</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                    <div className="lg:col-span-2">
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Preview Identitas Peserta</h2>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Data ini tidak diisi ulang di checkout. Jika ada yang perlu diperbaiki, ubah dulu di pengaturan akun.
                                            </p>
                                        </div>
                                        {canProceed ? (
                                                <div className="inline-flex shrink-0 self-start whitespace-nowrap items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Profil Siap
                                            </div>
                                        ) : (
                                                <div className="inline-flex shrink-0 self-start whitespace-nowrap items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                                                <CircleAlert className="w-4 h-4" />
                                                Profil Belum Lengkap
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!canProceed && (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
                                        <div className="flex items-start gap-3">
                                            <CircleAlert className="w-5 h-5 mt-0.5 shrink-0" />
                                            <div className="space-y-2 text-sm">
                                                <p className="font-bold">Lengkapi profil Anda terlebih dahulu di pengaturan.</p>
                                                <p>Data yang masih kurang: {missingFields.join(', ')}.</p>
                                                <Link href="/dashboard/settings?welcome=1" className="inline-flex items-center rounded-full bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700 transition">
                                                    Buka Pengaturan
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isPriceUnavailable && (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
                                        <div className="flex items-start gap-3">
                                            <CircleAlert className="w-5 h-5 mt-0.5 shrink-0" />
                                            <div className="space-y-2 text-sm">
                                                <p className="font-bold">Harga sesi public ini belum tersedia.</p>
                                                <p>Silakan kembali ke halaman course untuk memilih sesi lain atau hubungi tim Akademiso.</p>
                                                <Link href={`/courses/${course.slug}`} className="inline-flex items-center rounded-full bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700 transition">
                                                    Kembali ke Halaman Course
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                                            <User className="w-4 h-4" />
                                            Nama Lengkap
                                        </div>
                                        <div className="mt-2 text-base font-bold text-gray-900">{displayName}</div>
                                        <p className="mt-1 text-xs text-gray-500">Nama peserta diambil dari pengaturan akun.</p>
                                    </div>

                                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                                            <Mail className="w-4 h-4" />
                                            Email
                                        </div>
                                        <div className="mt-2 text-base font-bold text-gray-900">{profile?.email || '-'}</div>
                                        <p className="mt-1 text-xs text-gray-500">Email akun akan dipakai untuk komunikasi pelatihan.</p>
                                    </div>

                                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                                            <Phone className="w-4 h-4" />
                                            Nomor Telepon
                                        </div>
                                        <div className="mt-2 text-base font-bold text-gray-900">{phone}</div>
                                    </div>

                                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                                            <Building2 className="w-4 h-4" />
                                            Perusahaan / Instansi
                                        </div>
                                        <div className="mt-2 text-base font-bold text-gray-900">{company}</div>
                                        {position !== '-' && (
                                            <p className="mt-1 text-xs text-gray-500">{position}</p>
                                        )}
                                    </div>
                                </div>

                                <label className="flex items-start gap-3 cursor-pointer pt-4 border-t border-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={agreed}
                                        onChange={(event) => setAgreed(event.target.checked)}
                                        disabled={!canProceed}
                                        className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-gray-600">
                                        <span className="font-bold text-gray-900">Setuju dengan Syarat & Ketentuan</span>
                                        <br />
                                        Saya menyatakan preview identitas di atas sudah benar dan menyetujui kebijakan privasi Akademiso.
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-start sm:mt-6 sm:justify-end">
                            <p className="flex items-center gap-2 text-sm text-gray-500">
                                <Lock className="w-4 h-4" /> Pembayaran aman diproses oleh Midtrans
                            </p>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                            <div className="sticky top-20 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:top-24">
                            <div className="h-32 bg-gray-800 relative">
                                {course.thumbnail ? (
                                    <img src={course.thumbnail} alt={course.title} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                ) : (
                                    <div className="absolute inset-0 bg-blue-900/50"></div>
                                )}
                                <div className="absolute bottom-4 left-4 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">Best Seller</div>
                            </div>

                            <div className="p-6">
                                <h3 className="font-bold text-gray-900 mb-2">{course.title}</h3>
                                <p className="text-sm text-gray-500 mb-2">{course.category?.name || 'Sertifikasi ISO'}</p>
                                <div className="mb-6 inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                                    {offerTitle}
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">{offer === 'public' ? 'Jadwal Public Training' : 'Akses Pelatihan'}</p>
                                        <p className="font-bold text-sm text-gray-900">{offerSchedule}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6 pb-6 border-b border-gray-100 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Harga Pelatihan</span>
                                        <span className="font-medium text-gray-900">{isPriceUnavailable ? 'Harga belum tersedia' : isFreeWebinar || isFreeOffering ? 'Gratis' : `Rp ${price.toLocaleString('id-ID')}`}</span>
                                    </div>
                                    {selectedPriceSummary.hasDiscount && selectedPriceSummary.originalPrice != null && selectedPriceSummary.discountPrice != null && !isFreeWebinar && (
                                        <div className="flex justify-between text-green-600">
                                            <span className="text-gray-500">Potongan Harga</span>
                                            <span className="font-medium">- Rp {(selectedPriceSummary.originalPrice - selectedPriceSummary.discountPrice).toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
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
                                    <span className="font-bold text-xl text-blue-600">{isPriceUnavailable ? 'Hubungi Tim' : isFreeWebinar || isFreeOffering ? 'Gratis' : `Rp ${price.toLocaleString('id-ID')}`}</span>
                                </div>

                                {canProceed && !isPriceUnavailable ? (
                                    <button
                                        type="button"
                                        disabled={!agreed}
                                        onClick={() => router.push(`/payment?${checkoutQuery}`)}
                                        className="block w-full text-center bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Lanjut ke Pembayaran
                                    </button>
                                ) : isPriceUnavailable ? (
                                    <Link href={`/courses/${course.slug}`} className="block w-full text-center bg-amber-600 text-white font-bold py-3.5 rounded-xl hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20">
                                        Pilih Sesi Lain
                                    </Link>
                                ) : (
                                    <Link href="/dashboard/settings?welcome=1" className="block w-full text-center bg-amber-600 text-white font-bold py-3.5 rounded-xl hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20">
                                        Lengkapi Profil Dulu
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Checkout() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
            <CheckoutContent />
        </Suspense>
    );
}

