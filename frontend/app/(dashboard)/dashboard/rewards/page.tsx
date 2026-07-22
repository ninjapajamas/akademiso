'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { GamificationReward, GamificationRewardsPayload } from '@/types';
import { CheckCircle2, Crown, Gift, Loader2, Lock, PartyPopper, Rocket, Sparkles, Star, Trophy, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const confettiColors = ['#2563eb', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

function RewardIcon({ icon, className = 'h-7 w-7' }: { icon: string; className?: string }) {
    if (icon === 'rocket') return <Rocket className={className} />;
    if (icon === 'star') return <Star className={className} />;
    if (icon === 'trophy') return <Trophy className={className} />;
    if (icon === 'crown') return <Crown className={className} />;
    return <Gift className={className} />;
}

function accentClasses(accent: string) {
    const styles: Record<string, string> = {
        blue: 'from-blue-500 to-indigo-600 shadow-blue-500/20',
        cyan: 'from-cyan-500 to-blue-600 shadow-cyan-500/20',
        amber: 'from-amber-400 to-orange-500 shadow-amber-500/20',
        rose: 'from-rose-500 to-pink-600 shadow-rose-500/20',
        violet: 'from-violet-500 to-fuchsia-600 shadow-violet-500/20',
    };
    return styles[accent] || styles.blue;
}

export default function RewardsPage() {
    const [payload, setPayload] = useState<GamificationRewardsPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [claimingKey, setClaimingKey] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [celebration, setCelebration] = useState<GamificationReward | null>(null);

    const fetchRewards = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const response = await fetch(`${apiUrl}/api/gamification/rewards/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Reward belum bisa dimuat.');
            setPayload(await response.json());
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'Reward belum bisa dimuat.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchRewards();
    }, []);

    useEffect(() => {
        if (!celebration) return;
        const timer = window.setTimeout(() => setCelebration(null), 2400);
        return () => window.clearTimeout(timer);
    }, [celebration]);

    const claimReward = async (reward: GamificationReward) => {
        setClaimingKey(reward.key);
        setError('');
        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const response = await fetch(`${apiUrl}/api/gamification/rewards/${reward.key}/claim/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Reward belum bisa diklaim.');
            setPayload(data);
            setCelebration(reward);
        } catch (claimError) {
            setError(claimError instanceof Error ? claimError.message : 'Reward belum bisa diklaim.');
        } finally {
            setClaimingKey(null);
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            {celebration && (
                <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden="true">
                    {Array.from({ length: 30 }).map((_, index) => (
                        <span
                            key={index}
                            className="reward-confetti absolute -top-8 h-3 w-2 rounded-sm"
                            style={{
                                left: `${3 + ((index * 31) % 94)}%`,
                                backgroundColor: confettiColors[index % confettiColors.length],
                                animationDelay: `${(index % 8) * 70}ms`,
                                animationDuration: `${1500 + (index % 6) * 120}ms`,
                                transform: `rotate(${index * 23}deg)`,
                            }}
                        />
                    ))}
                    <div className="absolute left-1/2 top-1/2 w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-amber-200 bg-white/95 p-7 text-center shadow-2xl backdrop-blur">
                        <PartyPopper className="mx-auto h-12 w-12 text-amber-500" />
                        <p className="mt-3 text-xs font-black uppercase tracking-[0.24em] text-amber-500">Reward Diklaim!</p>
                        <h2 className="mt-2 text-2xl font-black text-slate-950">{celebration.title}</h2>
                        <p className="mt-2 font-bold text-blue-600">+{celebration.bonus_xp} bonus XP</p>
                    </div>
                </div>
            )}

            <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-500 p-6 text-white shadow-xl shadow-blue-500/15 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100">
                            <Sparkles className="h-4 w-4" /> Akademiso Reward
                        </div>
                        <h1 className="mt-3 text-3xl font-black">XP Anda, hadiah Anda!</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">Kumpulkan XP dari materi, quiz, course, dan sertifikat. Setiap milestone membuka hadiah bonus XP yang hanya bisa diklaim satu kali.</p>
                    </div>
                    <div className="min-w-40 rounded-3xl bg-white/15 p-5 text-center backdrop-blur-sm">
                        <Zap className="mx-auto h-7 w-7 text-yellow-300" />
                        <p className="mt-2 text-3xl font-black">{loading ? '...' : payload?.total_xp || 0}</p>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Total XP</p>
                    </div>
                </div>
            </section>

            {error && <p className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{error}</p>}

            {loading ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map(item => <div key={item} className="h-72 animate-pulse rounded-[2rem] bg-white" />)}
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {(payload?.rewards || []).map(reward => (
                        <article key={reward.key} className={`relative overflow-hidden rounded-[2rem] border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${reward.claimed ? 'border-emerald-200' : reward.unlocked ? 'border-blue-200' : 'border-slate-100'}`}>
                            <div className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br text-white shadow-lg ${accentClasses(reward.accent_color)}`}>
                                <RewardIcon icon={reward.icon} />
                            </div>
                            <div className="mt-5 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Milestone {reward.required_xp} XP</p>
                                    <h2 className="mt-1 text-xl font-black text-slate-950">{reward.title}</h2>
                                </div>
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600">+{reward.bonus_xp} XP</span>
                            </div>
                            <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">{reward.description}</p>

                            <div className="mt-5">
                                <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                                    <span>{reward.claimed ? 'Sudah diklaim' : reward.unlocked ? 'Siap diklaim' : `${reward.xp_remaining} XP lagi`}</span>
                                    <span>{reward.progress_percentage}%</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div className={`h-full rounded-full bg-gradient-to-r ${accentClasses(reward.accent_color)}`} style={{ width: `${reward.progress_percentage}%` }} />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => void claimReward(reward)}
                                disabled={!reward.unlocked || reward.claimed || claimingKey === reward.key}
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                {claimingKey === reward.key ? <Loader2 className="h-4 w-4 animate-spin" /> : reward.claimed ? <CheckCircle2 className="h-4 w-4" /> : reward.unlocked ? <Gift className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                {claimingKey === reward.key ? 'Mengklaim...' : reward.claimed ? 'Sudah Diklaim' : reward.unlocked ? 'Klaim Hadiah' : `Terkunci • ${reward.required_xp} XP`}
                            </button>
                        </article>
                    ))}
                </div>
            )}

            <style jsx>{`
                @keyframes reward-fall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
                .reward-confetti { animation-name: reward-fall; animation-timing-function: cubic-bezier(.2,.7,.2,1); animation-fill-mode: forwards; }
            `}</style>
        </div>
    );
}
