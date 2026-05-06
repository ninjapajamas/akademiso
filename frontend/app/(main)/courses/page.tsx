import { getServerApiBaseUrl } from '@/utils/api';
import CatalogContent from './CatalogContent';

export const dynamic = 'force-dynamic';

async function getCourses() {
    try {
        const apiUrl = getServerApiBaseUrl();
        const res = await fetch(`${apiUrl}/api/courses/`, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error('Failed to fetch data');
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching courses:', error);
        return [];
    }
}

export default async function CatalogPage() {
    const courses = await getCourses();
    return <CatalogContent initialCourses={courses} />;
}
