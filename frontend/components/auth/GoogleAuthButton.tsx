'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { decodeJwtPayload, getPortalPathForRole, getRoleFromPayload } from '@/utils/auth';
import { getClientApiBaseUrl } from '@/utils/api';

type GoogleAuthButtonProps = {
    mode: 'login' | 'register';
    redirectTo?: string;
    onError?: (message: string) => void;
    note?: string;
};

function GoogleAuthButtonInner({ mode, redirectTo, onError, note }: GoogleAuthButtonProps) {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [buttonWidth, setButtonWidth] = useState(360);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof ResizeObserver === 'undefined') return undefined;

        const updateWidth = () => {
            const nextWidth = Math.max(220, Math.floor(container.getBoundingClientRect().width));
            setButtonWidth(nextWidth);
        };

        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const parseGoogleError = (data: unknown) => {
        if (!data || typeof data !== 'object') {
            return mode === 'login'
                ? 'Login Google belum berhasil. Silakan coba lagi.'
                : 'Pendaftaran dengan Google belum berhasil. Silakan coba lagi.';
        }

        const payload = data as Record<string, unknown>;
        if (typeof payload.credential === 'string') return payload.credential;
        if (Array.isArray(payload.credential) && typeof payload.credential[0] === 'string') {
            return payload.credential[0];
        }
        if (typeof payload.detail === 'string') return payload.detail;
        if (typeof payload.error === 'string') return payload.error;

        return mode === 'login'
            ? 'Login Google belum berhasil. Silakan coba lagi.'
            : 'Pendaftaran dengan Google belum berhasil. Silakan coba lagi.';
    };

    const handleGoogleSuccess = async (credential: string | undefined) => {
        if (!credential || isSubmitting) return;

        setIsSubmitting(true);
        onError?.('');

        try {
            const apiUrl = getClientApiBaseUrl();
            const response = await fetch(`${apiUrl}/api/auth/google/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ credential }),
            });

            const data = await response.json();
            if (!response.ok) {
                onError?.(parseGoogleError(data));
                return;
            }

            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);

            const payload = decodeJwtPayload(data.access);
            const role = getRoleFromPayload(payload);
            router.push(data.redirect_to || redirectTo || getPortalPathForRole(role));
        } catch {
            onError?.('Koneksi ke server gagal saat memproses login Google.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <div ref={containerRef} className="flex justify-center">
                <GoogleLogin
                    onSuccess={(credentialResponse) => handleGoogleSuccess(credentialResponse.credential)}
                    onError={() => onError?.('Google Sign-In dibatalkan atau gagal dimuat.')}
                    text={mode === 'login' ? 'continue_with' : 'signup_with'}
                    theme="outline"
                    shape="pill"
                    size="large"
                    width={String(buttonWidth)}
                />
            </div>
            {note && (
                <p className="text-center text-xs leading-relaxed text-gray-500">
                    {note}
                </p>
            )}
        </div>
    );
}

export default function GoogleAuthButton(props: GoogleAuthButtonProps) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

    if (!clientId) {
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Login Google belum aktif karena `NEXT_PUBLIC_GOOGLE_CLIENT_ID` belum diatur.
            </div>
        );
    }

    return (
        <GoogleOAuthProvider clientId={clientId}>
            <GoogleAuthButtonInner {...props} />
        </GoogleOAuthProvider>
    );
}
