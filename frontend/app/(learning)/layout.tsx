'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LearningLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    return (
        <div className="min-h-screen bg-white">
            {children}
        </div>
    );
}
