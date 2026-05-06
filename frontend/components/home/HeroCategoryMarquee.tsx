'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
    Award,
    CheckCircle,
    ClipboardCheck,
    Leaf,
    ShieldCheck,
    type LucideIcon,
} from 'lucide-react';

type CategoryChip = {
    slug: string;
    name: string;
};

type RowProps = {
    categories: CategoryChip[];
    direction: 'left' | 'right';
    speed: number;
};

function getCategoryCardMeta(categoryName: string): {
    icon: LucideIcon;
    badge: string;
    tone: string;
} {
    const normalized = categoryName.toLowerCase();

    if (normalized.includes('k3') || normalized.includes('safety') || normalized.includes('45001')) {
        return {
            icon: ClipboardCheck,
            badge: 'Keselamatan',
            tone: 'from-amber-50 via-orange-50 to-white text-amber-700 border-amber-200',
        };
    }

    if (normalized.includes('lingkungan') || normalized.includes('environment') || normalized.includes('14001')) {
        return {
            icon: Leaf,
            badge: 'Lingkungan',
            tone: 'from-emerald-50 via-green-50 to-white text-emerald-700 border-emerald-200',
        };
    }

    if (normalized.includes('keamanan') || normalized.includes('security') || normalized.includes('27001')) {
        return {
            icon: ShieldCheck,
            badge: 'Keamanan',
            tone: 'from-sky-50 via-blue-50 to-white text-sky-700 border-sky-200',
        };
    }

    if (normalized.includes('audit') || normalized.includes('compliance') || normalized.includes('sertifikasi')) {
        return {
            icon: CheckCircle,
            badge: 'Compliance',
            tone: 'from-violet-50 via-indigo-50 to-white text-violet-700 border-violet-200',
        };
    }

    return {
        icon: Award,
        badge: 'Topik Populer',
        tone: 'from-slate-50 via-blue-50 to-white text-slate-700 border-slate-200',
    };
}

function HeroCategoryCard({ category }: { category: CategoryChip }) {
    const { icon: Icon, badge, tone } = getCategoryCardMeta(category.name);

    return (
        <Link
            href="/courses"
            className={`inline-flex h-12 shrink-0 items-center gap-2 rounded-full border bg-gradient-to-br px-3 py-2 shadow-sm transition-transform hover:-translate-y-0.5 ${tone}`}
        >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/85 shadow-sm">
                <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 leading-none">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500">
                    {badge}
                </p>
                <p className="mt-1 whitespace-nowrap text-xs font-bold text-gray-900 sm:text-[13px]">
                    {category.name}
                </p>
            </div>
        </Link>
    );
}

function MarqueeRow({ categories, direction, speed }: RowProps) {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const frameRef = useRef<number | null>(null);
    const previousTimeRef = useRef<number | null>(null);
    const offsetRef = useRef(direction === 'right' ? -50 : 0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mediaQuery.matches) return;

        const animate = (time: number) => {
            if (previousTimeRef.current === null) {
                previousTimeRef.current = time;
            }

            const delta = time - previousTimeRef.current;
            previousTimeRef.current = time;

            if (!isPaused) {
                const movement = (speed * delta) / 1000;
                if (direction === 'left') {
                    offsetRef.current -= movement;
                    if (offsetRef.current <= -50) {
                        offsetRef.current = 0;
                    }
                } else {
                    offsetRef.current += movement;
                    if (offsetRef.current >= 0) {
                        offsetRef.current = -50;
                    }
                }

                if (trackRef.current) {
                    trackRef.current.style.transform = `translate3d(${offsetRef.current}%, 0, 0)`;
                }
            }

            frameRef.current = window.requestAnimationFrame(animate);
        };

        frameRef.current = window.requestAnimationFrame(animate);

        return () => {
            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
            }
        };
    }, [direction, isPaused, speed]);

    const items = [...categories, ...categories];

    return (
        <div
            className="relative overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            style={{
                maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            }}
        >
            <div
                ref={trackRef}
                className="flex w-max gap-3 py-1 will-change-transform"
                style={{ transform: direction === 'right' ? 'translate3d(-50%, 0, 0)' : 'translate3d(0%, 0, 0)' }}
            >
                {items.map((category, index) => (
                    <HeroCategoryCard key={`${category.slug}-${direction}-${index}`} category={category} />
                ))}
            </div>
        </div>
    );
}

export default function HeroCategoryMarquee({ categories }: { categories: CategoryChip[] }) {
    const midpoint = Math.ceil(categories.length / 2);
    const topCategoryChips = categories.slice(0, midpoint);
    const bottomCategoryChips = categories.slice(midpoint);
    const lowerRowCategories = bottomCategoryChips.length > 0 ? bottomCategoryChips : categories;

    return (
        <div className="space-y-3">
            <MarqueeRow categories={topCategoryChips} direction="right" speed={8} />
            <MarqueeRow categories={lowerRowCategories} direction="left" speed={7} />
        </div>
    );
}
