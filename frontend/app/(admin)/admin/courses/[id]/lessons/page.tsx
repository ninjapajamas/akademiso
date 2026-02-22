import CourseCurriculumContent from './CourseCurriculumContent';

export default async function CourseCurriculumPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <CourseCurriculumContent courseId={id} />;
}
