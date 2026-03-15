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
    delivery_mode?: 'online' | 'offline' | null;
    scheduled_at?: string;
    scheduled_end_at?: string;
    location?: string;
    is_free?: boolean;
    is_active: boolean;
    is_featured: boolean;
    created_at?: string;
    last_accessed_lesson_id?: number | null;
    progress_percentage?: number;
    zoom_link?: string;
    is_enrolled?: boolean;
    certification_exams?: CertificationExam[];
    webinar_attendance?: WebinarAttendance | null;
}

export interface EnrolledCourse {
    id: number;
    course: Course;
    status: 'Pending' | 'Completed' | 'Cancelled';
    progress_percentage?: number;
    created_at: string;
}

export interface CertificationExam {
    id: number;
    course: number;
    course_title?: string;
    title: string;
    description: string;
    exam_mode: 'QUESTIONS_ONLY' | 'INTERVIEW_ONLY' | 'HYBRID';
    tested_materials?: string;
    passing_percentage?: number;
    is_active: boolean;
    instructor_confirmed: boolean;
    confirmed_start_at?: string | null;
    confirmed_end_at?: string | null;
    schedule_is_open?: boolean;
    schedule_has_started?: boolean;
    schedule_is_closed?: boolean;
    questions?: CertificationQuestion[];
    slots?: CertificationInstructorSlot[];
}

export interface CertificationQuestion {
    id: number;
    exam: number;
    question_type: 'MC' | 'Essay' | 'Interview';
    text: string;
    order: number;
    points: number;
    alternatives?: CertificationAlternative[];
}

export interface CertificationAlternative {
    id: number;
    text: string;
    is_correct: boolean;
}

export interface CertificationInstructorSlot {
    id: number;
    instructor: number;
    instructor_name?: string;
    exam: number;
    exam_title?: string;
    date: string;
    start_time: string;
    end_time: string;
    zoom_link?: string;
    is_booked: boolean;
}

export interface CertificationAttempt {
    id: number;
    user: number;
    user_name?: string;
    exam: number;
    exam_title?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
    score: string;
    interview_slot?: number;
    interview_slot_detail?: CertificationInstructorSlot;
    started_at: string;
    submitted_at?: string;
    answers?: CertificationAnswer[];
}

export interface CertificationAnswer {
    id: number;
    question: number;
    selected_alternative?: number;
    essay_answer?: string;
    score: string;
}

export interface Certificate {
    id: number;
    user: number;
    user_name?: string;
    course: number;
    course_title?: string;
    exam: number | null;
    exam_title?: string;
    issue_date: string;
    certificate_number?: string;
    certificate_url?: string;
    approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approved_at?: string | null;
    approved_by?: number | null;
    approved_by_name?: string | null;
}

export interface WebinarAttendance {
    id?: number;
    user?: number;
    user_name?: string;
    course?: number;
    course_title?: string;
    attendee_name?: string;
    attendee_email?: string;
    attendee_phone?: string;
    attendee_company?: string;
    attendee_position?: string;
    is_present: boolean;
    attended_at?: string | null;
    marked_by?: number | null;
    marked_by_name?: string | null;
    notes?: string | null;
    certificate_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

export interface CertificateLayoutTextElement {
    x: number;
    y: number;
    fontSize: number;
    fontWeight: number;
    color: string;
    align: 'left' | 'center' | 'right';
}

export interface CertificateLayoutImageElement {
    x: number;
    y: number;
    width: number;
    height: number;
    align: 'left' | 'center' | 'right';
}

export interface CertificateTemplateLayout {
    recipient_name: CertificateLayoutTextElement;
    course_title: CertificateLayoutTextElement;
    issue_date: CertificateLayoutTextElement;
    certificate_number: CertificateLayoutTextElement;
    signature_image: CertificateLayoutImageElement;
    signer_name: CertificateLayoutTextElement;
    signer_title: CertificateLayoutTextElement;
}

export interface CertificateTemplate {
    id: number;
    name: string;
    course: number | null;
    course_title?: string;
    orientation: 'landscape' | 'portrait';
    page_width: number;
    page_height: number;
    background_image?: string | null;
    signature_image?: string | null;
    signer_name?: string | null;
    signer_title?: string | null;
    notes?: string | null;
    layout_config: CertificateTemplateLayout;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
