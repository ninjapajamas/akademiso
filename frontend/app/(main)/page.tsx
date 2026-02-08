import Link from 'next/link';
import Image from 'next/image';
import { Search, CheckCircle, ArrowRight } from 'lucide-react';
import CourseCard from '@/components/CourseCard';
import { Course } from '@/types';

// Dummy Data to match screenshot
const courses: Course[] = [
  {
    id: 1,
    title: "ISO 9001:2015 Management Mutu",
    slug: "iso-9001",
    description: "Sistem Manajemen Mutu",
    price: "2500000",
    level: "Beginner",
    duration: "2 Hari",
    rating: "4.9",
    enrolled_count: 850,
    instructor: { id: 1, name: "Dr. Budi Santoso", title: "", bio: "", photo: null },
    category: { id: 1, name: "Mutu (Quality)", slug: "quality" },
    thumbnail: null,
    is_featured: true,
  },
  {
    id: 2,
    title: "ISO 27001 Keamanan Informasi",
    slug: "iso-27001",
    description: "Information Security Management",
    price: "3500000",
    level: "Intermediate",
    duration: "3 Hari",
    rating: "4.8",
    enrolled_count: 520,
    instructor: { id: 2, name: "Sarah Wijaya, CISA", title: "", bio: "", photo: null },
    category: { id: 2, name: "Keamanan", slug: "security" },
    thumbnail: null,
    is_featured: true,
  },
  {
    id: 3,
    title: "ISO 45001 K3",
    slug: "iso-45001",
    description: "Occupational Health and Safety",
    price: "2200000",
    level: "Beginner",
    duration: "2 Hari",
    rating: "4.8",
    enrolled_count: 338,
    instructor: { id: 3, name: "Ir. Joko Susilo", title: "", bio: "", photo: null },
    category: { id: 3, name: "K3 (Safety)", slug: "safety" },
    thumbnail: null,
    is_featured: true,
  },
  {
    id: 4,
    title: "ISO 14001 Manajemen Lingkungan",
    slug: "iso-14001",
    description: "Environmental Management",
    price: "2100000",
    level: "Beginner",
    duration: "2 Hari",
    rating: "4.7",
    enrolled_count: 300,
    instructor: { id: 4, name: "Dewi Lestari, M.Env", title: "", bio: "", photo: null },
    category: { id: 4, name: "Lingkungan", slug: "environment" },
    thumbnail: null,
    is_featured: true,
  },
];

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-white py-20 lg:py-28 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wide uppercase border border-blue-100">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                Professional Certification Ready
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight">
                Pusat Pelatihan & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Sertifikasi ISO Terpercaya</span>
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
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {i === 4 ? '5k+' : ''}
                    </div>
                  ))}
                </div>
                <div>
                  <span className="font-bold text-gray-900">5,000+</span> Profesional telah tersertifikasi.
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Image Placeholder */}
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/3] bg-gray-100 border border-gray-200">
                {/* You would use a real image here */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 to-transparent mix-blend-multiply"></div>

                {/* Floating Cards */}
                <div className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-gray-100 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Sertifikat Resmi ISO</p>
                    <p className="text-sm text-gray-500">Terakreditasi KAN & Internasional</p>
                  </div>
                </div>

                <div className="absolute top-8 right-8 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-lg border border-gray-100 max-w-[150px]">
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-4 h-4 text-yellow-500 fill-current">★</div>)}
                  </div>
                  <p className="text-xs font-bold text-gray-900">Rated 4.9/5 by 850 Companies</p>
                </div>
              </div>

              {/* Decorative Blob */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10"></div>
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-10 border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-bold text-blue-900/60 uppercase tracking-widest mb-8">Dipercaya oleh Korporasi untuk Standarisasi Mutu</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {['Manufaktur', 'Healthcare', 'Konstruksi', 'Teknologi', 'Energi'].map((industry) => (
              <div key={industry} className="flex items-center gap-2 font-bold text-xl text-gray-400">
                <div className="w-6 h-6 bg-gray-300 rounded"></div>
                {industry}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Program Sertifikasi Unggulan</h2>
              <p className="text-gray-600">Daftar kursus ISO paling diminati oleh industri saat ini.</p>
            </div>
            <Link href="/courses" className="hidden md:flex items-center text-blue-600 font-bold hover:underline">
              Lihat semua program
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {courses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          <div className="mt-12 text-center md:hidden">
            <Link href="/courses" className="inline-flex items-center text-blue-600 font-bold">
              Lihat semua program
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Proses Sertifikasi</h2>
          <p className="text-gray-600 mb-16 max-w-2xl mx-auto">Tiga langkah mudah menuju standarisasi dan keunggulan profesional.</p>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {[
              { title: "1. Pilih Standar ISO", desc: "Temukan standar yang sesuai dengan kebutuhan industri atau karir Anda.", icon: <Search className="w-8 h-8 text-blue-600" /> },
              { title: "2. Pelatihan Intensif", desc: "Ikuti pelatihan komprehensif dari instruktur bersertifikat internasional.", icon: <div className="w-8 h-8 text-blue-600">🎓</div> },
              { title: "3. Professional Certification", desc: "Lulus ujian dan dapatkan sertifikat profesional yang diakui secara global.", icon: <div className="w-8 h-8 text-blue-600">🏅</div> }
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center relative z-10">
                <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center mb-6 shadow-sm">
                  {step.icon}
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed px-4">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-blue-600 rounded-3xl p-8 md:p-16 text-white relative overflow-hidden">
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Siap untuk Sertifikasi?</h2>
                <p className="text-blue-100 text-lg mb-0 leading-relaxed">
                  Konsultasikan kebutuhan ISO perusahaan Anda. Dapatkan penawaran khusus untuk in-house training dan implementasi sistem.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-2 rounded-full flex pl-6 pr-2 py-2">
                <input type="email" placeholder="Masukkan email kerja" className="bg-transparent border-none outline-none text-white placeholder-blue-200 w-full" />
                <button className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-900 transition-colors whitespace-nowrap">
                  Hubungi Kami
                </button>
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
