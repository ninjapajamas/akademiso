import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, BarChart } from 'lucide-react';
import { Course } from '@/types';

interface CourseCardProps {
    course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
    const formatPrice = (price: string) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Number(price));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden group flex flex-col h-full">
            <div className="relative h-48 w-full overflow-hidden">
                {/* Tag */}
                <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider text-gray-800 shadow-sm">
                    {course.category.name}
                </div>

                {/* Thumbnail or Placeholder */}
                {course.thumbnail ? (
                    <Image
                        src={course.thumbnail}
                        alt={course.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                        No Image
                    </div>
                )}
            </div>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-2 text-yellow-500 text-xs font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{course.rating}</span>
                    <span className="text-gray-400 font-normal">({course.enrolled_count})</span>
                </div>

                <Link href={`/courses/${course.slug}`}>
                    <h3 className="font-bold text-lg text-gray-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                        {course.title}
                    </h3>
                </Link>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                        <BarChart className="w-3 h-3" />
                        <span>{course.level}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{course.duration}</span>
                    </div>
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-2 mb-4 mt-auto">
                    <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden relative">
                        {course.instructor.photo ? (
                            <Image src={course.instructor.photo} alt={course.instructor.name} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                {course.instructor.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <span className="text-xs text-gray-600 truncate">{course.instructor.name}</span>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between items-end">
                    <div>
                        <p className="text-blue-600 font-bold text-lg">
                            {formatPrice(course.price)}
                        </p>
                    </div>
                    <Link href={`/courses/${course.slug}`} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                        <span className="text-xl leading-none mb-0.5">+</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
