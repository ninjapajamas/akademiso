import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { FileText, Loader2, MessageCircleMore, MessageSquarePlus, Paperclip, Pencil, Plus, Send, Trash2, UserCircle2, X } from 'lucide-react';

import { CourseDiscussionComment, CourseDiscussionTopic } from '@/types';
import { markForumCourseAsRead } from '@/utils/forumReadState';

type CourseDiscussionForumProps = {
    courseSlug: string;
    courseTitle: string;
    canParticipate: boolean;
};

const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';

function formatDiscussionDate(value: string) {
    return new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function AuthorAvatar({ name, avatar }: { name: string; avatar?: string | null }) {
    if (avatar) {
        return <Image src={avatar} alt={name} width={40} height={40} unoptimized className="h-10 w-10 rounded-2xl object-cover" />;
    }

    return (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <UserCircle2 className="h-5 w-5" />
        </div>
    );
}

function AttachmentPreview({
    url,
    name,
    isImage,
}: {
    url?: string | null;
    name?: string;
    isImage?: boolean;
}) {
    if (!url) {
        return null;
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50"
        >
            {isImage ? (
                <Image
                    src={url}
                    alt={name || 'Lampiran diskusi'}
                    width={1200}
                    height={800}
                    unoptimized
                    className="max-h-64 w-full rounded-xl object-cover"
                />
            ) : (
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{name || 'Lampiran diskusi'}</p>
                        <p className="text-xs text-slate-500">Klik untuk membuka dokumen</p>
                    </div>
                </div>
            )}
        </a>
    );
}

function AttachmentPicker({
    id,
    file,
    onChange,
    onClear,
    hint,
}: {
    id: string;
    file: File | null;
    onChange: (file: File | null) => void;
    onClear: () => void;
    hint: string;
}) {
    return (
        <div className="space-y-2">
            <label
                htmlFor={id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
                <Paperclip className="h-4 w-4" />
                Lampirkan foto atau dokumen
            </label>
            <input
                id={id}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(event) => onChange(event.target.files?.[0] || null)}
            />
            {file ? (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <span className="font-bold">{file.name}</span>
                    <button
                        type="button"
                        onClick={onClear}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-bold text-blue-700 shadow-sm"
                    >
                        <X className="h-3.5 w-3.5" />
                        Hapus
                    </button>
                </div>
            ) : (
                <p className="text-xs text-gray-400">{hint}</p>
            )}
        </div>
    );
}

function buildDiscussionFormData(fields: Record<string, string>, attachment?: File | null) {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
    });
    if (attachment) {
        formData.append('attachment', attachment);
    }
    return formData;
}

