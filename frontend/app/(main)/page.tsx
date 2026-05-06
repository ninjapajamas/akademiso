import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  Factory,
  Search,
  Users,
  Zap,
} from 'lucide-react';
import HeroCategoryMarquee from '@/components/home/HeroCategoryMarquee';
import HomeTopicCourseSection from '@/components/home/HomeTopicCourseSection';
import { Course } from '@/types';
import { getServerApiBaseUrl } from '@/utils/api';

async function getHomeCourses() {
  try {
    const apiUrl = getServerApiBaseUrl();
    const res = await fetch(`${apiUrl}/api/courses/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');

    const courses: Course[] = await res.json();
    return courses.filter((course) => course.is_active);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
}

function formatCompactNumber(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}k+`;
  }

  return `${value}+`;
}

export default async function Home() {
  const allCourses = await getHomeCourses();
  const featuredCourses = allCourses.filter((course) => course.is_featured).slice(0, 4);
  const highlightedCourses = featuredCourses.length > 0 ? featuredCourses : allCourses.slice(0, 4);

  const courseCategories = Array.from(
    new Map(
      allCourses.flatMap((course) =>
        course.category
          ? [[
              course.category.slug,
              {
                slug: course.category.slug,
                name: course.category.name,
              },
            ] as const]
          : []
      )
    ).values()
  ).slice(0, 6);

  const categoryChips =
    courseCategories.length > 0
      ? courseCategories
      : [
          { slug: 'iso-9001', name: 'ISO 9001' },
          { slug: 'audit-internal', name: 'Audit Internal' },
          { slug: 'k3', name: 'K3 & Compliance' },
          { slug: 'iso-27001', name: 'ISO 27001' },
          { slug: 'lead-auditor', name: 'Lead Auditor' },
          { slug: 'awareness', name: 'Awareness Class' },
        ];
  const totalHighlightedParticipants = highlightedCourses.reduce(
    (total, course) => total + course.enrolled_count,
    0
  );

  const heroStats = [
    {
      value: allCourses.length > 0 ? formatCompactNumber(allCourses.length) : 'Siap',
      label: allCourses.length > 0 ? 'program aktif di katalog' : 'untuk kurasi program ISO',
    },
    {
      value: courseCategories.length > 0 ? `${courseCategories.length}` : '6',
      label: 'fokus kompetensi populer',
    },
    {
      value:
        totalHighlightedParticipants > 0
          ? formatCompactNumber(totalHighlightedParticipants)
          : 'Praktis',
      label:
        totalHighlightedParticipants > 0
          ? 'peserta pada program unggulan'
          : 'materi yang diarahkan ke implementasi',
    },
  ];

  const serviceModes = [
    {
      title: 'Public Training',
      description: 'Cocok untuk individu dan tim kecil yang ingin mulai cepat dengan jadwal yang sudah tersedia.',
      icon: Users,
      points: ['Jadwal lebih fleksibel', 'Format kelas terstruktur', 'Ideal untuk upskilling cepat'],
    },
    {
      title: 'Workshop Intensif',
      description: 'Belajar padat dan fokus untuk topik tertentu, lengkap dengan studi kasus yang lebih operasional.',
      icon: Zap,
      points: ['Bahas satu topik secara dalam', 'Durasi ringkas', 'Cocok untuk kebutuhan taktis'],
    },
    {
      title: 'In-House Program',
      description: 'Materi dan pendekatan bisa menyesuaikan tantangan proses kerja, audit, atau target compliance tim Anda.',
      icon: Factory,
      points: ['Silabus bisa dikustom', 'Efisien untuk tim besar', 'Lebih dekat ke kebutuhan perusahaan'],
    },
  ];

  const advantages = [
    {
      title: 'Materi lebih dekat ke implementasi',
      description: 'Konten diarahkan ke audit, SOP, dokumentasi, dan kesiapan sertifikasi agar lebih mudah diterapkan oleh peserta.',
      icon: Search,
    },
    {
      title: 'Bahasa bisnis lebih terasa',
      description: 'Pesan utama menekankan hasil kerja, compliance, dan penguatan kompetensi tim supaya lebih relevan untuk korporat.',
      icon: Award,
    },
    {
      title: 'Navigasi program lebih cepat',
      description: 'Kategori, program unggulan, dan format belajar tampil lebih awal agar pengunjung cepat masuk ke jalur yang paling sesuai.',
      icon: BookOpen,
    },
    {
      title: 'Arah tindakan lebih jelas',
      description: 'Sejak hero sampai penutup, pengunjung selalu tahu langkah berikutnya: eksplor program, daftar, atau mulai dari kelas unggulan.',
      icon: CheckCircle,
    },
  ];

  const comparisonRows = [
    {
      title: 'Materi sering terasa terlalu teoritis',
      current: 'Peserta paham istilah ISO, tetapi masih bingung menghubungkannya dengan SOP, audit internal, dan dokumen kerja di lapangan.',
      improved: 'Program diposisikan sebagai pembelajaran yang lebih aplikatif dengan studi kasus, struktur materi jelas, dan arah implementasi yang konkret.',
    },
    {
      title: 'Sulit memilih program yang paling relevan',
      current: 'Tanpa struktur konten yang kuat, user harus scroll cukup jauh untuk memahami kelas mana yang cocok untuk kebutuhan tim atau individu.',
      improved: 'Homepage langsung menampilkan kategori populer, program unggulan, dan format layanan agar proses memilih terasa jauh lebih cepat.',
    },
    {
      title: 'Kebutuhan tim belum selalu pas dengan format kelas',
      current: 'Sebagian perusahaan butuh jadwal cepat, sebagian lagi butuh kelas kustom, tetapi informasi itu sering tidak langsung terlihat.',
      improved: 'Public training, workshop intensif, dan in-house ditampilkan jelas sejak awal supaya pembeli bisa memilih format paling efisien.',
    },
  ];

  const faqs = [
    {
      question: 'Apakah kelas ini cocok untuk individu maupun tim perusahaan?',
      answer:
        'Ya. Struktur halaman ini sengaja menampilkan jalur public training, workshop, dan in-house agar kebutuhan individu maupun korporat sama-sama terakomodasi.',
    },
    {
      question: 'Apa bedanya public training dan in-house program?',
      answer:
        'Public training cocok untuk peserta perorangan atau tim kecil dengan jadwal yang sudah tersedia. In-house lebih fleksibel untuk kebutuhan perusahaan yang ingin materi dan sesi menyesuaikan proses internal.',
    },
    {
      question: 'Kalau saya belum tahu harus mulai dari program mana?',
      answer:
        'Mulailah dari program unggulan atau kategori yang paling dekat dengan target Anda, misalnya audit internal, sistem mutu, atau kelas awareness. Homepage ini memang disusun untuk mempermudah langkah awal itu.',
    },
  ];

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-white py-10 sm:py-16 lg:py-24">
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-blue-50 via-white to-white" />

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 sm:gap-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="space-y-6 sm:space-y-8">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-blue-700 sm:px-4 sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="truncate">Pelatihan ISO Untuk Profesional & Tim</span>
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-7xl">
                Pusat Pelatihan & Sertifikasi ISO yang{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Siap Membantu Tim Anda Bergerak Lebih Pasti
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
                Tingkatkan kesiapan audit, mutu proses, dan kompetensi tim melalui program ISO
                yang disusun agar lebih mudah dipahami, relevan untuk kebutuhan kerja, dan jelas
                jalur tindak lanjutnya sejak pertama kali halaman dibuka.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-blue-600/35 sm:px-8 sm:py-4 sm:text-base"
              >
                Lihat Program Unggulan
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:px-8 sm:py-4 sm:text-base"
              >
                Buat Akun & Mulai
              </Link>
            </div>

            <HeroCategoryMarquee categories={categoryChips} />

            <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-6 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/4.2] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl sm:rounded-[2rem] sm:shadow-2xl">
              <Image
                src="/hero.png"
                alt="Pelatihan dan sertifikasi ISO untuk profesional"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/10 via-transparent to-blue-900/10" />

              <div className="absolute left-4 right-4 top-4 rounded-2xl border border-white/70 bg-white/92 p-4 shadow-lg backdrop-blur sm:left-6 sm:right-6 sm:top-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                  Jalur yang langsung terlihat
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-blue-50 p-3">
                    <p className="text-sm font-bold text-gray-900">Kategori populer</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                      Topik seperti audit internal, ISO awareness, dan sistem mutu langsung terlihat.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-sm font-bold text-gray-900">Format belajar jelas</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                      Public training, workshop, dan in-house lebih mudah dibedakan sejak awal.
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/70 bg-white/94 p-4 shadow-xl backdrop-blur sm:bottom-6 sm:left-6 sm:right-6 sm:rounded-[1.5rem] sm:p-5">
                <p className="text-sm font-bold text-gray-900">Belajar lebih terarah, bukan sekadar melihat katalog</p>
                <div className="mt-3 space-y-2 text-xs text-gray-600 sm:mt-4 sm:space-y-3 sm:text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    Program unggulan muncul lebih cepat untuk mempersingkat proses eksplorasi.
                  </div>
                  <div className="hidden items-start gap-3 sm:flex">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    Copy menekankan manfaat bisnis, audit readiness, dan peningkatan kompetensi tim.
                  </div>
                  <div className="hidden items-start gap-3 sm:flex">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    Section disusun untuk membantu user memilih jalur belajar yang paling sesuai.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeTopicCourseSection courses={allCourses} />

      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">
              Format Belajar
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
              Pilih pendekatan yang paling cocok dengan jadwal, target, dan ritme kerja tim Anda.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {serviceModes.map(({ title, description, icon: Icon, points }) => (
              <div
                key={title}
                className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm sm:p-7"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-blue-100">{description}</p>
                <div className="mt-5 space-y-2 text-sm text-white/90">
                  {points.map((point) => (
                    <div key={point} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-100" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Kenapa Memilih Akademiso
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
              Kami bantu pengunjung memahami nilai program lebih cepat sejak section pertama.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {advantages.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-7"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                  <Icon className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Masalah Yang Sering Muncul
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
              Banyak tim butuh pelatihan ISO yang lebih jelas arahnya, bukan sekadar daftar kelas.
            </h2>
          </div>

          <div className="grid gap-6">
            {comparisonRows.map((row) => (
              <div
                key={row.title}
                className="grid gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:gap-4 sm:p-6 lg:grid-cols-[0.8fr_1fr_1fr]"
              >
                <div className="rounded-[1.5rem] bg-gray-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                    Tantangan Umum
                  </p>
                  <h3 className="mt-3 text-xl font-bold text-gray-900">{row.title}</h3>
                </div>
                <div className="rounded-[1.5rem] border border-red-100 bg-red-50/70 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">
                    Yang Sering Terjadi
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{row.current}</p>
                </div>
                <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/80 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                    Pendekatan Akademiso
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-700">{row.improved}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-white sm:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-200">
              Pusat Bantuan
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
              Hal yang paling sering ingin diketahui sebelum memilih program.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
              Section FAQ membantu pengunjung memahami alur belajar dan jenis layanan dengan cepat,
              tanpa harus membuka terlalu banyak halaman tambahan.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-[1.5rem] border border-white/10 bg-white/5 p-6"
              >
                <summary className="cursor-pointer list-none text-lg font-bold text-white">
                  {faq.question}
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-5 py-10 text-white sm:px-8 sm:py-12 md:px-12 md:py-16">
            <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">
                  Mulai Dari Program Yang Relevan
                </p>
                <h2 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
                  Tinggal pilih jalur yang sesuai, lalu lanjutkan ke program ISO yang paling dekat dengan kebutuhan Anda.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-blue-100">
                  Homepage ini sekarang disusun agar pengunjung langsung melihat konteks, program
                  unggulan, pembeda layanan, dan langkah berikutnya tanpa kehilangan nuansa visual
                  khas Akademiso.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                <div className="space-y-3 text-sm text-white/90">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                    Hero langsung menjelaskan manfaat program untuk individu maupun tim.
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                    Program unggulan dan format belajar kini tampil lebih menonjol.
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                    Visual tetap satu keluarga dengan komponen lain di project.
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/courses"
                    className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50"
                  >
                    Cek Katalog
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    Mulai Sekarang
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
