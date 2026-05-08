'use client';

import { getClientApiBaseUrl } from '@/utils/api';
import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Video, FileText, HelpCircle, Plus, Trash2, CheckCircle2, Library, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-40 bg-gray-50 rounded-2xl animate-pulse flex items-center justify-center text-gray-400 text-sm font-medium">Memuat Editor...</div>
});
import 'react-quill-new/dist/quill.snow.css';

type LessonFormContentProps = {
    courseId: string;
    lessonId: string;
    courseBasePath?: string;
};

const ASSESSMENT_LESSON_TYPES = ['quiz', 'mid_test', 'final_test', 'exam'];
const normalizeLessonType = (type?: string) => {
    if (type === 'video' || type === 'article' || ASSESSMENT_LESSON_TYPES.includes(type || '')) {
        return type || 'video';
    }
    return 'video';
};
const QUESTION_TYPE_MULTIPLE_CHOICE = 'MC';
const QUESTION_TYPE_SHORT_ANSWER = 'SHORT_ANSWER';
const LESSON_TYPE_OPTIONS = [
    { id: 'video', label: 'Video', icon: Video },
    { id: 'article', label: 'Artikel', icon: FileText },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle },
    { id: 'mid_test', label: 'Pre-Test', icon: Library },
    { id: 'final_test', label: 'Post-Test', icon: CheckCircle2 },
    { id: 'exam', label: 'Ujian Mandiri', icon: HelpCircle },
] as const;
const getLessonTypeLabel = (type?: string) => {
    if (type === 'quiz') return 'Quiz';
    if (type === 'mid_test') return 'Pre-Test';
    if (type === 'final_test') return 'Post-Test';
    if (type === 'exam') return 'Ujian Mandiri';
    if (type === 'video') return 'Video';
    if (type === 'article') return 'Artikel';
    return type || 'Materi';
};
const QUESTION_BANK_SOURCE_OPTIONS = [
    { value: 'all', label: 'Semua Kategori Soal' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'mid_test', label: 'Pre-Test' },
    { value: 'final_test', label: 'Post-Test' },
    { value: 'exam', label: 'Ujian Mandiri' },
] as const;
const QUESTION_BANK_TYPE_OPTIONS = [
    { value: 'all', label: 'Semua Jenis Pertanyaan' },
    { value: QUESTION_TYPE_MULTIPLE_CHOICE, label: 'Pilihan Ganda' },
    { value: QUESTION_TYPE_SHORT_ANSWER, label: 'Isian Singkat' },
] as const;
const getAssessmentConfigLabel = (type?: string) => {
    if (type === 'mid_test') return 'Konfigurasi Pre-Test';
    if (type === 'final_test') return 'Konfigurasi Post-Test';
    if (type === 'exam') return 'Konfigurasi Ujian Mandiri';
    return 'Konfigurasi Quiz';
};

type QuizAlternative = {
    id?: number;
    text: string;
    is_correct: boolean;
    order: number;
};

type QuizQuestion = {
    id?: number;
    client_id: string;
    text: string;
    question_type: string;
    image_url?: string | null;
    clear_image?: boolean;
    source_question_id?: number;
    correct_answer: string;
    order: number;
    alternatives: QuizAlternative[];
};

type QuizData = {
    pass_score: number;
    time_limit: number | null;
    questions: QuizQuestion[];
};

type LessonFormData = {
    title: string;
    type: string;
    section_id: string | number;
    video_url: string;
    content: string;
    duration: string;
    order: number;
    image: File | null;
    attachment: File | null;
    quiz_data: QuizData;
};

type RawQuizQuestion = Partial<QuizQuestion> & {
    alternatives?: QuizAlternative[];
};

type RawQuizData = Partial<QuizData> & {
    questions?: RawQuizQuestion[];
};

