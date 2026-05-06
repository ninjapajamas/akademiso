'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from 'lucide-react';

type FeedbackTone = 'success' | 'error' | 'warning' | 'info';

interface AlertOptions {
    title?: string;
    message: string;
    tone?: FeedbackTone;
    confirmLabel?: string;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    tone?: Exclude<FeedbackTone, 'success'> | 'success';
    confirmLabel?: string;
    cancelLabel?: string;
}

interface PromptOptions {
    title?: string;
    message: string;
    tone?: Exclude<FeedbackTone, 'success'> | 'success';
    confirmLabel?: string;
    cancelLabel?: string;
    initialValue?: string;
    placeholder?: string;
    multiline?: boolean;
}

interface FeedbackModalContextValue {
    showAlert: (options: AlertOptions) => Promise<void>;
    showSuccess: (message: string, title?: string) => Promise<void>;
    showError: (message: string, title?: string) => Promise<void>;
    showWarning: (message: string, title?: string) => Promise<void>;
    confirmAction: (options: ConfirmOptions) => Promise<boolean>;
    promptAction: (options: PromptOptions) => Promise<string | null>;
}

type ModalState =
    | ({ kind: 'alert' } & Required<Pick<AlertOptions, 'message'>> & Omit<AlertOptions, 'message'>)
    | ({ kind: 'confirm' } & Required<Pick<ConfirmOptions, 'message'>> & Omit<ConfirmOptions, 'message'>)
    | ({ kind: 'prompt' } & Required<Pick<PromptOptions, 'message'>> & Omit<PromptOptions, 'message'>);

const FeedbackModalContext = createContext<FeedbackModalContextValue | null>(null);

function getDefaultTitle(tone: FeedbackTone, kind: 'alert' | 'confirm' | 'prompt') {
    if (kind === 'confirm') {
        return tone === 'error' ? 'Yakin Ingin Melanjutkan?' : 'Konfirmasi Tindakan';
    }

    if (kind === 'prompt') {
        return 'Lengkapi Informasi';
    }

    switch (tone) {
        case 'success':
            return 'Berhasil';
        case 'error':
            return 'Operasi Belum Berhasil';
        case 'warning':
            return 'Perhatian';
        default:
            return 'Informasi';
    }
}

function getToneMeta(tone: FeedbackTone) {
    switch (tone) {
        case 'success':
            return {
                icon: CheckCircle2,
                iconWrapClass: 'bg-emerald-100 text-emerald-600',
                confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-700',
            };
        case 'error':
            return {
                icon: OctagonAlert,
                iconWrapClass: 'bg-rose-100 text-rose-600',
                confirmButtonClass: 'bg-rose-600 hover:bg-rose-700',
            };
        case 'warning':
            return {
                icon: AlertTriangle,
                iconWrapClass: 'bg-amber-100 text-amber-600',
                confirmButtonClass: 'bg-amber-600 hover:bg-amber-700',
            };
        default:
            return {
                icon: Info,
                iconWrapClass: 'bg-sky-100 text-sky-600',
                confirmButtonClass: 'bg-sky-600 hover:bg-sky-700',
            };
    }
}

