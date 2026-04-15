'use client';

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
const normalizeLessonType = (type?: string) => ASSESSMENT_LESSON_TYPES.includes(type || '') ? 'quiz' : (type || 'video');
const QUESTION_TYPE_MULTIPLE_CHOICE = 'MC';
const QUESTION_TYPE_SHORT_ANSWER = 'SHORT_ANSWER';

type QuizAlternative = {
    id?: number;
    text: string;
    is_correct: boolean;
    order: number;
};

type QuizQuestion = {
    id?: number;
    text: string;
    question_type: string;
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
        text: question.text || '',
        question_type: question.question_type || QUESTION_TYPE_MULTIPLE_CHOICE,
        correct_answer: question.correct_answer || '',
        order: question.order || index + 1,
        alternatives: question.alternatives?.length ? question.alternatives : defaultAlternatives()
    }))
});

type QuestionBankItem = {
    id: number;
    question_type: string;
    text: string;
    correct_answer?: string;
    order: number;
    alternatives?: QuizAlternative[];
    source_lesson_title: string;
    source_course_title: string;
};

type SectionOption = {
    id: number;
    title: string;
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
    const [questionBankOpen, setQuestionBankOpen] = useState(false);
    const [questionBankLoading, setQuestionBankLoading] = useState(false);
    const [questionBankItems, setQuestionBankItems] = useState<QuestionBankItem[]>([]);
    const [questionBankSearch, setQuestionBankSearch] = useState('');
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);

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
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
                            quiz_data: normalizeQuizData(data.quiz_data)
                        });
                        setCurrentImageUrl(data.image);
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

    const addQuestion = () => {
        setFormData({
            ...formData,
            quiz_data: {
                ...formData.quiz_data,
                questions: [
                    ...formData.quiz_data.questions,
                    {
                        text: '',
                        question_type: QUESTION_TYPE_MULTIPLE_CHOICE,
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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
                text: question.text,
                question_type: question.question_type || QUESTION_TYPE_MULTIPLE_CHOICE,
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
        if (!keyword) return true;
        return [
            question.text,
            question.source_lesson_title,
            question.source_course_title,
            question.correct_answer || ''
        ].some((value) => value.toLowerCase().includes(keyword));
    });

    const removeQuestion = (index: number) => {
        const newQuestions = [...formData.quiz_data.questions];
        newQuestions.splice(index, 1);
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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
                data.append('quiz_data', JSON.stringify(formData.quiz_data));
            }

            // Only append image if it's not an article (per user request)
            if ((formData.type === 'video' || ASSESSMENT_LESSON_TYPES.includes(formData.type)) && formData.image) {
                data.append('image', formData.image);
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
                            {[
                                { id: 'video', label: 'Video', icon: Video },
                                { id: 'article', label: 'Artikel', icon: FileText },
                                { id: 'quiz', label: 'Quiz / Tes', icon: HelpCircle },
                            ].map((type) => (
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
                                        Konfigurasi Quiz / Tes
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
                                        <div key={qIndex} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-2">
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

                    {formData.type !== 'article' && (
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
