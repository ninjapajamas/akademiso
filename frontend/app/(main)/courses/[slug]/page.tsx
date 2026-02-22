import CourseDetailContent from './CourseDetailContent';

export default async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return <CourseDetailContent slug={slug} />;
}