const defaultAlternatives = (): QuizAlternative[] => [
    { text: '', is_correct: true, order: 1 },
    { text: '', is_correct: false, order: 2 }
];
const normalizeQuizData = (quizData?: RawQuizData | null): QuizData => ({
    pass_score: quizData?.pass_score ?? 70,
    time_limit: quizData?.time_limit ?? null,
    questions: (quizData?.questions || []).map((question: RawQuizQuestion, index: number) => ({
        ...question,
        client_id: question.client_id || `question-existing-${question.id || createQuestionClientId()}`,
        text: question.text || '',
        question_type: question.question_type || QUESTION_TYPE_MULTIPLE_CHOICE,
        image_url: question.image_url || null,
        clear_image: false,
        correct_answer: question.correct_answer || '',
        order: question.order || index + 1,
        alternatives: question.alternatives?.length ? question.alternatives : defaultAlternatives()
    }))
});

type QuestionBankItem = {
    id: number;
    question_type: string;
    text: string;
    image_url?: string | null;
    correct_answer?: string;
    order: number;
    alternatives?: QuizAlternative[];
    source_lesson_title: string;
    source_lesson_type: string;
    source_course_title: string;
};

type SectionOption = {
    id: number;
    title: string;
};

let questionClientCounter = 0;
const createQuestionClientId = () => {
    questionClientCounter += 1;
    return `question-${Date.now()}-${questionClientCounter}`;
};