export function FeedbackModalProvider({ children }: { children: React.ReactNode }) {
    const [modal, setModal] = useState<ModalState | null>(null);
    const [promptValue, setPromptValue] = useState('');
    const resolverRef = useRef<((value?: boolean | string | null) => void) | null>(null);

    const closeAlert = useCallback(() => {
        const resolver = resolverRef.current;
        resolverRef.current = null;
        setPromptValue('');
        setModal(null);
        resolver?.();
    }, []);

    const resolveConfirm = useCallback((value: boolean) => {
        const resolver = resolverRef.current;
        resolverRef.current = null;
        setPromptValue('');
        setModal(null);
        resolver?.(value);
    }, []);

    const resolvePrompt = useCallback((value: string | null) => {
        const resolver = resolverRef.current;
        resolverRef.current = null;
        setPromptValue('');
        setModal(null);
        resolver?.(value);
    }, []);

    const showAlert = useCallback((options: AlertOptions) => {
        return new Promise<void>((resolve) => {
            resolverRef.current = () => resolve();
            setModal({
                kind: 'alert',
                tone: options.tone || 'info',
                title: options.title,
                message: options.message,
                confirmLabel: options.confirmLabel,
            });
        });
    }, []);

    const confirmAction = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            resolverRef.current = (value) => resolve(Boolean(value));
            setModal({
                kind: 'confirm',
                tone: options.tone || 'warning',
                title: options.title,
                message: options.message,
                confirmLabel: options.confirmLabel,
                cancelLabel: options.cancelLabel,
            });
        });
    }, []);

    const promptAction = useCallback((options: PromptOptions) => {
        return new Promise<string | null>((resolve) => {
            resolverRef.current = (value) => resolve(typeof value === 'string' ? value : null);
            setPromptValue(options.initialValue || '');
            setModal({
                kind: 'prompt',
                tone: options.tone || 'info',
                title: options.title,
                message: options.message,
                confirmLabel: options.confirmLabel,
                cancelLabel: options.cancelLabel,
                initialValue: options.initialValue,
                placeholder: options.placeholder,
                multiline: options.multiline,
            });
        });
    }, []);

    const value = useMemo<FeedbackModalContextValue>(() => ({
        showAlert,
        showSuccess: (message, title) => showAlert({ message, title: title || 'Berhasil', tone: 'success' }),
        showError: (message, title) => showAlert({ message, title: title || 'Operasi Belum Berhasil', tone: 'error' }),
        showWarning: (message, title) => showAlert({ message, title: title || 'Perhatian', tone: 'warning' }),
        confirmAction,
        promptAction,
    }), [confirmAction, promptAction, showAlert]);

    const tone = modal?.tone || 'info';
    const meta = getToneMeta(tone);
    const Icon = meta.icon;
    const title = modal ? (modal.title || getDefaultTitle(tone, modal.kind)) : '';

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const nativeAlert = window.alert.bind(window);
        window.alert = (message?: string) => {
            void showAlert({
                message: typeof message === 'string' ? message : String(message ?? ''),
                tone: 'info',
            });
        };

        return () => {
            window.alert = nativeAlert;
        };
    }, [showAlert]);

    return (
        <FeedbackModalContext.Provider value={value}>
            {children}

            {modal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/20">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${meta.iconWrapClass}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                                    <p className="mt-2 text-sm leading-6 text-gray-600">{modal.message}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (modal.kind === 'confirm') {
                                        resolveConfirm(false);
                                        return;
                                    }

                                    if (modal.kind === 'prompt') {
                                        resolvePrompt(null);
                                        return;
                                    }

                                    closeAlert();
                                }}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Tutup modal"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {modal.kind === 'prompt' && (
                            modal.multiline ? (
                                <textarea
                                    value={promptValue}
                                    onChange={(event) => setPromptValue(event.target.value)}
                                    placeholder={modal.placeholder}
                                    className="mt-5 min-h-[120px] w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                            ) : (
                                <input
                                    value={promptValue}
                                    onChange={(event) => setPromptValue(event.target.value)}
                                    placeholder={modal.placeholder}
                                    className="mt-5 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                            )
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            {(modal.kind === 'confirm' || modal.kind === 'prompt') && (
                                <button
                                    type="button"
                                    onClick={() => modal.kind === 'confirm' ? resolveConfirm(false) : resolvePrompt(null)}
                                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                >
                                    {modal.cancelLabel || 'Batal'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    if (modal.kind === 'confirm') {
                                        resolveConfirm(true);
                                        return;
                                    }

                                    if (modal.kind === 'prompt') {
                                        resolvePrompt(promptValue);
                                        return;
                                    }

                                    closeAlert();
                                }}
                                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${meta.confirmButtonClass}`}
                            >
                                {modal.confirmLabel || (modal.kind === 'confirm' ? 'Ya, Lanjutkan' : modal.kind === 'prompt' ? 'Simpan' : 'Tutup')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </FeedbackModalContext.Provider>
    );
}

export function useFeedbackModal() {
    const context = useContext(FeedbackModalContext);
    if (!context) {
        throw new Error('useFeedbackModal harus digunakan di dalam FeedbackModalProvider.');
    }
    return context;
}
