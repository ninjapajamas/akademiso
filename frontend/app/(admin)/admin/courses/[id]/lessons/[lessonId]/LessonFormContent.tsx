'use client';

import SharedLessonFormContent from '@/app/(instructor)/instructor/courses/[id]/lessons/[lessonId]/LessonFormContent';

export default function LessonFormContent({ courseId, lessonId }: { courseId: string; lessonId: string }) {
    return (
        <SharedLessonFormContent
            courseId={courseId}
            lessonId={lessonId}
            courseBasePath="/admin/courses"
        />
    );
}
