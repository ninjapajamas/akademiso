'use client';

import Link from 'next/link';
import { type ComponentType, useState } from 'react';
import { ArrowRight, Award, BookOpen, Factory, Heart, Users, Zap } from 'lucide-react';
import CourseCard from '@/components/CourseCard';
import { Course } from '@/types';

type TopicKey =
  | 'all'
  | 'manufacturing'
  | 'healthcare'
  | 'quality-system'
  | 'internal-training'
  | 'fast-operations';

type TopicFilter = {
  key: TopicKey;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const topicFilters: TopicFilter[] = [
  {
    key: 'all',
    label: 'Semua Topik',
    description: 'Menampilkan pilihan program yang paling relevan dan paling sering dijelajahi pengunjung.',
    icon: BookOpen,
  },
  {
    key: 'manufacturing',
    label: 'Manufaktur',
    description: 'Fokus pada mutu proses, audit, dan sistem kerja yang dekat dengan kebutuhan operasional industri.',
    icon: Factory,
  },
  {
    key: 'healthcare',
    label: 'Healthcare',
    description: 'Pilihan topik yang lebih dekat ke kebutuhan layanan kesehatan, keselamatan, dan tata kelola proses.',
    icon: Heart,
  },
  {
    key: 'quality-system',
    label: 'Sistem Mutu',
    description: 'Program untuk memperkuat pemahaman ISO, implementasi SMM, hingga kesiapan audit mutu.',
    icon: Award,
  },
  {
    key: 'internal-training',
    label: 'Pelatihan Internal',
    description: 'Cocok untuk kebutuhan awareness, internal auditor, dan penguatan kompetensi tim internal.',
    icon: Users,
  },
  {
    key: 'fast-operations',
    label: 'Operasional Cepat',
    description: 'Program yang lebih ringkas untuk kebutuhan belajar cepat, praktis, dan mudah segera dijalankan.',
    icon: Zap,
  },
];

function normalizeCourseText(course: Course) {
  return [
    course.title,
    course.description,
    course.category?.name,
    course.category?.slug,
    course.instructor?.name,
    course.type,
    course.level,
    course.duration,
    course.location,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function extractDurationInDays(duration: string) {
  const match = duration.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function matchesTopic(course: Course, topic: TopicKey) {
  if (topic === 'all') return true;

  const text = normalizeCourseText(course);
  const durationInDays = extractDurationInDays(course.duration);

  if (topic === 'manufacturing') {
    return (
      ['manufaktur', 'manufacturing', 'pabrik', 'produksi', 'mutu', 'quality', 'operasional'].some(
        (keyword) => text.includes(keyword)
      ) || course.category?.slug?.includes('mutu')
    );
  }

  if (topic === 'healthcare') {
    return [
      'healthcare',
      'kesehatan',
      'rumah sakit',
      'klinik',
      'laboratorium',
      'farmasi',
      'medis',
      'keselamatan',
      'safety',
      'hse',
      'k3',
    ].some((keyword) => text.includes(keyword));
  }

  if (topic === 'quality-system') {
    return [
      'iso 9001',
      'mutu',
      'quality',
      'sistem manajemen mutu',
      'smm',
      'audit',
      'lead auditor',
    ].some((keyword) => text.includes(keyword));
  }

  if (topic === 'internal-training') {
    return [
      'internal auditor',
      'audit internal',
      'awareness',
      'pelatihan internal',
      'training internal',
      'tim internal',
    ].some((keyword) => text.includes(keyword));
  }

  if (topic === 'fast-operations') {
    return (
      course.type === 'webinar' ||
      course.type === 'workshop' ||
      (durationInDays !== null && durationInDays <= 2) ||
      ['awareness', 'ringkas', 'praktis', 'cepat'].some((keyword) => text.includes(keyword))
    );
  }

  return true;
}

function sortCourses(courses: Course[]) {
  return [...courses].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    if (a.enrolled_count !== b.enrolled_count) return b.enrolled_count - a.enrolled_count;
    return Number(b.rating ?? 0) - Number(a.rating ?? 0);
  });
}

export default function HomeTopicCourseSection({ courses }: { courses: Course[] }) {
  const [activeTopic, setActiveTopic] = useState<TopicKey>('all');

  const activeFilter = topicFilters.find((filter) => filter.key === activeTopic) ?? topicFilters[0];
  const matchingCourses = sortCourses(courses).filter((course) => matchesTopic(course, activeTopic));

  const visibleCourses = matchingCourses.slice(0, 4);

  return (
    <section className="border-y border-gray-100 bg-white py-10 sm:py-12 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Topik Yang Sering Dicari
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
              Pilih topik yang paling dekat dengan kebutuhan tim, lalu langsung lihat programnya.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              {activeFilter.description}
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center text-sm font-bold text-blue-600 transition-colors hover:text-blue-700"
          >
            Jelajahi semua program
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {topicFilters.map(({ key, label, icon: Icon }) => {
            const isActive = key === activeTopic;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTopic(key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-xs font-bold transition-all sm:px-5 sm:text-sm ${
                  isActive
                    ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-blue-200 hover:text-blue-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 text-sm text-gray-500">
          Menampilkan {visibleCourses.length} dari {matchingCourses.length} program untuk topik{' '}
          <span className="font-semibold text-gray-700">{activeFilter.label}</span>.
        </div>

        {visibleCourses.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
            {visibleCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Belum ada program untuk topik {activeFilter.label.toLowerCase()}
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-500">
              Kami belum menemukan program aktif yang cocok dengan filter ini. Anda tetap bisa
              melihat seluruh katalog untuk menemukan topik terdekat.
            </p>
            <Link
              href="/courses"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              Lihat semua program
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
