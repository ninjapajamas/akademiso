'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import Link from 'next/link';
import { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { Award, Copy, Eye, Expand, FileImage, ImagePlus, Plus, Save, Signature, Trash2, X } from 'lucide-react';
import { CertificateTemplate, CertificateTemplateLayout, Course } from '@/types';
import { useFeedbackModal } from '@/components/FeedbackModalProvider';

type Align = 'left' | 'center' | 'right';
type DraggingElement = { key: keyof CertificateTemplateLayout; kind: 'text' | 'image' } | null;

interface TemplateFormState {
    id: number | null;
    name: string;
    course_id: string;
    orientation: 'landscape' | 'portrait';
    page_width: number;
    page_height: number;
    signer_name: string;
    signer_title: string;
    notes: string;
    is_active: boolean;
    background_image: string | null;
    background_file: File | null;
    signature_image: string | null;
    signature_file: File | null;
    layout_config: CertificateTemplateLayout;
}

type PersistedTemplateFormState = Omit<TemplateFormState, 'background_file' | 'signature_file'>;

interface PersistedTemplateEditorState {
    isCreatingNewTemplate: boolean;
    form: PersistedTemplateFormState;
}

const DEFAULT_LAYOUT: CertificateTemplateLayout = {
    recipient_name: { x: 50, y: 42, fontSize: 54, fontWeight: 700, color: '#000000', align: 'center' },
    course_title: { x: 50, y: 55, fontSize: 28, fontWeight: 600, color: '#000000', align: 'center' },
    issue_date: { x: 72, y: 79, fontSize: 18, fontWeight: 500, color: '#000000', align: 'left' },
    certificate_number: { x: 16, y: 86, fontSize: 16, fontWeight: 500, color: '#000000', align: 'left' },
    signature_image: { x: 72, y: 63, width: 18, height: 10, align: 'center' },
    signer_name: { x: 72, y: 75, fontSize: 20, fontWeight: 700, color: '#000000', align: 'center' },
    signer_title: { x: 72, y: 80, fontSize: 15, fontWeight: 500, color: '#000000', align: 'center' },
};

const TEXT_ELEMENTS: Array<{ key: keyof CertificateTemplateLayout; label: string }> = [
    { key: 'recipient_name', label: 'Nama Peserta' },
    { key: 'course_title', label: 'Judul Sertifikat / Kursus' },
    { key: 'issue_date', label: 'Tanggal Terbit' },
    { key: 'certificate_number', label: 'Nomor Sertifikat' },
    { key: 'signer_name', label: 'Nama Penandatangan' },
    { key: 'signer_title', label: 'Jabatan Penandatangan' },
];

const IMAGE_ELEMENTS: Array<{ key: keyof CertificateTemplateLayout; label: string }> = [
    { key: 'signature_image', label: 'Tanda Tangan' },
];

function createEmptyForm(): TemplateFormState {
    return {
        id: null,
        name: '',
        course_id: '',
        orientation: 'landscape',
        page_width: 1600,
        page_height: 1200,
        signer_name: '',
        signer_title: '',
        notes: '',
        is_active: true,
        background_image: null,
        background_file: null,
        signature_image: null,
        signature_file: null,
        layout_config: JSON.parse(JSON.stringify(DEFAULT_LAYOUT)),
    };
}

function mergeLayout(layout?: Partial<CertificateTemplateLayout> | null): CertificateTemplateLayout {
    return {
        recipient_name: { ...DEFAULT_LAYOUT.recipient_name, ...(layout?.recipient_name || {}) },
        course_title: { ...DEFAULT_LAYOUT.course_title, ...(layout?.course_title || {}) },
        issue_date: { ...DEFAULT_LAYOUT.issue_date, ...(layout?.issue_date || {}) },
        certificate_number: { ...DEFAULT_LAYOUT.certificate_number, ...(layout?.certificate_number || {}) },
        signature_image: { ...DEFAULT_LAYOUT.signature_image, ...(layout?.signature_image || {}) },
        signer_name: { ...DEFAULT_LAYOUT.signer_name, ...(layout?.signer_name || {}) },
        signer_title: { ...DEFAULT_LAYOUT.signer_title, ...(layout?.signer_title || {}) },
    };
}

function normalizeCoursesResponse(payload: unknown): Course[] {
    if (Array.isArray(payload)) return payload as Course[];
    if (payload && typeof payload === 'object') {
        const candidate = (payload as { results?: unknown; courses?: unknown }).results
            ?? (payload as { results?: unknown; courses?: unknown }).courses;
        if (Array.isArray(candidate)) return candidate as Course[];
    }
    return [];
}

function normalizeTemplatesResponse(payload: unknown): CertificateTemplate[] {
    if (Array.isArray(payload)) return payload as CertificateTemplate[];
    if (payload && typeof payload === 'object') {
        const candidate = (payload as { results?: unknown; templates?: unknown }).results
            ?? (payload as { results?: unknown; templates?: unknown }).templates;
        if (Array.isArray(candidate)) return candidate as CertificateTemplate[];
    }
    return [];
}

function getAlignStyle(align: Align) {
    if (align === 'center') return { transform: 'translateX(-50%)', textAlign: 'center' as const };
    if (align === 'right') return { transform: 'translateX(-100%)', textAlign: 'right' as const };
    return { transform: 'translateX(0)', textAlign: 'left' as const };
}

function clampPercentage(value: number) {
    return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

const FORM_INPUT_CLASSNAME = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400';
const FORM_COMPACT_INPUT_CLASSNAME = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400';
const FORM_SELECT_CLASSNAME = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const FORM_COMPACT_SELECT_CLASSNAME = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const FORM_TEXTAREA_CLASSNAME = 'h-24 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400';
const FORM_FILE_INPUT_CLASSNAME = 'mt-4 block w-full text-sm text-gray-900 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-200';
const TEMPLATE_EDITOR_STORAGE_KEY = 'admin-certificate-template-editor';

function cloneLayout(layout: CertificateTemplateLayout): CertificateTemplateLayout {
    return JSON.parse(JSON.stringify(layout)) as CertificateTemplateLayout;
}

function restoreFormState(saved?: Partial<PersistedTemplateFormState> | null): TemplateFormState {
    const empty = createEmptyForm();

    return {
        ...empty,
        ...saved,
        id: typeof saved?.id === 'number' ? saved.id : null,
        course_id: typeof saved?.course_id === 'string' ? saved.course_id : '',
        orientation: saved?.orientation === 'portrait' ? 'portrait' : 'landscape',
        page_width: typeof saved?.page_width === 'number' ? saved.page_width : empty.page_width,
        page_height: typeof saved?.page_height === 'number' ? saved.page_height : empty.page_height,
        signer_name: typeof saved?.signer_name === 'string' ? saved.signer_name : '',
        signer_title: typeof saved?.signer_title === 'string' ? saved.signer_title : '',
        notes: typeof saved?.notes === 'string' ? saved.notes : '',
        is_active: typeof saved?.is_active === 'boolean' ? saved.is_active : empty.is_active,
        background_image: saved?.background_image ?? null,
        background_file: null,
        signature_image: saved?.signature_image ?? null,
        signature_file: null,
        layout_config: mergeLayout(saved?.layout_config),
    };
}

function persistableForm(form: TemplateFormState): PersistedTemplateFormState {
    return {
        id: form.id,
        name: form.name,
        course_id: form.course_id,
        orientation: form.orientation,
        page_width: form.page_width,
        page_height: form.page_height,
        signer_name: form.signer_name,
        signer_title: form.signer_title,
        notes: form.notes,
        is_active: form.is_active,
        background_image: form.background_image,
        signature_image: form.signature_image,
        layout_config: cloneLayout(form.layout_config),
    };
}

function upsertTemplateList(templates: CertificateTemplate[], template: CertificateTemplate): CertificateTemplate[] {
    const next = templates.filter(item => item.id !== template.id);
    return [template, ...next];
}

function mergeTemplateLists(current: CertificateTemplate[], incoming: CertificateTemplate[]): CertificateTemplate[] {
    if (incoming.length === 0) return current;

    const merged = [...incoming];

    current.forEach(template => {
        if (!merged.some(item => item.id === template.id)) {
            merged.push(template);
        }
    });

    return merged;
}

export default function AdminCertificateTemplatesPage() {
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isCreatingNewTemplate, setIsCreatingNewTemplate] = useState(false);
    const [form, setForm] = useState<TemplateFormState>(createEmptyForm);
    const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
    const [draggingElement, setDraggingElement] = useState<DraggingElement>(null);
    const [editorReady, setEditorReady] = useState(false);
    const previewCanvasRef = useRef<HTMLDivElement | null>(null);
    const templatesRef = useRef<CertificateTemplate[]>([]);
    const { confirmAction, showAlert, showError, showSuccess } = useFeedbackModal();

    const apiUrl = getClientApiBaseUrl();
    const token = () => localStorage.getItem('access_token');

    const activeCourse = courses.find(course => String(course.id) === form.course_id) || null;
    const previewValues = {
        recipient_name: 'Rifqi Ramadhan',
        course_title: activeCourse?.title || 'Lead Auditor ISO 9001:2015',
        issue_date: '14 Mar 2026',
        certificate_number: 'CERT-AKD-2026-001',
        signer_name: form.signer_name || 'Nama Penandatangan',
        signer_title: form.signer_title || 'Jabatan Penandatangan',
    };

    useEffect(() => {
        templatesRef.current = templates;
    }, [templates]);

    const readPersistedEditorState = (): PersistedTemplateEditorState | null => {
        try {
            const raw = window.localStorage.getItem(TEMPLATE_EDITOR_STORAGE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw) as PersistedTemplateEditorState;
            if (!parsed || typeof parsed !== 'object' || !parsed.form) return null;

            return {
                isCreatingNewTemplate: Boolean(parsed.isCreatingNewTemplate),
                form: parsed.form,
            };
        } catch {
            return null;
        }
    };

    const selectTemplate = (template: CertificateTemplate) => {
        setIsCreatingNewTemplate(false);
        setForm({
            id: template.id,
            name: template.name,
            course_id: template.course ? String(template.course) : '',
            orientation: template.orientation,
            page_width: template.page_width,
            page_height: template.page_height,
            signer_name: template.signer_name || '',
            signer_title: template.signer_title || '',
            notes: template.notes || '',
            is_active: template.is_active,
            background_image: template.background_image || null,
            background_file: null,
            signature_image: template.signature_image || null,
            signature_file: null,
            layout_config: mergeLayout(template.layout_config),
        });
    };

    const handleCreateNew = () => {
        setIsCreatingNewTemplate(true);
        setForm(createEmptyForm());
        setDraggingElement(null);
        setIsPreviewFullscreen(false);
        void showAlert({
            title: 'Editor Siap',
            message: 'Editor siap untuk template baru.',
            tone: 'info',
            confirmLabel: 'Lanjut Edit',
        });
    };

    const handleDuplicateTemplate = () => {
        setIsCreatingNewTemplate(true);
        setForm(prev => ({
            ...prev,
            id: null,
            name: prev.name ? `${prev.name} Copy` : 'Template Copy',
            background_file: null,
            signature_file: null,
            layout_config: JSON.parse(JSON.stringify(prev.layout_config)),
        }));
        setDraggingElement(null);
        setIsPreviewFullscreen(false);
        void showSuccess('Template berhasil diduplikat. Simpan untuk membuat template baru.', 'Duplikasi Berhasil');
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const authToken = token();
                const [templatesRes, coursesRes] = await Promise.all([
                    fetch(`${apiUrl}/api/certificate-templates/`, {
                        headers: { Authorization: `Bearer ${authToken}` },
                        cache: 'no-store',
                    }),
                    fetch(`${apiUrl}/api/courses/`, {
                        headers: { Authorization: `Bearer ${authToken}` },
                        cache: 'no-store',
                    })
                ]);

                let templateData: CertificateTemplate[] = [];
                let courseData: Course[] = [];

                if (templatesRes.ok) {
                    const templatePayload = await templatesRes.json();
                    templateData = normalizeTemplatesResponse(templatePayload);
                }

                if (coursesRes.ok) {
                    const coursesPayload = await coursesRes.json();
                    courseData = normalizeCoursesResponse(coursesPayload);
                }

                const persistedState = readPersistedEditorState();
                const nextTemplates = templateData;

                if (persistedState?.form) {
                    const restoredForm = restoreFormState(persistedState.form);

                    setTemplates(nextTemplates);
                    setCourses(courseData);
                    setIsCreatingNewTemplate(Boolean(persistedState.isCreatingNewTemplate || !restoredForm.id));
                    setForm(restoredForm);
                } else {
                    setTemplates(nextTemplates);
                    setCourses(courseData);

                    if (nextTemplates.length > 0) {
                        selectTemplate(nextTemplates[0]);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch certificate template data:', error);
                await showError('Gagal memuat data template sertifikat.', 'Pemanggilan Data Gagal');
            } finally {
                setEditorReady(true);
                setLoading(false);
            }
        };

        void fetchData();
    }, [apiUrl, showError]);

    useEffect(() => {
        let backgroundUrl: string | null = null;
        let signatureUrl: string | null = null;

        if (form.background_file) {
            backgroundUrl = URL.createObjectURL(form.background_file);
            setBackgroundPreview(backgroundUrl);
        } else {
            setBackgroundPreview(form.background_image);
        }

        if (form.signature_file) {
            signatureUrl = URL.createObjectURL(form.signature_file);
            setSignaturePreview(signatureUrl);
        } else {
            setSignaturePreview(form.signature_image);
        }

        return () => {
            if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
            if (signatureUrl) URL.revokeObjectURL(signatureUrl);
        };
    }, [form.background_file, form.background_image, form.signature_file, form.signature_image]);

    useEffect(() => {
        if (!editorReady) return;

        try {
            const payload: PersistedTemplateEditorState = {
                isCreatingNewTemplate,
                form: persistableForm(form),
            };
            window.localStorage.setItem(TEMPLATE_EDITOR_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.error('Failed to persist certificate template editor state:', error);
        }
    }, [editorReady, form, isCreatingNewTemplate]);

    useEffect(() => {
        if (!draggingElement) return;

        const handlePointerMove = (event: PointerEvent) => {
            const canvas = previewCanvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            const nextX = clampPercentage(x);
            const nextY = clampPercentage(y);

            setForm(prev => ({
                ...prev,
                layout_config: {
                    ...prev.layout_config,
                    [draggingElement.key]: {
                        ...prev.layout_config[draggingElement.key],
                        x: nextX,
                        y: nextY,
                    },
                },
            }));
        };

        const handlePointerUp = () => {
            setDraggingElement(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggingElement]);

    const fetchTemplates = async ({
        templateIdToOpen,
        fallbackTemplate,
        mergeWithExisting = false,
        preserveCurrentOnEmpty = false,
    }: {
        templateIdToOpen?: number | string | null;
        fallbackTemplate?: CertificateTemplate | null;
        mergeWithExisting?: boolean;
        preserveCurrentOnEmpty?: boolean;
    } = {}) => {
        const res = await fetch(`${apiUrl}/api/certificate-templates/`, {
            headers: { Authorization: `Bearer ${token()}` },
            cache: 'no-store',
        });
        if (!res.ok) throw new Error('Gagal mengambil daftar template.');
        const payload = await res.json();
        const data = normalizeTemplatesResponse(payload);
        const currentTemplates = templatesRef.current;
        let nextTemplates = mergeWithExisting ? mergeTemplateLists(currentTemplates, data) : data;

        if (preserveCurrentOnEmpty && nextTemplates.length === 0) {
            nextTemplates = currentTemplates;
        }

        if (fallbackTemplate) {
            const baseTemplates = nextTemplates.length > 0 ? nextTemplates : currentTemplates;
            nextTemplates = upsertTemplateList(baseTemplates, fallbackTemplate);
        }

        setTemplates(nextTemplates);

        if (templateIdToOpen !== undefined && templateIdToOpen !== null) {
            const found = nextTemplates.find((item: CertificateTemplate) => String(item.id) === String(templateIdToOpen));
            if (found) {
                selectTemplate(found);
                return;
            }
            if (fallbackTemplate) {
                selectTemplate(fallbackTemplate);
                return;
            }
            return;
        }

        if (nextTemplates.length > 0 && !templateIdToOpen && !fallbackTemplate) {
            selectTemplate(nextTemplates[0]);
        }
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>, field: 'background_file' | 'signature_file') => {
        const file = event.target.files?.[0] || null;
        setForm(prev => ({
            ...prev,
            [field]: file,
        }));
    };

    const handleTextLayoutChange = (
        key: keyof CertificateTemplateLayout,
        field: 'x' | 'y' | 'fontSize' | 'fontWeight' | 'color' | 'align',
        value: string
    ) => {
        setForm(prev => ({
            ...prev,
            layout_config: {
                ...prev.layout_config,
                [key]: {
                    ...prev.layout_config[key],
                    [field]: field === 'color' || field === 'align' ? value : Number(value),
                },
            },
        }));
    };

    const handleImageLayoutChange = (
        key: keyof CertificateTemplateLayout,
        field: 'x' | 'y' | 'width' | 'height' | 'align',
        value: string
    ) => {
        setForm(prev => ({
            ...prev,
            layout_config: {
                ...prev.layout_config,
                [key]: {
                    ...prev.layout_config[key],
                    [field]: field === 'align' ? value : Number(value),
                },
            },
        }));
    };

    const handlePreviewDragStart = (
        event: ReactPointerEvent<HTMLElement>,
        key: keyof CertificateTemplateLayout,
        kind: 'text' | 'image'
    ) => {
        event.preventDefault();
        setDraggingElement({ key, kind });
    };

    const applyBlackTextPreset = () => {
        setForm(prev => ({
            ...prev,
            layout_config: {
                ...prev.layout_config,
                recipient_name: { ...prev.layout_config.recipient_name, color: '#000000' },
                course_title: { ...prev.layout_config.course_title, color: '#000000' },
                issue_date: { ...prev.layout_config.issue_date, color: '#000000' },
                certificate_number: { ...prev.layout_config.certificate_number, color: '#000000' },
                signer_name: { ...prev.layout_config.signer_name, color: '#000000' },
                signer_title: { ...prev.layout_config.signer_title, color: '#000000' },
            },
        }));
        void showSuccess('Semua font field sertifikat diubah menjadi hitam.', 'Preset Diterapkan');
    };

    const handleSave = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);

        try {
            const payload = new FormData();
            payload.append('name', form.name);
            if (form.course_id) {
                payload.append('course_id', form.course_id);
            }
            payload.append('orientation', form.orientation);
            payload.append('page_width', String(form.page_width));
            payload.append('page_height', String(form.page_height));
            payload.append('signer_name', form.signer_name);
            payload.append('signer_title', form.signer_title);
            payload.append('notes', form.notes);
            payload.append('is_active', String(form.is_active));
            payload.append('layout_config', JSON.stringify(form.layout_config));

            if (form.background_file) payload.append('background_image', form.background_file);
            if (form.signature_file) payload.append('signature_image', form.signature_file);

            const method = form.id ? 'PATCH' : 'POST';
            const endpoint = form.id
                ? `${apiUrl}/api/certificate-templates/${form.id}/`
                : `${apiUrl}/api/certificate-templates/`;

            const res = await fetch(endpoint, {
                method,
                headers: { Authorization: `Bearer ${token()}` },
                body: payload,
            });

            if (!res.ok) {
                let errorMessage = 'Gagal menyimpan template sertifikat.';

                try {
                    const errorData = await res.json();
                    errorMessage = typeof errorData === 'string'
                        ? errorData
                        : Object.entries(errorData)
                            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                            .join(' | ');
                } catch {
                    const fallbackText = await res.text();
                    if (fallbackText) errorMessage = fallbackText;
                }

                throw new Error(errorMessage);
            }

            const saved = await res.json();
            const normalizedSaved: CertificateTemplate = {
                ...saved,
                layout_config: mergeLayout(saved.layout_config),
            };

            setIsCreatingNewTemplate(false);
            selectTemplate(normalizedSaved);
            setTemplates(prev => upsertTemplateList(prev, normalizedSaved));
            await fetchTemplates({
                templateIdToOpen: normalizedSaved.id,
                fallbackTemplate: normalizedSaved,
                mergeWithExisting: true,
                preserveCurrentOnEmpty: true,
            });
            await showSuccess(
                form.id ? 'Template sertifikat berhasil diperbarui.' : 'Template sertifikat berhasil dibuat.',
                form.id ? 'Perubahan Tersimpan' : 'Template Berhasil Dibuat'
            );
        } catch (error) {
            console.error('Failed to save certificate template:', error);
            await showError(error instanceof Error ? error.message : 'Gagal menyimpan template sertifikat.', 'Penyimpanan Gagal');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!form.id) return;
        const shouldDelete = await confirmAction({
            title: `Hapus Template "${form.name}"?`,
            message: 'Template sertifikat ini akan dihapus dari daftar admin.',
            confirmLabel: 'Ya, Hapus',
            cancelLabel: 'Batal',
            tone: 'warning',
        });
        if (!shouldDelete) return;

        try {
            const res = await fetch(`${apiUrl}/api/certificate-templates/${form.id}/`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token()}` },
            });

            if (!res.ok) throw new Error('Delete failed');

            setIsCreatingNewTemplate(false);
            setForm(createEmptyForm());
            setBackgroundPreview(null);
            setSignaturePreview(null);
            setTemplates(prev => prev.filter(template => template.id !== form.id));
            await fetchTemplates();
            await showSuccess('Template sertifikat berhasil dihapus.', 'Penghapusan Berhasil');
        } catch (error) {
            console.error('Failed to delete certificate template:', error);
            await showError('Gagal menghapus template sertifikat.', 'Penghapusan Gagal');
        }
    };

    const renderPreviewCanvas = (fullscreen = false) => (
        <div className={`${fullscreen ? 'h-[calc(100vh-180px)]' : ''} rounded-[28px] bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_48%,#eef2ff_100%)] p-4`}>
            <div
                ref={previewCanvasRef}
                className="relative w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-lg"
                style={{
                    aspectRatio: `${form.page_width} / ${form.page_height}`,
                    maxHeight: fullscreen ? '100%' : undefined,
                    touchAction: 'none',
                }}
            >
                {backgroundPreview ? (
                    <img src={backgroundPreview} alt="Preview background sertifikat" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
                ) : (
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#eef2ff_100%)]" />
                )}

                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.12),transparent_30%)]" />

                <div
                    className={`absolute whitespace-nowrap rounded-lg border border-dashed border-transparent px-2 py-1 transition ${draggingElement?.key === 'recipient_name' ? 'cursor-grabbing border-blue-300 bg-white/80 shadow-sm' : 'cursor-grab hover:border-blue-200 hover:bg-white/70'}`}
                    onPointerDown={event => handlePreviewDragStart(event, 'recipient_name', 'text')}
                    style={{
                        left: `${form.layout_config.recipient_name.x}%`,
                        top: `${form.layout_config.recipient_name.y}%`,
                        fontSize: `${form.layout_config.recipient_name.fontSize / 16}rem`,
                        fontWeight: form.layout_config.recipient_name.fontWeight,
                        color: form.layout_config.recipient_name.color,
                        ...getAlignStyle(form.layout_config.recipient_name.align),
                    }}
                >
                    {previewValues.recipient_name}
                </div>

                <div
                    className={`absolute max-w-[70%] rounded-lg border border-dashed border-transparent px-2 py-1 transition ${draggingElement?.key === 'course_title' ? 'cursor-grabbing border-blue-300 bg-white/80 shadow-sm' : 'cursor-grab hover:border-blue-200 hover:bg-white/70'}`}
                    onPointerDown={event => handlePreviewDragStart(event, 'course_title', 'text')}
                    style={{
                        left: `${form.layout_config.course_title.x}%`,
                        top: `${form.layout_config.course_title.y}%`,
                        fontSize: `${form.layout_config.course_title.fontSize / 16}rem`,
                        fontWeight: form.layout_config.course_title.fontWeight,
                        color: form.layout_config.course_title.color,
                        ...getAlignStyle(form.layout_config.course_title.align),
                    }}
                >
                    {previewValues.course_title}
                </div>

                <div
                    className={`absolute rounded-lg border border-dashed border-transparent px-2 py-1 transition ${draggingElement?.key === 'issue_date' ? 'cursor-grabbing border-blue-300 bg-white/80 shadow-sm' : 'cursor-grab hover:border-blue-200 hover:bg-white/70'}`}
                    onPointerDown={event => handlePreviewDragStart(event, 'issue_date', 'text')}
                    style={{
                        left: `${form.layout_config.issue_date.x}%`,
                        top: `${form.layout_config.issue_date.y}%`,
                        fontSize: `${form.layout_config.issue_date.fontSize / 16}rem`,
                        fontWeight: form.layout_config.issue_date.fontWeight,
                        color: form.layout_config.issue_date.color,
                        ...getAlignStyle(form.layout_config.issue_date.align),
                    }}
                >
                    {previewValues.issue_date}
                </div>

                <div
                    className={`absolute rounded-lg border border-dashed border-transparent px-2 py-1 transition ${draggingElement?.key === 'certificate_number' ? 'cursor-grabbing border-blue-300 bg-white/80 shadow-sm' : 'cursor-grab hover:border-blue-200 hover:bg-white/70'}`}
                    onPointerDown={event => handlePreviewDragStart(event, 'certificate_number', 'text')}
                    style={{
                        left: `${form.layout_config.certificate_number.x}%`,
                        top: `${form.layout_config.certificate_number.y}%`,
                        fontSize: `${form.layout_config.certificate_number.fontSize / 16}rem`,
                        fontWeight: form.layout_config.certificate_number.fontWeight,
                        color: form.layout_config.certificate_number.color,
                        ...getAlignStyle(form.layout_config.certificate_number.align),
                    }}
                >
                    {previewValues.certificate_number}
                </div>

                {signaturePreview ? (
                    <img
                        src={signaturePreview}
                        alt="Preview tanda tangan"
                        draggable={false}
                        onPointerDown={event => handlePreviewDragStart(event, 'signature_image', 'image')}
                        className={`absolute object-contain transition ${draggingElement?.key === 'signature_image' ? 'cursor-grabbing' : 'cursor-grab'}`}
                        style={{
                            left: `${form.layout_config.signature_image.x}%`,
                            top: `${form.layout_config.signature_image.y}%`,
                            width: `${form.layout_config.signature_image.width}%`,
                            height: `${form.layout_config.signature_image.height}%`,
                            ...getAlignStyle(form.layout_config.signature_image.align),
                        }}
                    />
                ) : (
                    <div
                        onPointerDown={event => handlePreviewDragStart(event, 'signature_image', 'image')}
                        className={`absolute flex items-center justify-center rounded-2xl border border-dashed bg-white/70 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 transition ${draggingElement?.key === 'signature_image' ? 'cursor-grabbing border-blue-300 shadow-sm' : 'cursor-grab border-slate-300 hover:border-blue-200'}`}
                        style={{
                            left: `${form.layout_config.signature_image.x}%`,
                            top: `${form.layout_config.signature_image.y}%`,
                            width: `${form.layout_config.signature_image.width}%`,
                            height: `${form.layout_config.signature_image.height}%`,
                            ...getAlignStyle(form.layout_config.signature_image.align),
                        }}
                    >
                        Signature
                    </div>
                )}

                <div
                    className={`absolute rounded-lg border border-dashed border-transparent px-2 py-1 transition ${draggingElement?.key === 'signer_name' ? 'cursor-grabbing border-blue-300 bg-white/80 shadow-sm' : 'cursor-grab hover:border-blue-200 hover:bg-white/70'}`}
                    onPointerDown={event => handlePreviewDragStart(event, 'signer_name', 'text')}
                    style={{
                        left: `${form.layout_config.signer_name.x}%`,
                        top: `${form.layout_config.signer_name.y}%`,
                        fontSize: `${form.layout_config.signer_name.fontSize / 16}rem`,
                        fontWeight: form.layout_config.signer_name.fontWeight,
                        color: form.layout_config.signer_name.color,
                        ...getAlignStyle(form.layout_config.signer_name.align),
                    }}
                >
                    {previewValues.signer_name}
                </div>

                <div
                    className={`absolute rounded-lg border border-dashed border-transparent px-2 py-1 transition ${draggingElement?.key === 'signer_title' ? 'cursor-grabbing border-blue-300 bg-white/80 shadow-sm' : 'cursor-grab hover:border-blue-200 hover:bg-white/70'}`}
                    onPointerDown={event => handlePreviewDragStart(event, 'signer_title', 'text')}
                    style={{
                        left: `${form.layout_config.signer_title.x}%`,
                        top: `${form.layout_config.signer_title.y}%`,
                        fontSize: `${form.layout_config.signer_title.fontSize / 16}rem`,
                        fontWeight: form.layout_config.signer_title.fontWeight,
                        color: form.layout_config.signer_title.color,
                        ...getAlignStyle(form.layout_config.signer_title.align),
                    }}
                >
                    {previewValues.signer_title}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Template Sertifikat</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Upload background sertifikat, atur penandatangan, dan custom tata letak tiap template sesuai kebutuhan.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/admin/certificates"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                        Kembali ke Daftar
                    </Link>
                    <button
                        type="button"
                        onClick={handleCreateNew}
                        className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        Template Baru
                    </button>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <section className="space-y-4">
                    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <Award className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{templates.length} template tersimpan</p>
                                <p className="text-xs text-gray-500">Setiap template bisa dicustom terpisah untuk kebutuhan berbeda.</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-400">Daftar Template</h2>
                            <span className="text-xs text-gray-400">{templates.length} item</span>
                        </div>

                        <div className="space-y-3">
                            {!loading && (
                                <button
                                    type="button"
                                    onClick={handleCreateNew}
                                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                                        isCreatingNewTemplate
                                            ? 'border-blue-200 bg-blue-50 shadow-sm'
                                            : 'border-dashed border-blue-200 bg-blue-50/60 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">Template Baru</p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Buka draft kosong tanpa menghilangkan template yang sudah tersimpan.
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
                                            Draft
                                        </span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-xs text-blue-500">
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Buat template sertifikat baru</span>
                                    </div>
                                </button>
                            )}

                            {loading ? (
                                [1, 2, 3].map(item => (
                                    <div key={item} className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
                                ))
                            ) : templates.length > 0 ? templates.map(template => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => selectTemplate(template)}
                                    className={`w-full rounded-2xl border p-4 text-left transition-all ${!isCreatingNewTemplate && form.id === template.id
                                        ? 'border-blue-200 bg-blue-50 shadow-sm'
                                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">{template.name}</p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {template.course_title || 'Berlaku untuk semua course'}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${template.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {template.is_active ? 'Aktif' : 'Draft'}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>{template.orientation} • {template.page_width} x {template.page_height}</span>
                                    </div>
                                </button>
                            )) : (
                                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                                    Belum ada template sertifikat. Buat template pertama dari tombol di atas.
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-6">
                        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {!isCreatingNewTemplate && form.id ? 'Edit Template Sertifikat' : 'Buat Template Sertifikat'}
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Atur background, penandatangan, dan detail dasar template.
                                    </p>
                                </div>
                                {!isCreatingNewTemplate && form.id && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleDuplicateTemplate}
                                            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                                        >
                                            <Copy className="h-4 w-4" />
                                            Duplikat
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Hapus
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <label className="space-y-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Nama Template</span>
                                     <input
                                         required
                                         value={form.name}
                                         onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                         className={FORM_INPUT_CLASSNAME}
                                         placeholder="Contoh: Sertifikat Lead Auditor 2026"
                                     />
                                </label>

                                <label className="space-y-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Terkait Course</span>
                                     <select
                                         value={form.course_id}
                                         onChange={e => setForm(prev => ({ ...prev, course_id: e.target.value }))}
                                         className={FORM_SELECT_CLASSNAME}
                                     >
                                        <option value="">Semua course</option>
                                        {courses.map(course => (
                                            <option key={course.id} value={course.id}>{course.title}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Orientasi</span>
                                     <select
                                         value={form.orientation}
                                         onChange={e => setForm(prev => ({ ...prev, orientation: e.target.value as 'landscape' | 'portrait' }))}
                                         className={FORM_SELECT_CLASSNAME}
                                     >
                                        <option value="landscape">Landscape</option>
                                        <option value="portrait">Portrait</option>
                                    </select>
                                </label>

                                <label className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Status Template</p>
                                        <p className="mt-1 text-sm text-gray-700">Template aktif dapat dipakai saat proses penerbitan.</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={form.is_active}
                                        onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </label>

                                <label className="space-y-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Lebar Kanvas</span>
                                     <input
                                         type="number"
                                         min={500}
                                         value={form.page_width}
                                         onChange={e => setForm(prev => ({ ...prev, page_width: Number(e.target.value) }))}
                                         className={FORM_INPUT_CLASSNAME}
                                     />
                                </label>

                                <label className="space-y-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Tinggi Kanvas</span>
                                     <input
                                         type="number"
                                         min={500}
                                         value={form.page_height}
                                         onChange={e => setForm(prev => ({ ...prev, page_height: Number(e.target.value) }))}
                                         className={FORM_INPUT_CLASSNAME}
                                     />
                                </label>

                                <label className="space-y-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Nama Penandatangan</span>
                                     <input
                                         value={form.signer_name}
                                         onChange={e => setForm(prev => ({ ...prev, signer_name: e.target.value }))}
                                         className={FORM_INPUT_CLASSNAME}
                                         placeholder="Contoh: Direktur Akademiso"
                                     />
                                </label>

                                <label className="space-y-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Jabatan Penandatangan</span>
                                     <input
                                         value={form.signer_title}
                                         onChange={e => setForm(prev => ({ ...prev, signer_title: e.target.value }))}
                                         className={FORM_INPUT_CLASSNAME}
                                         placeholder="Contoh: Director of Certification"
                                     />
                                </label>
                            </div>

                            <label className="mt-4 block space-y-1.5">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Catatan Template</span>
                                 <textarea
                                     value={form.notes}
                                     onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                                     className={FORM_TEXTAREA_CLASSNAME}
                                     placeholder="Catatan internal untuk template ini..."
                                 />
                            </label>

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <label className="rounded-2xl border border-dashed border-gray-300 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                            <FileImage className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Background Template</p>
                                            <p className="text-xs text-gray-500">Upload PNG/JPG sertifikat yang sudah jadi.</p>
                                        </div>
                                    </div>
                                     <input type="file" accept="image/*" className={FORM_FILE_INPUT_CLASSNAME} onChange={e => handleFileChange(e, 'background_file')} />
                                    {backgroundPreview && <p className="mt-3 text-xs text-emerald-600">Background siap dipreview.</p>}
                                </label>

                                <label className="rounded-2xl border border-dashed border-gray-300 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                            <Signature className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Tanda Tangan</p>
                                            <p className="text-xs text-gray-500">Upload PNG transparan agar lebih rapi saat dicetak.</p>
                                        </div>
                                    </div>
                                     <input type="file" accept="image/*" className={FORM_FILE_INPUT_CLASSNAME} onChange={e => handleFileChange(e, 'signature_file')} />
                                    {signaturePreview && <p className="mt-3 text-xs text-emerald-600">Tanda tangan siap dipreview.</p>}
                                </label>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Save className="h-4 w-4" />
                                    {saving ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : 'Simpan Template'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateNew}
                                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    <ImagePlus className="h-4 w-4" />
                                    Reset Editor
                                </button>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Pengaturan Tata Letak</h2>
                                    <p className="text-sm text-gray-500">
                                        Gunakan persentase posisi agar template tetap fleksibel untuk ukuran berbeda.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={applyBlackTextPreset}
                                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                    >
                                        Gunakan Font Hitam
                                    </button>
                                    <div className="rounded-full bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                                        Tips: drag elemen di preview atau isi X/Y manual
                                    </div>
                                </div>
                            </div>

                        <div className="mt-6 grid gap-6 xl:grid-cols-2">
                            {TEXT_ELEMENTS.map(({ key, label }) => {
                                const config = form.layout_config[key];
                                if (!('fontSize' in config)) return null;

                                return (
                                    <div key={key} className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                                        <h3 className="font-semibold text-gray-900">{label}</h3>
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Posisi X (%)</span>
                                                <input type="number" value={config.x} onChange={e => handleTextLayoutChange(key, 'x', e.target.value)} className={FORM_COMPACT_INPUT_CLASSNAME} />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Posisi Y (%)</span>
                                                <input type="number" value={config.y} onChange={e => handleTextLayoutChange(key, 'y', e.target.value)} className={FORM_COMPACT_INPUT_CLASSNAME} />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Ukuran Font</span>
                                                <input type="number" value={config.fontSize} onChange={e => handleTextLayoutChange(key, 'fontSize', e.target.value)} className={FORM_COMPACT_INPUT_CLASSNAME} />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Berat Font</span>
                                                <input type="number" step={100} value={config.fontWeight} onChange={e => handleTextLayoutChange(key, 'fontWeight', e.target.value)} className={FORM_COMPACT_INPUT_CLASSNAME} />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Warna</span>
                                                <input type="color" value={config.color} onChange={e => handleTextLayoutChange(key, 'color', e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-2 py-2" />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Alignment</span>
                                                <select value={config.align} onChange={e => handleTextLayoutChange(key, 'align', e.target.value)} className={FORM_COMPACT_SELECT_CLASSNAME}>
                                                    <option value="left">Left</option>
                                                    <option value="center">Center</option>
                                                    <option value="right">Right</option>
                                                </select>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}

                            {IMAGE_ELEMENTS.map(({ key, label }) => {
                                const config = form.layout_config[key];
                                if (!('width' in config)) return null;

                                return (
                                    <div key={key} className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                                        <h3 className="font-semibold text-gray-900">{label}</h3>
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Posisi X (%)</span>
                                                <input type="number" value={config.x} onChange={e => handleImageLayoutChange(key, 'x', e.target.value)} className={FORM_COMPACT_INPUT_CLASSNAME} />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Posisi Y (%)</span>
                                                <input type="number" value={config.y} onChange={e => handleImageLayoutChange(key, 'y', e.target.value)} className={FORM_COMPACT_INPUT_CLASSNAME} />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Lebar (%)</span>
                                                <input type="number" value={config.width} onChange={e => handleImageLayoutChange(key, 'width', e.target.value)} className={FORM_COMPACT_INPUT_CLASSNAME} />
                                            </label>
                                            <label className="space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Tinggi (%)</span>
                                                <input type="number" value={config.height} onChange={e => handleImageLayoutChange(key, 'height', e.target.value)} className={FORM_COMPACT_INPUT_CLASSNAME} />
                                            </label>
                                            <label className="col-span-2 space-y-1">
                                                <span className="text-xs font-medium text-gray-500">Alignment</span>
                                                <select value={config.align} onChange={e => handleImageLayoutChange(key, 'align', e.target.value)} className={FORM_COMPACT_SELECT_CLASSNAME}>
                                                    <option value="left">Left</option>
                                                    <option value="center">Center</option>
                                                    <option value="right">Right</option>
                                                </select>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    </div>
                </form>
            </div>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Live Preview</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Preview ini menunjukkan posisi elemen di atas template yang sedang Anda edit. Elemen bisa langsung di-drag untuk mengubah posisi.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsPreviewFullscreen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <Expand className="h-4 w-4" />
                        Layar Penuh
                    </button>
                </div>

                <div className="mt-5">
                    {renderPreviewCanvas()}
                </div>
            </section>

            {isPreviewFullscreen && (
                <div className="fixed inset-0 z-[120] bg-slate-950/80 p-4 backdrop-blur-sm">
                    <div className="mx-auto flex h-full max-w-7xl flex-col rounded-[32px] bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Preview Template Sertifikat</h2>
                                <p className="mt-1 text-sm text-slate-500">Tampilan penuh untuk mengecek komposisi sertifikat.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPreviewFullscreen(false)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <X className="h-4 w-4" />
                                Tutup
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            {renderPreviewCanvas(true)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

