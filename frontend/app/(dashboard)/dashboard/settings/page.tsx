'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Lock, Bell, Shield, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';

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

export default function SettingsPage() {
    const [saved, setSaved] = useState(false);
    const [showOldPw, setShowOldPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [profile, setProfile] = useState({ name: '', email: '', phone: '', company: '', position: '' });
    const [notifs, setNotifs] = useState({ email_schedule: true, email_cert: true, email_promo: false, sms: false });
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
    const [pwError, setPwError] = useState('');

    useEffect(() => {
        // Decode JWT to prefill name/email
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setProfile(p => ({
                    ...p,
                    name: payload.username || '',
                    email: payload.email || '',
                }));
            } catch (_) { }
        }
    }, []);

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleChangePassword = (e: React.FormEvent) => {
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
        setSaved(true);
        setPasswords({ old: '', new: '', confirm: '' });
        setTimeout(() => setSaved(false), 2500);
    };

    const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all';

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pengaturan Akun</h1>
                    <p className="text-gray-500 mt-1">Kelola informasi profil dan preferensi akun Anda.</p>
                </div>
                {saved && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-xl">
                        <CheckCircle className="w-4 h-4" /> Tersimpan!
                    </div>
                )}
            </div>

            {/* Profile */}
            <Section title="Profil Saya">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                            {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{profile.name || 'User'}</p>
                            <p className="text-sm text-gray-500">{profile.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Nama Lengkap">
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    className={`${inputClass} pl-9`}
                                    value={profile.name}
                                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Nama lengkap"
                                />
                            </div>
                        </Field>
                        <Field label="Email">
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    className={`${inputClass} pl-9 bg-gray-50 text-gray-500 cursor-not-allowed`}
                                    value={profile.email}
                                    readOnly
                                    title="Email tidak dapat diubah"
                                />
                            </div>
                        </Field>
                        <Field label="Nomor Telepon">
                            <input
                                className={inputClass}
                                value={profile.phone}
                                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                                placeholder="08xx-xxxx-xxxx"
                            />
                        </Field>
                        <Field label="Perusahaan">
                            <input
                                className={inputClass}
                                value={profile.company}
                                onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                                placeholder="Nama perusahaan"
                            />
                        </Field>
                        <Field label="Jabatan / Posisi">
                            <input
                                className={`${inputClass} sm:col-span-2`}
                                value={profile.position}
                                onChange={e => setProfile(p => ({ ...p, position: e.target.value }))}
                                placeholder="Quality Manager, HSE Officer, dll."
                            />
                        </Field>
                    </div>

                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                        <Save className="w-4 h-4" /> Simpan Perubahan
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
                            <input
                                type="password"
                                className={inputClass}
                                value={passwords.confirm}
                                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                                placeholder="Ulangi password baru"
                            />
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
                        { key: 'email_schedule', label: 'Pengingat jadwal pelatihan & ujian', desc: 'Dapatkan email H-3 dan H-1 sebelum jadwal.' },
                        { key: 'email_cert', label: 'Notifikasi sertifikat baru', desc: 'Email saat sertifikat Anda siap diunduh.' },
                        { key: 'email_promo', label: 'Penawaran & program baru', desc: 'Informasi diskon dan kursus ISO terbaru.' },
                        { key: 'sms', label: 'Notifikasi SMS', desc: 'Pengingat ujian via pesan teks.' },
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
                    onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 mt-2"
                >
                    <Save className="w-4 h-4" /> Simpan Preferensi
                </button>
            </Section>
        </div>
    );
}
