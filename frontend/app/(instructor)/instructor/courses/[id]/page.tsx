'use client';

import { use } from 'react';
import { SharedCourseFormPage } from '@/app/(admin)/admin/courses/[id]/page';

export default function InstructorCourseFormPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <SharedCourseFormPage
            courseId={id}
            managedBy="instructor"
            listHref="/instructor/courses"
            lessonsBaseHref="/instructor/courses"
        />
    );
}
