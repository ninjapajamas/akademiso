'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, Mail, Lock, Shield, Save, Eye, EyeOff, TriangleAlert, Share2 } from 'lucide-react';
import { getProfileDisplayName, getRequiredProfileMissingFields, splitFullName, type UserProfilePayload } from '@/utils/profile';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-3">{title}</h2>
            {children}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
            {children}
        </div>
    );
}

function SettingsPageContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [showOldPw, setShowOldPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [profile, setProfile] = useState({
        full_name: '',
        email: '',
        phone: '',
        company: '',
        position: '',
        bio: '',
        avatar: null as string | null
    });
    const [affiliate, setAffiliate] = useState<UserProfilePayload['affiliate'] | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [notifs, setNotifs] = useState({ email_schedule: true, email_cert: true, email_promo: false, sms: false });
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
    const [pwError, setPwError] = useState('');
    const welcomeMode = searchParams.get('welcome') === '1';
    const canEditEmail = !profile.email.trim();
    const parsedName = splitFullName(profile.full_name);
    const missingFields = getRequiredProfileMissingFields({
        first_name: parsedName.firstName,
        last_name: parsedName.lastName,
        email: profile.email,
        profile: {
            phone: profile.phone,
            company: profile.company,
            position: profile.position,
            bio: profile.bio,
            avatar: profile.avatar
        }
    });
    const profileIncomplete = !loading && missingFields.length > 0;
    const showProfileBanner = !loading && (welcomeMode || profileIncomplete);
    const { showError, showSuccess } = useFeedbackModal();

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const res = await fetch(`${apiUrl}/api/profile/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data: UserProfilePayload = await res.json();
                setProfile({
                    full_name: getProfileDisplayName(data),
                    email: data.email || '',
                    phone: data.profile?.phone || '',
                    company: data.profile?.company || '',
                    position: data.profile?.position || '',
                    bio: data.profile?.bio || '',
                    avatar: data.profile?.avatar || null
                });
                setAffiliate(data.affiliate || null);
            }
        } catch (e) {
            console.error('Failed to fetch profile:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const { firstName, lastName } = splitFullName(profile.full_name);
            const normalizedEmail = profile.email.trim();

            const formData = new FormData();
            if (normalizedEmail) {
                formData.append('email', normalizedEmail);
            }
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);
            formData.append('phone', profile.phone);
            formData.append('company', profile.company);
            formData.append('position', profile.position);
            formData.append('bio', profile.bio);

            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            const res = await fetch(`${apiUrl}/api/profile/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                await fetchProfile();
                await showSuccess('Profil Anda berhasil diperbarui.', 'Profil Tersimpan');
            } else {
                await showError('Profil belum bisa disimpan. Silakan coba lagi.', 'Penyimpanan Gagal');
            }
        } catch (e) {
            console.error('Save error:', e);
            await showError('Terjadi kesalahan koneksi saat menyimpan profil.', 'Koneksi Bermasalah');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError('');
        if (passwords.new.length < 8) {
            setPwError('Password baru minimal 8 karakter.');
            return;
        }
        if (passwords.new !== passwords.confirm) {
            setPwError('Konfirmasi password tidak cocok.');
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();

            // For security, we use our existing admin reset password endpoint for self resets 
            // but we need a user ID. We can decode token for that.
            const payload = JSON.parse(atob(token!.split('.')[1]));
            const userId = payload.user_id;

            const res = await fetch(`${apiUrl}/api/users/${userId}/reset-password/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: passwords.new })
            });

            if (res.ok) {
                setPasswords({ old: '', new: '', confirm: '' });
                await showSuccess('Password Anda berhasil diperbarui.', 'Password Diperbarui');
            } else {
                setPwError('Gagal memperbarui password');
            }
        } catch {
            setPwError('Kesalahan sistem');
        }
    };

    const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all';
    const affiliateStatusMap: Record<string, string> = {
        none: 'Belum Mengajukan',
        pending: 'Menunggu Review',
        approved: 'Disetujui',
        rejected: 'Belum Disetujui',
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pengaturan Akun</h1>
                    <p className="text-gray-500 mt-1">Kelola informasi profil dan preferensi akun Anda.</p>
                </div>
            </div>

            {showProfileBanner && (
                <div className={`rounded-2xl border px-5 py-4 ${profileIncomplete ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
                    <div className="flex items-start gap-3">
                        <TriangleAlert className="w-5 h-5 mt-0.5 shrink-0" />
                        <div className="space-y-1 text-sm">
                            <p className="font-bold">
                                {profileIncomplete ? 'Lengkapi informasi diri sebelum checkout.' : 'Profil Anda siap digunakan untuk checkout.'}
                            </p>
                            <p>
                                {profileIncomplete
                                    ? `Data yang masih perlu diisi: ${missingFields.join(', ')}.`
                                    : 'Nama, telepon, dan perusahaan Anda sudah bisa dipakai sebagai preview identitas saat checkout.'}
                            </p>
                            {welcomeMode && (
                                <p>
                                    Informasi di halaman ini akan dipakai sebagai preview identitas saat checkout, jadi pastikan datanya sudah benar.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Profile */}
            <Section title="Profil Saya">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                    {/* Avatar */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-gray-50">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg overflow-hidden border-4 border-white">
                                {profile.avatar ? (
                                    <Image src={profile.avatar} alt="Avatar" width={96} height={96} unoptimized className="w-full h-full object-cover" />
                                ) : (
                                    (profile.full_name?.trim().charAt(0) || 'U').toUpperCase()
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full text-xs font-bold">
                                GANTI
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setAvatarFile(file);
                                            setProfile(p => ({ ...p, avatar: URL.createObjectURL(file) }));
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        <div className="text-center sm:text-left">
                            <h3 className="font-bold text-gray-900 text-lg">{profile.full_name || 'Lengkapi nama Anda'}</h3>
                            <p className="text-sm text-gray-500 mb-2">{profile.email}</p>
                            <label className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer bg-blue-50 px-3 py-1 rounded-full">
                                Upload Foto Baru
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setAvatarFile(file);
                                            setProfile(p => ({ ...p, avatar: URL.createObjectURL(file) }));
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <Field label="Nama Lengkap">
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    className={`${inputClass} pl-9`}
                                    value={profile.full_name}
                                    onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                                    placeholder="Nama lengkap sesuai identitas"
                                />
                            </div>
                        </Field>
                        <Field label="Email">
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    className={`${inputClass} pl-9 ${canEditEmail ? '' : 'bg-gray-50 text-gray-900 cursor-not-allowed'}`}
                                    value={profile.email}
                                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                                    readOnly={!canEditEmail}
                                    placeholder="nama@email.com"
                                    title={canEditEmail ? 'Isi email akun Anda' : 'Email akun sudah terdaftar'}
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                {canEditEmail ? 'Akun lama yang belum punya email bisa mengisinya di sini.' : 'Email ini sudah terhubung dengan akun Anda.'}
                            </p>
                        </Field>
                        <Field label="Nomor Telepon">
                            <input
                                className={inputClass}
                                value={profile.phone}
                                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                                placeholder="08xx-xxxx-xxxx"
                            />
                        </Field>
                        <Field label="Perusahaan / Instansi">
                            <input
                                className={inputClass}
                                value={profile.company}
                                onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                                placeholder="Nama perusahaan"
                            />
                        </Field>
                        <Field label="Jabatan / Posisi">
                            <input
                                className={inputClass}
                                value={profile.position}
                                onChange={e => setProfile(p => ({ ...p, position: e.target.value }))}
                                placeholder="Quality Manager, HSE Officer, dll."
                            />
                        </Field>
                        <Field label="Bio / Tentang Saya">
                            <textarea
                                className={`${inputClass} min-h-[100px]`}
                                value={profile.bio}
                                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                                placeholder="Ceritakan sedikit tentang Anda..."
                            />
                        </Field>
                    </div>

                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                        <Save className="w-4 h-4" /> Simpan Perubahan
                    </button>
                </form>
            </Section>

            <Section title="Affiliate & Referral">
                <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                                <Share2 className="h-5 w-5" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-emerald-900">
                                    Status affiliator: {affiliateStatusMap[affiliate?.status || 'none'] || 'Belum Mengajukan'}
                                </p>
                                <p className="text-sm text-emerald-800">
                                    {affiliate?.status === 'approved'
                                        ? 'Anda sudah bisa membagikan kode referral pribadi ke calon peserta.'
                                        : affiliate?.status === 'pending'
                                            ? 'Pengajuan affiliator Anda sedang ditinjau admin.'
                                            : 'Centang pengajuan affiliator saat pendaftaran akun baru, atau hubungi admin jika ingin diaktifkan untuk akun ini.'}
                                </p>
                                {affiliate?.review_notes && (
                                    <p className="text-xs text-emerald-700">Catatan admin: {affiliate.review_notes}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {affiliate?.code ? (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Kode Referral</p>
                                <p className="mt-2 text-lg font-black tracking-[0.16em] text-gray-900">{affiliate.code}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Order Berhasil</p>
                                <p className="mt-2 text-2xl font-black text-gray-900">{affiliate.total_referred_orders || 0}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Komisi Terkumpul</p>
                                <p className="mt-2 text-lg font-black text-emerald-700">
                                    Rp {Number(affiliate.total_commission || 0).toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                            Kode referral pribadi akan muncul di sini setelah pengajuan affiliator Anda disetujui admin.
                        </div>
                    )}
                </div>
            </Section>

            {/* Password */}
            <Section title="Keamanan & Password">
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <Field label="Password Lama">
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type={showOldPw ? 'text' : 'password'}
                                className={`${inputClass} pl-9 pr-10`}
                                value={passwords.old}
                                onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))}
                                placeholder="Password saat ini"
                            />
                            <button type="button" onClick={() => setShowOldPw(!showOldPw)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                                {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </Field>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Password Baru">
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type={showNewPw ? 'text' : 'password'}
                                    className={`${inputClass} pl-9 pr-10`}
                                    value={passwords.new}
                                    onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}
                                    placeholder="Min. 8 karakter"
                                />
                                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </Field>
                        <Field label="Konfirmasi Password">
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type={showConfirmPw ? 'text' : 'password'}
                                    className={`${inputClass} pl-9 pr-10`}
                                    value={passwords.confirm}
                                    onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                                    placeholder="Ulangi password baru"
                                />
                                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600" aria-label={showConfirmPw ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}>
                                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </Field>
                    </div>
                    {pwError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{pwError}</p>}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${passwords.new.length === 0 ? 'w-0' : passwords.new.length < 6 ? 'w-1/3 bg-red-400' : passwords.new.length < 10 ? 'w-2/3 bg-yellow-400' : 'w-full bg-green-500'}`}
                            />
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {passwords.new.length === 0 ? 'Kekuatan' : passwords.new.length < 6 ? 'Lemah' : passwords.new.length < 10 ? 'Sedang' : 'Kuat'}
                        </span>
                    </div>
                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors">
                        <Shield className="w-4 h-4" /> Perbarui Password
                    </button>
                </form>
            </Section>

            {/* Notifications */}
            <Section title="Preferensi Notifikasi">
                <div className="space-y-4">
                    {[
                        { key: 'email_schedule', label: 'Pengingat jadwal pelatihan & assessment', desc: 'Dapatkan email H-3 dan H-1 sebelum jadwal.' },
                        { key: 'email_cert', label: 'Notifikasi sertifikat baru', desc: 'Email saat sertifikat Anda siap diunduh.' },
                        { key: 'email_promo', label: 'Penawaran & program baru', desc: 'Informasi diskon dan kursus ISO terbaru.' },
                        { key: 'sms', label: 'Notifikasi SMS', desc: 'Pengingat assessment via pesan teks.' },
                    ].map(item => (
                        <div key={item.key} className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                                <p className="text-xs text-gray-500">{item.desc}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                                className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${notifs[item.key as keyof typeof notifs] ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${notifs[item.key as keyof typeof notifs] ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => void showSuccess('Preferensi notifikasi berhasil disimpan.', 'Preferensi Tersimpan')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 mt-2"
                >
                    <Save className="w-4 h-4" /> Simpan Preferensi
                </button>
            </Section>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[360px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
        }>
            <SettingsPageContent />
        </Suspense>
    );
}

