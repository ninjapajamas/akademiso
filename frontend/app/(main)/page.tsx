import Link from 'next/link';
import Image from 'next/image';
import { Search, CheckCircle, ArrowRight, Award, BookOpen, Users, Factory, Heart, Zap } from 'lucide-react';
import CourseCard from '@/components/CourseCard';
import { Course } from '@/types';

async function getFeaturedCourses() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const res = await fetch(`${apiUrl}/api/courses/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');
    const courses: Course[] = await res.json();
    return courses.filter(course => course.is_featured).slice(0, 4);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
}

export default async function Home() {
  const courses = await getFeaturedCourses();

  const industries = [
    { name: 'Manufaktur', icon: Factory },
    { name: 'Healthcare', icon: Heart },
    { name: 'Konstruksi', icon: BookOpen },
    { name: 'Teknologi', icon: Zap },
    { name: 'Energi', icon: Award },
  ];

  return (
    <div className="bg-white">

      {/* ── Hero Section ── */}
      <section className="bg-white py-20 lg:py-28 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wide uppercase border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                Professional Certification Ready
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight">
                Pusat Pelatihan &amp; <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Sertifikasi ISO Terpercaya
                </span>
              </h1>
              <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
                Raih standar internasional dengan pelatihan ISO komprehensif.
                Kami membantu profesional dan perusahaan mencapai kepatuhan mutu,
                keamanan informasi, dan K3 dengan sertifikat yang diakui global.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/courses" className="inline-flex justify-center items-center px-8 py-4 text-base font-bold rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-95">
                  Cari Pelatihan
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link href="/consulting" className="inline-flex justify-center items-center px-8 py-4 text-base font-bold rounded-full text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95">
                  Konsultasi Gratis
                </Link>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 pt-6 border-t border-gray-100">
                <div className="flex -space-x-3">
                  {[
                    { color: 'bg-blue-400', label: 'A' },
                    { color: 'bg-indigo-400', label: 'B' },
                    { color: 'bg-purple-400', label: 'C' },
                  ].map((item, i) => (
                    <div key={i} className={`w-10 h-10 rounded-full border-2 border-white ${item.color} flex items-center justify-center text-white text-xs font-bold`}>
                      {item.label}
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                    5k+
                  </div>
                </div>
                <div>
                  <span className="font-bold text-gray-900">5,000+</span> Profesional telah tersertifikasi.
                </div>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="relative">
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/3] border border-gray-200">
                <Image
                  src="/hero.png"
                  alt="ISO Certification Training — profesional menerima sertifikat"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 to-transparent mix-blend-multiply" />

                {/* Floating card — bottom */}
                <div className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-xl border border-gray-100 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Sertifikat Resmi ISO</p>
                    <p className="text-xs text-gray-500">Terakreditasi KAN &amp; Internasional</p>
                  </div>
                </div>

                {/* Floating card — top right */}
                <div className="absolute top-8 right-8 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-lg border border-gray-100 max-w-[150px]">
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map(i => <span key={i} className="text-yellow-400 text-sm">★</span>)}
                  </div>
                  <p className="text-[11px] font-bold text-gray-900 leading-snug">Rated 4.9/5 by 850 Companies</p>
                </div>
              </div>

              {/* Decorative blobs */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10" />
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10" />
            </div>

          </div>
        </div>
      </section>

      {/* ── Industries / Trust Section ── */}
      <section className="py-10 border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-bold text-blue-900/60 uppercase tracking-widest mb-8">
            Dipercaya oleh Korporasi untuk Standarisasi Mutu
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 hover:opacity-100 transition-opacity duration-500">
            {industries.map(({ name, icon: Icon }) => (
              <div key={name} className="flex items-center gap-2 font-bold text-lg text-gray-500 hover:text-blue-600 transition-colors cursor-default">
                <Icon className="w-5 h-5" />
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="py-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '5,000+', label: 'Peserta Tersertifikasi' },
              { value: '200+', label: 'Perusahaan Klien' },
              { value: '50+', label: 'Program ISO' },
              { value: '98%', label: 'Tingkat Kelulusan' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-4xl font-extrabold mb-1">{stat.value}</p>
                <p className="text-blue-200 text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Courses ── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Program Sertifikasi Unggulan</h2>
              <p className="text-gray-600">Daftar kursus ISO paling diminati oleh industri saat ini.</p>
            </div>
            <Link href="/courses" className="hidden md:flex items-center text-blue-600 font-bold hover:underline">
              Lihat semua program <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {courses.map(course => <CourseCard key={course.id} course={course} />)}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-gray-500 font-medium mb-2">Belum ada kursus unggulan yang tersedia.</p>
              <Link href="/admin/courses" className="text-blue-600 hover:underline text-sm font-semibold">
                Tambah Kursus di Admin Panel →
              </Link>
            </div>
          )}

          <div className="mt-12 text-center md:hidden">
            <Link href="/courses" className="inline-flex items-center text-blue-600 font-bold">
              Lihat semua program <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Process Section ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Proses Sertifikasi</h2>
          <p className="text-gray-600 mb-16 max-w-2xl mx-auto">
            Tiga langkah mudah menuju standarisasi dan keunggulan profesional.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: '1. Pilih Standar ISO', desc: 'Temukan standar yang sesuai dengan kebutuhan industri atau karir Anda.', icon: <Search className="w-8 h-8 text-blue-600" /> },
              { title: '2. Pelatihan Intensif', desc: 'Ikuti pelatihan komprehensif dari instruktur bersertifikat internasional.', icon: <Users className="w-8 h-8 text-blue-600" /> },
              { title: '3. Dapatkan Sertifikat', desc: 'Lulus ujian dan dapatkan sertifikat profesional yang diakui secara global.', icon: <Award className="w-8 h-8 text-blue-600" /> },
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                  {step.icon}
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-blue-600 rounded-3xl p-8 md:p-16 text-white relative overflow-hidden">
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Siap untuk Sertifikasi?</h2>
                <p className="text-blue-100 text-lg leading-relaxed">
                  Konsultasikan kebutuhan ISO perusahaan Anda. Dapatkan penawaran khusus
                  untuk in-house training dan implementasi sistem.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-full flex items-center pl-6 pr-2 py-2">
                <input
                  type="email"
                  placeholder="Masukkan email kerja"
                  className="bg-transparent border-none outline-none text-white placeholder-blue-200 w-full text-sm"
                />
                <button className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-900 transition-colors whitespace-nowrap text-sm">
                  Hubungi Kami
                </button>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />
          </div>
        </div>
      </section>

    </div>
  );
}
