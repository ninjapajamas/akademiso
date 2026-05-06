'use client';

import { useCallback, useState, useEffect } from 'react';
import { User, Mail, Lock, Shield, Save, Eye, EyeOff, Signature, Landmark } from 'lucide-react';
import { getProfileDisplayName, splitFullName } from '@/utils/profile';
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

export default function InstructorSettingsPage() {
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
        npwp: '',
        bank_name: '',
        bank_account_number: '',
        bank_account_holder: '',
        avatar: null as string | null,
        signature_image: null as string | null
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
    const [pwError, setPwError] = useState('');
    const canEditEmail = !profile.email.trim();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const { showError, showSuccess } = useFeedbackModal();

    const resolveMediaUrl = (url: string | null) => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
        return `${apiUrl}${url}`;
    };

    const fetchProfile = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${apiUrl}/api/profile/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProfile({
                    full_name: getProfileDisplayName(data),
                    email: data.email,
                    phone: data.profile?.phone || '',
                    company: data.profile?.company || '',
                    position: data.profile?.position || '',
                    bio: data.profile?.bio || '',
                    npwp: data.profile?.npwp || '',
                    bank_name: data.profile?.bank_name || '',
                    bank_account_number: data.profile?.bank_account_number || '',
                    bank_account_holder: data.profile?.bank_account_holder || '',
                    avatar: data.profile?.avatar || null,
                    signature_image: data.instructor?.signature_image || null
                });
            }
        } catch (e) {
            console.error('Failed to fetch profile:', e);
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('access_token');
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
            formData.append('npwp', profile.npwp);
            formData.append('bank_name', profile.bank_name);
            formData.append('bank_account_number', profile.bank_account_number);
            formData.append('bank_account_holder', profile.bank_account_holder);

            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }
            if (signatureFile) {
                formData.append('signature_image', signatureFile);
            }

            const res = await fetch(`${apiUrl}/api/profile/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                setAvatarFile(null);
                setSignatureFile(null);
                await fetchProfile();
                await showSuccess('Profil trainer berhasil diperbarui.', 'Profil Tersimpan');
            } else {
                await showError('Profil trainer belum bisa disimpan. Silakan coba lagi.', 'Penyimpanan Gagal');
            }
        } catch (e) {
            console.error('Save error:', e);
            await showError('Terjadi kesalahan koneksi saat menyimpan profil trainer.', 'Koneksi Bermasalah');
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
                await showSuccess('Password trainer berhasil diperbarui.', 'Password Diperbarui');
            } else {
                setPwError('Gagal memperbarui password');
            }
        } catch {
            setPwError('Kesalahan sistem');
        }
    };

    const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all';

    if (loading) {
        return (
            <div className="flex min-h-[360px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pengaturan Trainer</h1>
                    <p className="text-gray-500 mt-1">Kelola biodata dan profil publik Anda sebagai pengajar.</p>
                </div>
            </div>

            {/* Profile */}
            <Section title="Profil Publik Trainer">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                    {/* Avatar */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-gray-50">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg overflow-hidden border-4 border-white">
                                {profile.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={resolveMediaUrl(profile.avatar) || ''} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    (profile.full_name?.trim().charAt(0) || 'I').toUpperCase()
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

                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                                    <Signature className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Tanda Tangan Sertifikat</h3>
                                    <p className="mt-1 text-sm text-indigo-700">
                                        File ini menjadi tanda tangan otomatis pada sertifikat peserta bila template course tidak memakai tanda tangan khusus.
                                    </p>
                                </div>
                            </div>
                            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700">
                                Upload Tanda Tangan
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setSignatureFile(file);
                                            setProfile(p => ({ ...p, signature_image: URL.createObjectURL(file) }));
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-white p-4">
                            {profile.signature_image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={resolveMediaUrl(profile.signature_image) || ''}
                                    alt="Tanda tangan trainer"
                                    className="max-h-24 max-w-full object-contain"
                                />
                            ) : (
                                <p className="text-center text-sm font-medium text-gray-400">
                                    Belum ada tanda tangan. Gunakan PNG transparan agar hasil PDF lebih rapi.
                                </p>
                            )}
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
                                    placeholder="Nama lengkap"
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
                                {canEditEmail ? 'Jika akun ini belum punya email, Anda bisa menambahkannya di sini.' : 'Email ini sudah terhubung dengan akun Anda.'}
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
                        <Field label="Title / Keahlian">
                            <input
                                className={inputClass}
                                value={profile.position}
                                onChange={e => setProfile(p => ({ ...p, position: e.target.value }))}
                                placeholder="ISO 9001 Lead Auditor, dll."
                            />
                        </Field>
                        <Field label="Bio / Deskripsi Profil">
                            <textarea
                                className={`${inputClass} min-h-[120px]`}
                                value={profile.bio}
                                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                                placeholder="Tuliskan pengalaman dan keahlian Anda untuk dilihat calon peserta kursus..."
                            />
                        </Field>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                        <div className="mb-4 flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                                <Landmark className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Data Pencairan Fee Trainer</h3>
                                <p className="mt-1 text-sm text-emerald-800">
                                    Data ini dipakai saat Anda mengajukan pencairan fee ke akunting melalui sistem.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="NPWP">
                                <input
                                    className={inputClass}
                                    value={profile.npwp}
                                    onChange={e => setProfile(p => ({ ...p, npwp: e.target.value }))}
                                    placeholder="00.000.000.0-000.000"
                                />
                            </Field>
                            <Field label="Nama Bank">
                                <input
                                    className={inputClass}
                                    value={profile.bank_name}
                                    onChange={e => setProfile(p => ({ ...p, bank_name: e.target.value }))}
                                    placeholder="BCA, Mandiri, BNI, dll."
                                />
                            </Field>
                            <Field label="Nomor Rekening">
                                <input
                                    className={inputClass}
                                    value={profile.bank_account_number}
                                    onChange={e => setProfile(p => ({ ...p, bank_account_number: e.target.value }))}
                                    placeholder="1234567890"
                                />
                            </Field>
                            <Field label="Nama Pemilik Rekening">
                                <input
                                    className={inputClass}
                                    value={profile.bank_account_holder}
                                    onChange={e => setProfile(p => ({ ...p, bank_account_holder: e.target.value }))}
                                    placeholder="Nama sesuai rekening"
                                />
                            </Field>
                        </div>
                    </div>

                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">
                        <Save className="w-4 h-4" /> Perbarui Profil Trainer
                    </button>
                </form>
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
                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors">
                        <Shield className="w-4 h-4" /> Perbarui Password
                    </button>
                </form>
            </Section>
        </div>
    );
}
