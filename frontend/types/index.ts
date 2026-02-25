export interface Category {
    id: number;
    name: string;
    slug: string;
    icon?: string;
}

export interface Instructor {
    id: number;
    name: string;
    title: string;
    bio: string;
    photo: string | null;
}

export interface Lesson {
    id: number;
    title: string;
    order: number;
    duration: string;
    video_url?: string;
}

export interface Course {
    id: number;
    title: string;
    slug: string;
    description: string;
    price: string;
    discount_price?: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    duration: string;
    thumbnail: string | null;
    rating: string;
    enrolled_count: number;
    instructor: Instructor;
    category: Category;
    lessons?: Lesson[];
    type: 'course' | 'webinar' | 'workshop';
    scheduled_at?: string;
    location?: string;
    is_featured: boolean;
    created_at?: string;
}

export interface EnrolledCourse {
    id: number;
    course: Course;
    status: 'Pending' | 'Completed' | 'Cancelled';
    progress_percentage?: number;
    created_at: string;
}
