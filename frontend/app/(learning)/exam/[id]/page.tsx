'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, ArrowRight, Flag, Save } from 'lucide-react';
import Link from 'next/link';

export default function ExamPage({ params }: { params: { id: string } }) {
    const [currentQuestion, setCurrentQuestion] = useState(1);
    const [timeLeft, setTimeLeft] = useState(28 * 60 + 15); // 28:15
    const totalQuestions = 20;

    // Mock Questions
    const question = {
        id: 5,
        text: "Dalam konteks Klausul 4 ISO 9001:2015, manakah faktor eksternal yang paling relevan untuk dipertimbangkan saat menentukan konteks organisasi?",
        options: [
            "Budaya kerja internal dan nilai-nilai perusahaan",
            "Perubahan peraturan hukum dan perkembangan teknologi pasar",
            "Kompetensi dan pelatihan karyawan yang ada",
            "Struktur organisasi dan pembagian tugas internal"
        ],
        selectedAnswer: 1 // Index of selected answer (mock)
    };

    // Timer Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900 text-sm md:text-base">Akademiso</h1>
                        <p className="text-xs text-gray-500 hidden md:block">Ujian Kompetensi Pemahaman Standar ISO</p>
                    </div>
                </div>

                <Link href="/dashboard" className="text-sm font-bold text-gray-700 hover:text-red-600 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors">
                    <Save className="w-4 h-4" />
                    Simpan & Keluar
                </Link>
            </div>

            <div className="flex flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 gap-6 items-start">
                {/* Main Question Area */}
                <div className="flex-1 space-y-6">
                    {/* Info Banner */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
                        <div className="bg-yellow-100 text-yellow-700 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">i</div>
                        <div>
                            <h3 className="font-bold text-yellow-800 text-sm">Informasi Kelulusan</h3>
                            <p className="text-xs text-yellow-700 mt-1">Passing Grade 75% diperlukan untuk mendapatkan Sertifikasi Kompetensi ISO.</p>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="flex justify-between items-end text-sm text-blue-600 font-bold mb-2">
                        <span>Pertanyaan {question.id} dari {totalQuestions}</span>
                        <span className="text-gray-400 font-normal">25% Selesai</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 w-1/4 rounded-full"></div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 min-h-[400px] flex flex-col justify-center">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 leading-relaxed">
                            {question.text}
                        </h2>

                        <p className="text-gray-500 text-sm mb-8">
                            Jawablah pertanyaan berikut dengan benar. Analisislah setiap opsi berdasarkan persyaratan standar sistem manajemen mutu.
                        </p>

                        <div className="space-y-4">
                            {question.options.map((option, idx) => (
                                <label key={idx} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all group
                                    ${question.selectedAnswer === idx
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                    }
                                `}>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 transition-colors
                                        ${question.selectedAnswer === idx
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : 'border-gray-300 group-hover:border-gray-400'
                                        }
                                    `}>
                                        {question.selectedAnswer === idx && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className={`font-semibold ${question.selectedAnswer === idx ? 'text-blue-800' : 'text-gray-700'}`}>
                                        {option}
                                    </span>
                                    <input type="radio" name="answer" className="hidden" />
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8">
                        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                            <ArrowLeft className="w-5 h-5" />
                            Sebelumnya
                        </button>
                        <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-full font-bold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95">
                            Selanjutnya
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Right Panel (Timer & Navigation) */}
                <div className="w-80 hidden lg:block space-y-6">
                    {/* Timer */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Sisa Waktu</p>
                        <div className="text-4xl font-mono font-bold text-gray-900 flex items-center justify-center gap-2">
                            {formatTime(timeLeft)} <span className="text-sm text-gray-400 font-sans font-normal mt-2">mnt</span>
                        </div>
                        <div className="h-1 w-full bg-gray-100 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-green-500 w-3/4 rounded-full"></div>
                        </div>
                    </div>

                    {/* Question Nav */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">Navigasi Soal</p>
                        <div className="grid grid-cols-5 gap-3">
                            {Array.from({ length: 20 }).map((_, i) => {
                                const num = i + 1;
                                let statusClass = 'bg-gray-50 text-gray-600 hover:bg-gray-100'; // Default
                                if (num === 5) statusClass = 'bg-blue-600 text-white ring-2 ring-blue-200'; // Active
                                if (num < 5) statusClass = 'bg-green-100 text-green-700'; // Completed
                                if (num === 8) statusClass = 'bg-orange-50 text-orange-600 border border-orange-200'; // Flagged (Example)

                                return (
                                    <button
                                        key={num}
                                        className={`w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${statusClass}`}
                                    >
                                        {num}
                                        {num === 8 && <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full"></div>}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div> Selesai
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-3 h-3 bg-blue-600 rounded-full"></div> Saat Ini
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div> Ditandai
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-3 h-3 bg-gray-300 rounded-full"></div> Tertunda
                            </div>
                        </div>

                        <button className="w-full mt-6 bg-blue-50 text-blue-600 font-bold py-3 rounded-xl hover:bg-blue-100 transition-colors text-sm">
                            Kirim Jawaban
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
