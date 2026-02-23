import CourseCurriculumContent from './CourseCurriculumContent';

export default async function InstructorCourseCurriculumPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <CourseCurriculumContent courseId={id} />;
}
