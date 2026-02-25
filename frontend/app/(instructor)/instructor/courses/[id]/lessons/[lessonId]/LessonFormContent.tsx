'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Image as ImageIcon, Video, FileText, ChevronRight, HelpCircle, Plus, Trash2, CheckCircle2, Trophy } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-40 bg-gray-50 rounded-2xl animate-pulse flex items-center justify-center text-gray-400 text-sm font-medium">Memuat Editor...</div>
});
import 'react-quill-new/dist/quill.snow.css';

export default function LessonFormContent({ courseId, lessonId }: { courseId: string; lessonId: string }) {
    const isNew = lessonId === 'new';
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSectionId = searchParams.get('section_id') || '';

    const [formData, setFormData] = useState({
        title: '',
        type: 'video',
        section_id: initialSectionId,
        video_url: '',
        content: '',
        duration: '',
        order: 1,
        image: null as File | null,
        quiz_data: {
            pass_score: 70,
            time_limit: null as number | null,
            questions: [] as any[]
        }
    });
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

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
                            type: data.type,
                            section_id: data.section || '',
                            video_url: data.video_url || '',
                            content: data.content || '',
                            duration: data.duration || '',
                            order: data.order,
                            image: null,
                            quiz_data: data.quiz_data || {
                                pass_score: 70,
                                time_limit: null,
                                questions: []
                            }
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

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleQuillChange = (content: string) => {
        setFormData({ ...formData, content });
    };

    const handleFileChange = (e: any) => {
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
                        order: formData.quiz_data.questions.length + 1,
                        alternatives: [
                            { text: '', is_correct: true, order: 1 },
                            { text: '', is_correct: false, order: 2 }
                        ]
                    }
                ]
            }
        });
    };

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

    const updateAlternative = (qIndex: number, aIndex: number, updates: any) => {
        const newQuestions = [...formData.quiz_data.questions];
        if (updates.hasOwnProperty('is_correct') && updates.is_correct) {
            // Uncheck others in the SAME question
            newQuestions[qIndex].alternatives = newQuestions[qIndex].alternatives.map((a: any, i: number) => ({
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

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('access_token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

            const data = new FormData();
            data.append('course', courseId);
            if (formData.section_id) data.append('section', formData.section_id);
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
            if (['quiz', 'mid_test', 'final_test', 'exam'].includes(formData.type)) {
                data.append('quiz_data', JSON.stringify(formData.quiz_data));
            }

            // Only append image if it's not an article (per user request)
            if (['video', 'quiz', 'mid_test', 'final_test', 'exam'].includes(formData.type) && formData.image) {
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
                router.push(`/instructor/courses/${courseId}/lessons`);
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
                    href={`/instructor/courses/${courseId}/lessons`}
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
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { id: 'video', label: 'Video', icon: Video },
                                { id: 'article', label: 'Artikel', icon: FileText },
                                { id: 'quiz', label: 'Quiz', icon: HelpCircle },
                                { id: 'mid_test', label: 'Mid Test', icon: HelpCircle },
                                { id: 'final_test', label: 'Final Test', icon: HelpCircle },
                                { id: 'exam', label: 'Ujian', icon: Trophy },
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
                        ) : ['quiz', 'mid_test', 'final_test', 'exam'].includes(formData.type) ? (
                            <div className="space-y-8">
                                <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
                                    <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                        <Trophy className="w-4 h-4" />
                                        Konfigurasi Ujian
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
                                    <div className="flex items-center justify-between">
                                        <label className="block font-bold text-gray-700 uppercase tracking-widest text-[10px]">Daftar Pertanyaan ({formData.quiz_data.questions.length})</label>
                                        <button
                                            type="button"
                                            onClick={addQuestion}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Tambah Pertanyaan
                                        </button>
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
                                                        {q.alternatives.map((a: any, aIndex: number) => (
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
                                                                    className={`flex-1 px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium ${a.is_correct ? 'ring-1 ring-green-200' : ''}`}
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
        </div>
    );
}