export default function LessonFormContent({
    courseId,
    lessonId,
    courseBasePath = '/instructor/courses'
}: LessonFormContentProps) {
    const isNew = lessonId === 'new';
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSectionId = searchParams.get('section_id') || '';

    const [formData, setFormData] = useState<LessonFormData>({
        title: '',
        type: 'video',
        section_id: initialSectionId,
        video_url: '',
        content: '',
        duration: '',
        order: 1,
        image: null,
        attachment: null,
        quiz_data: {
            pass_score: 70,
            time_limit: null as number | null,
            questions: []
        }
    });
    const [sections, setSections] = useState<SectionOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [currentAttachmentUrl, setCurrentAttachmentUrl] = useState<string | null>(null);
    const [currentAttachmentName, setCurrentAttachmentName] = useState('');
    const [questionBankOpen, setQuestionBankOpen] = useState(false);
    const [questionBankLoading, setQuestionBankLoading] = useState(false);
    const [questionBankItems, setQuestionBankItems] = useState<QuestionBankItem[]>([]);
    const [questionBankSearch, setQuestionBankSearch] = useState('');
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
    const [questionImageFiles, setQuestionImageFiles] = useState<Record<string, File | null>>({});
    const [questionBankSourceFilter, setQuestionBankSourceFilter] = useState<string>('all');
    const [questionBankTypeFilter, setQuestionBankTypeFilter] = useState<string>('all');
    const isAssessmentType = ASSESSMENT_LESSON_TYPES.includes(formData.type);

    // Quill Configuration
    const quillModules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'image'],
            ['clean']
        ],
    }), []);

    const quillFormats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list',
        'align',
        'link', 'image'
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const apiUrl = getClientApiBaseUrl();

                // Fetch sections for dropdown
                const sectionsRes = await fetch(`${apiUrl}/api/sections/?course_id=${courseId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (sectionsRes.ok) {
                    const sectionsData = await sectionsRes.json();
                    setSections(sectionsData);
                }

                if (!isNew) {
                    const res = await fetch(`${apiUrl}/api/lessons/${lessonId}/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setFormData({
                            title: data.title,
                            type: normalizeLessonType(data.type),
                            section_id: data.section || '',
                            video_url: data.video_url || '',
                            content: data.content || '',
                            duration: data.duration || '',
                            order: data.order,
                            image: null,
                            attachment: null,
                            quiz_data: normalizeQuizData(data.quiz_data)
                        });
                        setCurrentImageUrl(data.image);
                        setCurrentAttachmentUrl(data.attachment || null);
                        setCurrentAttachmentName(data.attachment_name || '');
                    }
                } else if (initialSectionId) {
                    setFormData(prev => ({ ...prev, section_id: initialSectionId }));
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [courseId, lessonId, isNew, initialSectionId]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((current) => ({
            ...current,
            [name]: name === 'order' ? Number(value) : value
        }));
    };

    const handleQuillChange = (content: string) => {
        setFormData({ ...formData, content });
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, image: e.target.files[0] });
        }
    };

    const handleAttachmentChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, attachment: e.target.files[0] });
        }
    };

    const addQuestion = () => {
        setFormData({
            ...formData,
            quiz_data: {
                ...formData.quiz_data,
                questions: [
                    ...formData.quiz_data.questions,
                    {
                        client_id: createQuestionClientId(),
                        text: '',
                        question_type: QUESTION_TYPE_MULTIPLE_CHOICE,
                        image_url: null,
                        clear_image: false,
                        correct_answer: '',
                        order: formData.quiz_data.questions.length + 1,
                        alternatives: defaultAlternatives()
                    }
                ]
            }
        });
    };

    const openQuestionBank = async () => {
        setQuestionBankOpen(true);
        if (questionBankItems.length > 0) return;

        try {
            setQuestionBankLoading(true);
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();
            const res = await fetch(`${apiUrl}/api/lessons/bank/?content_type=questions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data: QuestionBankItem[] = await res.json();
                setQuestionBankItems(data);
            } else {
                alert('Gagal memuat bank soal.');
            }
        } catch (error) {
            console.error('Failed to fetch question bank:', error);
            alert('Gagal memuat bank soal. Cek koneksi.');
        } finally {
            setQuestionBankLoading(false);
        }
    };

    const toggleQuestionSelection = (questionId: number) => {
        setSelectedQuestionIds((current) => (
            current.includes(questionId)
                ? current.filter((id) => id !== questionId)
                : [...current, questionId]
        ));
    };

    const importQuestionsFromBank = (questions: QuestionBankItem[]) => {
        if (questions.length === 0) return;

        setFormData((current) => {
            const startOrder = current.quiz_data.questions.length;
            const copiedQuestions = questions.map((question, index) => ({
                client_id: createQuestionClientId(),
                text: question.text,
                question_type: question.question_type || QUESTION_TYPE_MULTIPLE_CHOICE,
                image_url: question.image_url || null,
                clear_image: false,
                source_question_id: question.id,
                correct_answer: question.correct_answer || '',
                order: startOrder + index + 1,
                alternatives: question.question_type === QUESTION_TYPE_MULTIPLE_CHOICE
                    ? (question.alternatives || []).map((alternative, alternativeIndex) => ({
                        text: alternative.text,
                        is_correct: alternative.is_correct,
                        order: alternativeIndex + 1
                    }))
                    : []
            }));

            return {
                ...current,
                type: ASSESSMENT_LESSON_TYPES.includes(current.type) ? current.type : 'quiz',
                quiz_data: {
                    ...current.quiz_data,
                    questions: [...current.quiz_data.questions, ...copiedQuestions]
                }
            };
        });

        setSelectedQuestionIds([]);
        setQuestionBankOpen(false);
    };

    const filteredQuestionBankItems = questionBankItems.filter((question) => {
        const keyword = questionBankSearch.trim().toLowerCase();
        const matchesKeyword = !keyword || [
            question.text,
            question.source_lesson_title,
            question.source_course_title,
            question.correct_answer || ''
        ].some((value) => value.toLowerCase().includes(keyword));
        const matchesSource = questionBankSourceFilter === 'all' || question.source_lesson_type === questionBankSourceFilter;
        const matchesType = questionBankTypeFilter === 'all' || question.question_type === questionBankTypeFilter;
        return matchesKeyword && matchesSource && matchesType;
    });

    const removeQuestion = (index: number) => {
        const removedQuestion = formData.quiz_data.questions[index];
        const newQuestions = [...formData.quiz_data.questions];
        newQuestions.splice(index, 1);
        if (removedQuestion) {
            setQuestionImageFiles((current) => {
                const next = { ...current };
                delete next[removedQuestion.client_id];
                return next;
            });
        }
        setFormData({
            ...formData,
            quiz_data: { ...formData.quiz_data, questions: newQuestions }
        });
    };

    const updateQuestion = (index: number, text: string) => {
        const newQuestions = [...formData.quiz_data.questions];
        newQuestions[index].text = text;
        setFormData({
            ...formData,
            quiz_data: { ...formData.quiz_data, questions: newQuestions }
        });
    };

    const handleQuestionImageChange = (index: number, file: File | null) => {
        const question = formData.quiz_data.questions[index];
        if (!question) return;

        setQuestionImageFiles((current) => ({
            ...current,
            [question.client_id]: file
        }));

        const newQuestions = [...formData.quiz_data.questions];
        newQuestions[index] = {
            ...newQuestions[index],
            clear_image: false,
        };
        setFormData({
            ...formData,
            quiz_data: { ...formData.quiz_data, questions: newQuestions }
        });
    };

    const clearQuestionImage = (index: number) => {
        const question = formData.quiz_data.questions[index];
        if (!question) return;

        setQuestionImageFiles((current) => {
            const next = { ...current };
            delete next[question.client_id];
            return next;
        });

        const newQuestions = [...formData.quiz_data.questions];
        newQuestions[index] = {
            ...newQuestions[index],
            image_url: null,
            clear_image: true,
        };
        setFormData({
            ...formData,
            quiz_data: { ...formData.quiz_data, questions: newQuestions }
        });
    };

    const updateQuestionType = (index: number, questionType: string) => {
        const newQuestions = [...formData.quiz_data.questions];
        newQuestions[index] = {
            ...newQuestions[index],
            question_type: questionType,
            alternatives: questionType === QUESTION_TYPE_MULTIPLE_CHOICE
                ? (newQuestions[index].alternatives?.length ? newQuestions[index].alternatives : defaultAlternatives())
                : []
        };
        setFormData({
            ...formData,
            quiz_data: { ...formData.quiz_data, questions: newQuestions }
        });
    };

    const updateCorrectAnswer = (index: number, correctAnswer: string) => {
        const newQuestions = [...formData.quiz_data.questions];
        newQuestions[index].correct_answer = correctAnswer;
        setFormData({
            ...formData,
            quiz_data: { ...formData.quiz_data, questions: newQuestions }
        });
    };

    const addAlternative = (qIndex: number) => {
        const newQuestions = [...formData.quiz_data.questions];
        newQuestions[qIndex].alternatives.push({
            text: '',
            is_correct: false,
            order: newQuestions[qIndex].alternatives.length + 1
        });
        setFormData({
            ...formData,
            quiz_data: { ...formData.quiz_data, questions: newQuestions }
        });
    };

    const removeAlternative = (qIndex: number, aIndex: number) => {
        const newQuestions = [...formData.quiz_data.questions];
        newQuestions[qIndex].alternatives.splice(aIndex, 1);
        setFormData({
            ...formData,
            quiz_data: { ...formData.quiz_data, questions: newQuestions }
        });
    };

    const updateAlternative = (qIndex: number, aIndex: number, updates: Partial<QuizAlternative>) => {
        const newQuestions = [...formData.quiz_data.questions];
        if ('is_correct' in updates && updates.is_correct) {
            // Uncheck others in the SAME question
            newQuestions[qIndex].alternatives = newQuestions[qIndex].alternatives.map((a, i) => ({
                ...a,
                is_correct: i === aIndex
            }));
        } else {
            newQuestions[qIndex].alternatives[aIndex] = {
                ...newQuestions[qIndex].alternatives[aIndex],
                ...updates
            };
        }
        setFormData({
            ...formData,
            quiz_data: { ...formData.quiz_data, questions: newQuestions }
        });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = getClientApiBaseUrl();

            const data = new FormData();
            data.append('course', courseId);
            if (formData.section_id) data.append('section', formData.section_id.toString());
            data.append('title', formData.title);
            data.append('type', formData.type);
            data.append('order', formData.order.toString());
            data.append('duration', formData.duration);

            if (formData.type === 'video') {
                data.append('video_url', formData.video_url);
                data.append('content', formData.content); // Keep content for video description if needed
            } else {
                data.append('content', formData.content);
                data.append('video_url', '');
            }

            // Append Quiz data if applicable
            if (ASSESSMENT_LESSON_TYPES.includes(formData.type)) {
                const sanitizedQuizData = {
                    ...formData.quiz_data,
                    questions: formData.quiz_data.questions.map((question) => ({
                        id: question.id,
                        client_id: question.client_id,
                        text: question.text,
                        question_type: question.question_type,
                        correct_answer: question.correct_answer,
                        clear_image: Boolean(question.clear_image),
                        source_question_id: question.source_question_id,
                        order: question.order,
                        alternatives: question.alternatives,
                    }))
                };
                data.append('quiz_data', JSON.stringify(sanitizedQuizData));
                formData.quiz_data.questions.forEach((question) => {
                    const imageFile = questionImageFiles[question.client_id];
                    if (imageFile) {
                        data.append(`question_image_${question.client_id}`, imageFile);
                    }
                });
            }

            if (formData.type === 'video' && formData.image) {
                data.append('image', formData.image);
            }

            if (!isAssessmentType && formData.attachment) {
                data.append('attachment', formData.attachment);
            }

            const url = isNew ? `${apiUrl}/api/lessons/` : `${apiUrl}/api/lessons/${lessonId}/`;
            const method = isNew ? 'POST' : 'PATCH';

            const res = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            if (res.ok) {
                router.push(`${courseBasePath}/${courseId}/lessons`);
            } else {
                alert('Gagal menyimpan materi. Periksa kembali input Anda.');
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Terjadi kesalahan koneksi.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <style jsx global>{`
                .quill {
                    background: #f9fafb;
                    border-radius: 1.5rem;
                    border: none !important;
                    overflow: hidden;
                }
                .ql-toolbar {
                    border: none !important;
                    background: #f3f4f6;
                    border-bottom: 1px solid #e5e7eb !important;
                    padding: 1rem !important;
                }
                .ql-container {
                    border: none !important;
                    min-height: 300px;
                    font-size: 1rem;
                }
                .ql-editor {
                    padding: 1.5rem !important;
                    min-height: 300px;
                }
                .ql-editor.ql-blank::before {
                    color: #d1d5db !important;
                    font-style: normal !important;
                }
            `}</style>

            <div className="flex items-center gap-4">
                <Link
                    href={`${courseBasePath}/${courseId}/lessons`}
                    className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-100"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {isNew ? 'Tambah Materi Baru' : 'Edit Materi'}
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Isi detail materi pembelajaran di bawah ini.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 p-8 space-y-8">
                <div className="space-y-6">
                    <div>
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Judul Materi</label>
                        <input
                            type="text"
                            name="title"
                            required
                            placeholder="Contoh: Pengenalan Dasar ISO 9001"
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-bold"
                            value={formData.title}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Modul / Section</label>
                            <select
                                name="section_id"
                                required
                                className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-bold appearance-none cursor-pointer"
                                value={formData.section_id}
                                onChange={handleChange}
                            >
                                <option value="">Pilih Modul</option>
                                {sections.map(section => (
                                    <option key={section.id} value={section.id}>{section.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Urutan Tampil</label>
                            <input
                                type="number"
                                name="order"
                                required
                                min="1"
                                className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-bold"
                                value={formData.order}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-gray-700 mb-4 uppercase tracking-widest text-[10px]">Tipe Materi</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {LESSON_TYPE_OPTIONS.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: type.id })}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${formData.type === type.id
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm'
                                        : 'border-gray-50 text-gray-400 hover:border-indigo-200'}`}
                                >
                                    <type.icon className="w-4 h-4" />
                                    <span className="font-bold text-[10px] tracking-tight whitespace-nowrap">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="animate-in fade-in slide-in-from-top-2">
                        {formData.type === 'video' ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">URL Video (YouTube / Google Drive)</label>
                                    <input
                                        type="url"
                                        name="video_url"
                                        required
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-600 font-mono text-xs"
                                        value={formData.video_url}
                                        onChange={handleChange}
                                    />
                                    <p className="mt-2 text-[10px] text-gray-400 font-medium">Link video akan secara otomatis dideteksi untuk pemutar video.</p>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Ringkasan Video (Opsional)</label>
                                    <textarea
                                        name="content"
                                        rows={4}
                                        placeholder="Tuliskan ringkasan singkat isi video..."
                                        className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-medium leading-relaxed"
                                        value={formData.content}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        ) : ASSESSMENT_LESSON_TYPES.includes(formData.type) ? (
                            <div className="space-y-8">
                                <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
                                    <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4" />
                                        {getAssessmentConfigLabel(formData.type)}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Skor Kelulusan (0-100)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="w-full px-5 py-3 bg-white border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-bold"
                                                value={formData.quiz_data.pass_score}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    quiz_data: { ...formData.quiz_data, pass_score: parseInt(e.target.value) }
                                                })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Batas Waktu (Menit, 0 = Tanpa Batas)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full px-5 py-3 bg-white border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-bold"
                                                value={formData.quiz_data.time_limit || 0}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    quiz_data: { ...formData.quiz_data, time_limit: parseInt(e.target.value) || null }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <label className="block font-bold text-gray-700 uppercase tracking-widest text-[10px]">Daftar Pertanyaan ({formData.quiz_data.questions.length})</label>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={openQuestionBank}
                                                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-50 transition-all"
                                            >
                                                <Library className="w-3 h-3" />
                                                Bank Soal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={addQuestion}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all"
                                            >
                                                <Plus className="w-3 h-3" />
                                                Tambah Pertanyaan
                                            </button>
                                        </div>
                                    </div>

                                    {formData.quiz_data.questions.map((q, qIndex) => (
                                        <div key={q.client_id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-gray-100 shrink-0">
                                                    {qIndex + 1}
                                                </div>
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Tuliskan pertanyaan di sini..."
                                                            className="flex-1 px-5 py-3 bg-white border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-bold text-sm"
                                                            value={q.text}
                                                            onChange={(e) => updateQuestion(qIndex, e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeQuestion(qIndex)}
                                                            className="p-3 bg-white hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-2xl transition-all border border-transparent hover:border-red-100"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 pl-2">
                                                        {[
                                                            { id: QUESTION_TYPE_MULTIPLE_CHOICE, label: 'Pilihan Ganda' },
                                                            { id: QUESTION_TYPE_SHORT_ANSWER, label: 'Isian Singkat' },
                                                        ].map((option) => (
                                                            <button
                                                                key={option.id}
                                                                type="button"
                                                                onClick={() => updateQuestionType(qIndex, option.id)}
                                                                className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${q.question_type === option.id
                                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                                    : 'bg-white text-gray-400 hover:text-indigo-600 border border-gray-100'
                                                                    }`}
                                                            >
                                                                {option.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="pl-2">
                                                        <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/80 p-4">
                                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Gambar Pertanyaan</p>
                                                                    <p className="mt-2 text-xs leading-5 text-gray-500">
                                                                        Sisipkan gambar jika soal membutuhkan ilustrasi, diagram, tabel, atau contoh visual.
                                                                    </p>
                                                                </div>
                                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-700">
                                                                    <Upload className="h-3.5 w-3.5" />
                                                                    Sisipkan Gambar
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        onChange={(e) => handleQuestionImageChange(qIndex, e.target.files?.[0] || null)}
                                                                    />
                                                                </label>
                                                            </div>
                                                            {(questionImageFiles[q.client_id] || q.image_url) && (
                                                                <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={questionImageFiles[q.client_id]
                                                                            ? URL.createObjectURL(questionImageFiles[q.client_id] as File)
                                                                            : (q.image_url || '')}
                                                                        alt={`Gambar pertanyaan ${qIndex + 1}`}
                                                                        className="max-h-64 w-full rounded-xl object-contain"
                                                                    />
                                                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                                            {questionImageFiles[q.client_id]?.name || 'Gambar tersimpan'}
                                                                        </p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => clearQuestionImage(qIndex)}
                                                                            className="rounded-xl border border-rose-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50"
                                                                        >
                                                                            Hapus Gambar
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {q.question_type === QUESTION_TYPE_SHORT_ANSWER ? (
                                                        <div className="space-y-2 pl-2">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kunci Jawaban Isian</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Contoh: ISO 9001"
                                                                className="w-full px-4 py-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-900"
                                                                value={q.correct_answer || ''}
                                                                onChange={(e) => updateCorrectAnswer(qIndex, e.target.value)}
                                                            />
                                                            <p className="text-[10px] text-gray-400 font-medium">Jawaban dinilai otomatis tanpa membedakan huruf besar/kecil dan spasi berlebih.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3 pl-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilihan Jawaban</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addAlternative(qIndex)}
                                                                    className="text-indigo-600 hover:text-indigo-700 font-bold text-[10px] uppercase tracking-widest"
                                                                >
                                                                    + Opsi Baru
                                                                </button>
                                                            </div>
                                                            {(q.alternatives || []).map((a, aIndex) => (
                                                                <div key={aIndex} className="flex items-center gap-3 group">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateAlternative(qIndex, aIndex, { is_correct: true })}
                                                                        className={`p-2 rounded-lg transition-all ${a.is_correct ? 'bg-green-100 text-green-600' : 'bg-white text-gray-200 hover:text-gray-400 border border-gray-100'}`}
                                                                    >
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                    </button>
                                                                    <input
                                                                        type="text"
                                                                        placeholder={`Pilihan ${aIndex + 1}...`}
                                                                        className={`flex-1 px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium text-gray-900 ${a.is_correct ? 'ring-1 ring-green-200' : ''}`}
                                                                        value={a.text}
                                                                        onChange={(e) => updateAlternative(qIndex, aIndex, { text: e.target.value })}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeAlternative(qIndex, aIndex)}
                                                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {formData.quiz_data.questions.length === 0 && (
                                        <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-[2rem]">
                                            <p className="text-gray-400 text-sm font-medium">Belum ada pertanyaan. Klik tombol di atas untuk menambah.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Isi Artikel / Blog</label>
                                <div className="border border-gray-100 rounded-[2rem] overflow-hidden shadow-inner">
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.content}
                                        onChange={handleQuillChange}
                                        modules={quillModules}
                                        formats={quillFormats}
                                        placeholder="Tuliskan materi pembelajaran lengkap di sini (anda bisa menyisipkan gambar, link, dan format teks)..."
                                    />
                                </div>
                                <p className="mt-3 text-[10px] text-gray-400 font-medium">Editor ini mendukung format teks (bold, italic), link, gambar, dan perataan teks.</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Estimasi Waktu Belajar</label>
                        <input
                            type="text"
                            name="duration"
                            placeholder="Contoh: 15 Menit"
                            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 font-bold"
                            value={formData.duration}
                            onChange={handleChange}
                        />
                    </div>

                    {!isAssessmentType && formData.type !== 'article' && (
                        <div>
                            <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Gambar Sampul Materi (Opsional)</label>
                            <div className="group relative border-2 border-dashed border-gray-200 rounded-[2rem] p-10 text-center hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer overflow-hidden">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleFileChange}
                                />
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-white transition-colors">
                                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-bold text-gray-700">
                                            {formData.image ? formData.image.name : 'Pilih Gambar Sampul'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium">Maksimal 2MB. Format JPG, PNG, atau WEBP.</span>
                                    </div>
                                </div>
                            </div>
                            {currentImageUrl && !formData.image && (
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gambar Saat Ini:</span>
                                    <a href={currentImageUrl} target="_blank" className="text-[10px] font-bold text-indigo-600 hover:underline">LIHAT ASSET</a>
                                </div>
                            )}
                        </div>
                    )}

                    {!isAssessmentType && (
                    <div>
                        <label className="block font-bold text-gray-700 mb-2 uppercase tracking-widest text-[10px]">Lampiran Materi (Opsional)</label>
                        <div className="group relative border-2 border-dashed border-gray-200 rounded-[2rem] p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer overflow-hidden">
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleAttachmentChange}
                            />
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-white transition-colors">
                                    <FileText className="w-8 h-8 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                </div>
                                <div>
                                    <span className="block text-sm font-bold text-gray-700">
                                        {formData.attachment ? formData.attachment.name : 'Pilih File PDF, Word, PPT, atau Excel'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">Maksimal 10MB. Format PDF, DOC, DOCX, PPT, PPTX, XLS, atau XLSX.</span>
                                </div>
                            </div>
                        </div>
                        {currentAttachmentUrl && !formData.attachment && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lampiran Saat Ini:</span>
                                <a href={currentAttachmentUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-600 hover:underline">
                                    {currentAttachmentName || 'LIHAT LAMPIRAN'}
                                </a>
                            </div>
                        )}
                    </div>
                    )}
                </div>

                <div className="pt-8 border-t border-gray-50 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                    >
                        {saving ? 'Proses Simpan...' : 'Simpan Materi'}
                    </button>
                </div>
            </form>

            {questionBankOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4 py-6">
                    <div className="w-full max-w-3xl max-h-[86vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
                        <div className="flex items-center justify-between gap-4 border-b border-gray-100 p-5">
                            <div>
                                <h2 className="text-lg font-black text-gray-900">Bank Soal</h2>
                                <p className="text-xs font-medium text-gray-500 mt-1">{selectedQuestionIds.length} soal dipilih</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQuestionBankOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 border-b border-gray-100">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                                    <Search className="w-4 h-4 text-gray-400" />
                                    <input
                                        type="search"
                                        value={questionBankSearch}
                                        onChange={(e) => setQuestionBankSearch(e.target.value)}
                                        placeholder="Cari soal, materi, atau course"
                                        className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400"
                                    />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <select
                                        value={questionBankSourceFilter}
                                        onChange={(e) => setQuestionBankSourceFilter(e.target.value)}
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                    >
                                        {QUESTION_BANK_SOURCE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={questionBankTypeFilter}
                                        onChange={(e) => setQuestionBankTypeFilter(e.target.value)}
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                    >
                                        {QUESTION_BANK_TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="max-h-[52vh] overflow-y-auto p-5 space-y-3">
                            {questionBankLoading ? (
                                <div className="py-12 text-center text-sm font-bold text-gray-400">Memuat bank soal...</div>
                            ) : filteredQuestionBankItems.length > 0 ? (
                                filteredQuestionBankItems.map((question) => {
                                    const selected = selectedQuestionIds.includes(question.id);
                                    return (
                                        <label
                                            key={question.id}
                                            className={`block rounded-2xl border p-4 transition-all cursor-pointer ${selected ? 'border-indigo-300 bg-indigo-50/70' : 'border-gray-100 hover:border-indigo-100 hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleQuestionSelection(question.id)}
                                                    className="mt-1 h-4 w-4 accent-indigo-600"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-gray-900 leading-relaxed">{question.text}</p>
                                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                                                        <span className="rounded-lg bg-white px-2 py-1 text-indigo-600 border border-indigo-100">{question.question_type === QUESTION_TYPE_SHORT_ANSWER ? 'Isian' : 'Pilihan Ganda'}</span>
                                                        <span className="rounded-lg bg-indigo-50 px-2 py-1 text-indigo-700 border border-indigo-100">{getLessonTypeLabel(question.source_lesson_type)}</span>
                                                        <span className="rounded-lg bg-white px-2 py-1 text-gray-500 border border-gray-100">{question.source_lesson_title}</span>
                                                        <span className="rounded-lg bg-white px-2 py-1 text-gray-500 border border-gray-100">{question.source_course_title}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })
                            ) : (
                                <div className="py-12 text-center text-sm font-bold text-gray-400">Belum ada soal yang cocok.</div>
                            )}
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 p-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setQuestionBankOpen(false)}
                                className="px-5 py-3 text-sm font-bold text-gray-500 hover:text-gray-800"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={selectedQuestionIds.length === 0}
                                onClick={() => importQuestionsFromBank(questionBankItems.filter((question) => selectedQuestionIds.includes(question.id)))}
                                className="rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-40"
                            >
                                Impor Soal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

