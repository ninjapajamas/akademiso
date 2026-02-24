import LessonFormContent from './LessonFormContent';

export default async function InstructorLessonFormPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
    const { id, lessonId } = await params;
    return <LessonFormContent courseId={id} lessonId={lessonId} />;
}