export default function CourseDiscussionForum({ courseSlug, courseTitle, canParticipate }: CourseDiscussionForumProps) {
    const [topics, setTopics] = useState<CourseDiscussionTopic[]>([]);
    const [activeTopicId, setActiveTopicId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);
    const [isSendingComment, setIsSendingComment] = useState(false);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [savingCommentId, setSavingCommentId] = useState<number | null>(null);
    const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [topicTitle, setTopicTitle] = useState('');
    const [topicContent, setTopicContent] = useState('');
    const [topicAttachment, setTopicAttachment] = useState<File | null>(null);
    const [commentContent, setCommentContent] = useState('');
    const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
    const [editingCommentContent, setEditingCommentContent] = useState('');
    const [editingCommentAttachment, setEditingCommentAttachment] = useState<File | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const activeTopic = topics.find((topic) => topic.id === activeTopicId) || null;

    const sortTopics = (items: CourseDiscussionTopic[]) => (
        [...items].sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
    );

    useEffect(() => {
        const loadTopics = async () => {
            setIsLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`${apiUrl}/api/courses/${courseSlug}/forum-topics/`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await response.json().catch(() => []);

                if (!response.ok) {
                    setError(data?.error || 'Forum diskusi belum bisa dimuat.');
                    setTopics([]);
                    setActiveTopicId(null);
                    return;
                }

                setTopics(Array.isArray(data) ? data : []);
                setActiveTopicId((current) => {
                    if (!Array.isArray(data) || data.length === 0) return null;
                    if (current && data.some((topic) => topic.id === current)) return current;
                    return data[0].id;
                });
            } catch (loadError) {
                console.error(loadError);
                setError('Terjadi kesalahan saat mengambil forum diskusi.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadTopics();
    }, [apiUrl, courseSlug]);

    useEffect(() => {
        if (topics.length === 0) {
            return;
        }

        const latestActivityAt = [...topics]
            .map((topic) => topic.latest_activity_at || topic.updated_at || topic.created_at)
            .filter(Boolean)
            .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

        if (latestActivityAt) {
            markForumCourseAsRead(courseSlug, latestActivityAt);
        }
    }, [courseSlug, topics]);

    const resetTopicComposer = () => {
        setTopicTitle('');
        setTopicContent('');
        setTopicAttachment(null);
        setIsComposerOpen(false);
    };

    const handleCreateTopic = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canParticipate || isCreatingTopic) return;

        setIsCreatingTopic(true);
        setError('');
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${apiUrl}/api/courses/${courseSlug}/forum-topics/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: buildDiscussionFormData(
                    {
                        title: topicTitle,
                        content: topicContent,
                    },
                    topicAttachment,
                ),
            });
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                setError(data?.title?.[0] || data?.content?.[0] || data?.non_field_errors?.[0] || data?.error || 'Topik gagal dibuat.');
                return;
            }

            setTopics((current) => [data, ...current]);
            setActiveTopicId(data.id);
            resetTopicComposer();
        } catch (createError) {
            console.error(createError);
            setError('Terjadi kesalahan saat membuat topik baru.');
        } finally {
            setIsCreatingTopic(false);
        }
    };

    const handleSendComment = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!activeTopic || !canParticipate || isSendingComment) return;

        setIsSendingComment(true);
        setError('');
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${apiUrl}/api/courses/${courseSlug}/forum-topics/${activeTopic.id}/comments/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: buildDiscussionFormData(
                    {
                        content: commentContent,
                    },
                    commentAttachment,
                ),
            });
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                setError(data?.content?.[0] || data?.non_field_errors?.[0] || data?.error || 'Komentar gagal dikirim.');
                return;
            }

            setTopics((current) => sortTopics(current.map((topic) => {
                if (topic.id !== activeTopic.id) return topic;
                return {
                    ...topic,
                    comment_count: topic.comment_count + 1,
                    latest_activity_at: data.created_at,
                    updated_at: data.created_at,
                    comments: [...topic.comments, data],
                };
            })));
            setCommentContent('');
            setCommentAttachment(null);
        } catch (commentError) {
            console.error(commentError);
            setError('Terjadi kesalahan saat mengirim komentar.');
        } finally {
            setIsSendingComment(false);
        }
    };

    const startEditingComment = (comment: CourseDiscussionComment) => {
        setEditingCommentId(comment.id);
        setEditingCommentContent(comment.content);
        setEditingCommentAttachment(null);
        setError('');
    };

    const stopEditingComment = () => {
        setEditingCommentId(null);
        setEditingCommentContent('');
        setEditingCommentAttachment(null);
    };

    const handleUpdateComment = async (comment: CourseDiscussionComment) => {
        if (!activeTopic || savingCommentId === comment.id) return;

        setSavingCommentId(comment.id);
        setError('');
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(
                `${apiUrl}/api/courses/${courseSlug}/forum-topics/${activeTopic.id}/comments/${comment.id}/`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: buildDiscussionFormData(
                        {
                            content: editingCommentContent,
                        },
                        editingCommentAttachment,
                    ),
                },
            );
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                setError(data?.content?.[0] || data?.non_field_errors?.[0] || data?.error || 'Komentar gagal diperbarui.');
                return;
            }

            setTopics((current) => sortTopics(current.map((topic) => {
                if (topic.id !== activeTopic.id) return topic;
                return {
                    ...topic,
                    latest_activity_at: data.updated_at,
                    updated_at: data.updated_at,
                    comments: topic.comments.map((item) => item.id === comment.id ? data : item),
                };
            })));
            stopEditingComment();
        } catch (updateError) {
            console.error(updateError);
            setError('Terjadi kesalahan saat memperbarui komentar.');
        } finally {
            setSavingCommentId(null);
        }
    };

    const handleDeleteComment = async (comment: CourseDiscussionComment) => {
        if (!activeTopic || deletingCommentId === comment.id) return;
        if (!window.confirm('Hapus komentar ini dari forum diskusi?')) return;

        setDeletingCommentId(comment.id);
        setError('');
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(
                `${apiUrl}/api/courses/${courseSlug}/forum-topics/${activeTopic.id}/comments/${comment.id}/`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                setError(data?.error || 'Komentar gagal dihapus.');
                return;
            }

            setTopics((current) => sortTopics(current.map((topic) => {
                if (topic.id !== activeTopic.id) return topic;
                return {
                    ...topic,
                    comment_count: Math.max(0, topic.comment_count - 1),
                    comments: topic.comments.filter((item) => item.id !== comment.id),
                };
            })));
            if (editingCommentId === comment.id) {
                stopEditingComment();
            }
        } catch (deleteError) {
            console.error(deleteError);
            setError('Terjadi kesalahan saat menghapus komentar.');
        } finally {
            setDeletingCommentId(null);
        }
    };

    if (!canParticipate) {
        return (
            <div className="rounded-[2rem] border border-amber-100 bg-amber-50/80 p-8 text-amber-900">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-600">Forum Terkunci</p>
                <h3 className="mt-3 text-2xl font-black">Diskusi khusus peserta {courseTitle}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-amber-800/90">
                    Forum ini dipisahkan per course dan hanya tersedia untuk peserta yang sudah terdaftar, pengajar course,
                    atau admin internal.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-4 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">Daftar Topik</p>
                            <p className="text-sm text-gray-500">Pilih topik yang ingin dibaca atau dibalas.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsComposerOpen((current) => !current)}
                            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
                                isComposerOpen
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                            aria-label={isComposerOpen ? 'Tutup form topik baru' : 'Buka form topik baru'}
                        >
                            {isComposerOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </button>
                    </div>

                    {isComposerOpen && (
                        <div className="rounded-[2rem] border border-blue-100 bg-blue-50/60 p-5">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                                    <MessageSquarePlus className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">Topik Baru</p>
                                    <p className="text-sm text-gray-500">Buka diskusi baru untuk peserta course ini.</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateTopic} className="space-y-3">
                                <input
                                    value={topicTitle}
                                    onChange={(event) => setTopicTitle(event.target.value)}
                                    placeholder="Judul topik"
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                                <textarea
                                    value={topicContent}
                                    onChange={(event) => setTopicContent(event.target.value)}
                                    placeholder="Tulis pertanyaan atau konteks diskusinya..."
                                    rows={5}
                                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                                <AttachmentPicker
                                    id="discussion-topic-attachment"
                                    file={topicAttachment}
                                    onChange={setTopicAttachment}
                                    onClear={() => setTopicAttachment(null)}
                                    hint="Bisa melampirkan foto, PDF, Word, PowerPoint, atau Excel."
                                />
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={isCreatingTopic}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                                    >
                                        {isCreatingTopic ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                                        {isCreatingTopic ? 'Membuat topik...' : 'Publikasikan Topik'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetTopicComposer}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className={`${isComposerOpen ? 'border-t border-gray-100 pt-4' : ''}`}>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Daftar Topik</p>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                                {topics.length} topik
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((item) => (
                                    <div key={item} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
                                ))}
                            </div>
                        ) : topics.length > 0 ? (
                            <div className="space-y-3">
                                {topics.map((topic) => {
                                    const isActive = topic.id === activeTopic?.id;
                                    return (
                                        <button
                                            key={topic.id}
                                            type="button"
                                            onClick={() => setActiveTopicId(topic.id)}
                                            className={`w-full rounded-2xl border p-4 text-left transition ${
                                                isActive
                                                    ? 'border-blue-200 bg-blue-50 shadow-sm'
                                                    : 'border-gray-100 bg-gray-50/70 hover:border-gray-200 hover:bg-white'
                                            }`}
                                        >
                                            <p className={`line-clamp-2 text-sm font-bold ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                                                {topic.title}
                                            </p>
                                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{topic.content || 'Topik dibuka melalui lampiran.'}</p>
                                            {topic.attachment_name && (
                                                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                                                    <Paperclip className="h-3.5 w-3.5" />
                                                    {topic.attachment_name}
                                                </div>
                                            )}
                                            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-semibold text-gray-400">
                                                <span>{topic.author.full_name}</span>
                                                <span>{topic.comment_count} komentar</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
                                <p className="font-semibold text-gray-700">Belum ada topik diskusi.</p>
                                <p className="mt-2 text-sm text-gray-400">Tekan tombol tambah di kanan atas untuk membuat topik pertama.</p>
                                {!isComposerOpen && (
                                    <button
                                        type="button"
                                        onClick={() => setIsComposerOpen(true)}
                                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Tambah Topik Baru
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    {error && (
                        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                            <div className="space-y-4">
                                <div className="h-8 w-1/2 animate-pulse rounded-full bg-gray-100" />
                                <div className="h-28 animate-pulse rounded-3xl bg-gray-100" />
                                <div className="h-24 animate-pulse rounded-3xl bg-gray-100" />
                            </div>
                        </div>
                    ) : activeTopic ? (
                        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                            <div className="space-y-6">
                                <div className="rounded-[2rem] bg-slate-50 p-6">
                                    <div className="flex items-start gap-4">
                                        <AuthorAvatar name={activeTopic.author.full_name} avatar={activeTopic.author.avatar} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-lg font-black text-gray-900">{activeTopic.title}</p>
                                                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-gray-500 shadow-sm">
                                                    {activeTopic.comment_count} komentar
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                                Dibuat oleh {activeTopic.author.full_name} pada {formatDiscussionDate(activeTopic.created_at)}
                                            </p>
                                            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                                                {activeTopic.content || 'Topik ini dibuka dengan lampiran diskusi.'}
                                            </p>
                                            <AttachmentPreview
                                                url={activeTopic.attachment}
                                                name={activeTopic.attachment_name}
                                                isImage={activeTopic.attachment_is_image}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <MessageCircleMore className="h-5 w-5 text-blue-600" />
                                        <h3 className="text-sm font-black uppercase tracking-[0.24em] text-gray-500">Komentar</h3>
                                    </div>

                                    {activeTopic.comments.length > 0 ? (
                                        <div className="space-y-3">
                                            {activeTopic.comments.map((comment) => {
                                                const isEditing = editingCommentId === comment.id;
                                                return (
                                                    <div key={comment.id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                                                        <div className="flex items-start gap-4">
                                                            <AuthorAvatar name={comment.author.full_name} avatar={comment.author.avatar} />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <p className="font-bold text-gray-900">{comment.author.full_name}</p>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <p className="text-xs font-semibold text-gray-400">
                                                                            {formatDiscussionDate(comment.updated_at !== comment.created_at ? comment.updated_at : comment.created_at)}
                                                                        </p>
                                                                        {comment.can_edit && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => isEditing ? stopEditingComment() : startEditingComment(comment)}
                                                                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700"
                                                                            >
                                                                                <Pencil className="h-3.5 w-3.5" />
                                                                                {isEditing ? 'Tutup' : 'Edit'}
                                                                            </button>
                                                                        )}
                                                                        {comment.can_delete && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteComment(comment)}
                                                                                disabled={deletingCommentId === comment.id}
                                                                                className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 disabled:opacity-60"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                                {deletingCommentId === comment.id ? 'Menghapus...' : 'Hapus'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {isEditing ? (
                                                                    <div className="mt-3 space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                                                                        <textarea
                                                                            value={editingCommentContent}
                                                                            onChange={(event) => setEditingCommentContent(event.target.value)}
                                                                            rows={4}
                                                                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                                                        />
                                                                        <AttachmentPicker
                                                                            id={`discussion-edit-attachment-${comment.id}`}
                                                                            file={editingCommentAttachment}
                                                                            onChange={setEditingCommentAttachment}
                                                                            onClear={() => setEditingCommentAttachment(null)}
                                                                            hint={comment.attachment_name ? `Lampiran saat ini: ${comment.attachment_name}` : 'Lampirkan file baru bila ingin mengganti lampiran saat ini.'}
                                                                        />
                                                                        {comment.attachment && !editingCommentAttachment && (
                                                                            <AttachmentPreview
                                                                                url={comment.attachment}
                                                                                name={comment.attachment_name}
                                                                                isImage={comment.attachment_is_image}
                                                                            />
                                                                        )}
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleUpdateComment(comment)}
                                                                                disabled={savingCommentId === comment.id}
                                                                                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                                                            >
                                                                                {savingCommentId === comment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                                                                                {savingCommentId === comment.id ? 'Menyimpan...' : 'Simpan Perubahan'}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={stopEditingComment}
                                                                                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
                                                                            >
                                                                                Batal
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                                                                            {comment.content || 'Komentar dibagikan melalui lampiran.'}
                                                                        </p>
                                                                        <AttachmentPreview
                                                                            url={comment.attachment}
                                                                            name={comment.attachment_name}
                                                                            isImage={comment.attachment_is_image}
                                                                        />
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                                            <p className="font-semibold text-gray-700">Belum ada komentar.</p>
                                            <p className="mt-2 text-sm text-gray-400">Jadilah yang pertama menanggapi topik ini.</p>
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleSendComment} className="rounded-[2rem] border border-gray-100 bg-slate-50 p-5">
                                    <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">
                                        Tambah Komentar
                                    </label>
                                    <textarea
                                        value={commentContent}
                                        onChange={(event) => setCommentContent(event.target.value)}
                                        placeholder="Bagikan pengalaman, jawaban, atau pendapat Anda..."
                                        rows={4}
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    />
                                    <div className="mt-4">
                                        <AttachmentPicker
                                            id="discussion-comment-attachment"
                                            file={commentAttachment}
                                            onChange={setCommentAttachment}
                                            onClear={() => setCommentAttachment(null)}
                                            hint="Lampiran bersifat opsional. Anda juga bisa mengirim komentar tanpa file."
                                        />
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSendingComment}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                        >
                                            {isSendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                            {isSendingComment ? 'Mengirim...' : 'Kirim Komentar'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    ) : topics.length > 0 ? (
                        <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-600">
                                <MessageCircleMore className="h-7 w-7" />
                            </div>
                            <h3 className="mt-5 text-2xl font-black text-gray-900">Pilih salah satu topik</h3>
                            <p className="mt-3 max-w-lg text-sm leading-7 text-gray-500">
                                Daftar topik sudah tersedia di panel kiri. Klik salah satu topik untuk membuka isi diskusi dan komentarnya.
                            </p>
                        </div>
                    ) : (
                        <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-600">
                                <MessageCircleMore className="h-7 w-7" />
                            </div>
                            <h3 className="mt-5 text-2xl font-black text-gray-900">Forum {courseTitle}</h3>
                            <p className="mt-3 max-w-lg text-sm leading-7 text-gray-500">
                                Belum ada topik yang aktif. Anda bisa memulai topik baru dari panel sebelah kiri untuk membuka diskusi antar peserta course.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
