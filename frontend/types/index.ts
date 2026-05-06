export interface Category {
    id: number;
    name: string;
    slug: string;
    icon?: string;
}

export interface Instructor {
    id: number;
    user?: number | null;
    user_email?: string | null;
    user_username?: string | null;
    name: string;
    title: string;
    bio: string;
    expertise_areas?: string[];
    photo: string | null;
    signature_image?: string | null;
    cv?: string | null;
    approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejection_reason?: string | null;
    approved_at?: string | null;
    approved_by_name?: string | null;
}

export interface ProjectAssignment {
    id: number;
    instructor: number;
    instructor_name?: string;
    instructor_title?: string;
    instructor_user_id?: number | null;
    assigned_by?: number | null;
    assigned_by_name?: string | null;
    status: 'assigned' | 'in_progress' | 'review' | 'completed' | 'blocked';
    role_label?: string;
    notes?: string;
    assigned_at?: string | null;
    updated_at?: string | null;
    completed_at?: string | null;
}

export interface Project {
    id: number;
    title: string;
    client_name?: string;
    description?: string;
    deliverables?: string;
    status: 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
    status_label?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    priority_label?: string;
    start_date?: string | null;
    due_date?: string | null;
    related_course?: number | null;
    related_course_title?: string | null;
    created_by?: number;
    created_by_name?: string;
    created_at?: string | null;
    updated_at?: string | null;
    assignments?: ProjectAssignment[];
    assigned_instructor_ids?: number[];
    assignment_count?: number;
    completed_assignment_count?: number;
    is_overdue?: boolean;
}

export interface InstructorFinanceSummary {
    gross_revenue: number;
    instructor_earnings: number;
    platform_fee_total: number;
    available_balance: number;
    pending_withdrawals: number;
    paid_withdrawals: number;
    rejected_withdrawals: number;
    reserved_balance: number;
    completed_orders: number;
    payout_profile_ready: boolean;
}

export interface InstructorWithdrawalRequest {
    id: number;
    instructor: number;
    instructor_name?: string;
    requested_by: number;
    requested_by_name?: string;
    amount: string | number;
    note?: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
    status_label?: string;
    accountant_notes?: string | null;
    reviewed_by?: number | null;
    reviewed_by_name?: string | null;
    reviewed_at?: string | null;
    paid_at?: string | null;
    npwp_snapshot?: string | null;
    bank_name_snapshot?: string | null;
    bank_account_number_snapshot?: string | null;
    bank_account_holder_snapshot?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface Lesson {
    id: number;
    title: string;
    order: number;
    duration: string;
    video_url?: string;
    content?: string;
    type?: string;
    image?: string | null;
    attachment?: string | null;
    attachment_name?: string;
    is_completed?: boolean;
    is_locked?: boolean;
    quiz_data?: unknown;
}

export interface CourseSection {
    id: number;
    course?: number;
    title: string;
    order: number;
    lessons?: Lesson[];
}

export interface TrainingDetailSection {
    id: string;
    title: string;
    body: string;
    items: string[];
}

export interface PublicTrainingSession {
    id: string;
    title: string;
    delivery_mode: 'online' | 'offline';
    schedule: string;
    location: string;
    duration: string;
    price: string;
    discount_price?: string;
    badge?: string;
    cta_label?: string;
    cta_url?: string;
}

export interface Course {
    id: number;
    title: string;
    slug: string;
    description: string;
    detail_sections?: TrainingDetailSection[];
    rundown_items?: string[];
    public_training_enabled?: boolean;
    public_training_intro?: string;
    public_sessions?: PublicTrainingSession[];
    public_online_price?: string;
    public_online_discount_price?: string;
    public_offline_price?: string;
    public_offline_discount_price?: string;
    inhouse_training_enabled?: boolean;
    inhouse_training_intro?: string;
    inhouse_training_benefits?: string[];
    elearning_enabled?: boolean;
    elearning_intro?: string;
    price: string;
    discount_price?: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    duration: string;
    thumbnail: string | null;
    rating: string;
    enrolled_count: number;
    instructor: Instructor;
    category: Category | null;
    lessons?: Lesson[];
    sections?: CourseSection[];
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
    attendance_summary?: {
        total: number;
        present: number;
        absent: number;
        percentage: number;
    } | null;
    discussion_summary?: {
        topic_count: number;
        comment_count: number;
        latest_activity_at?: string | null;
        has_active_discussion: boolean;
    } | null;
}

export interface InstructorScheduleItem {
    type: 'pelatihan' | 'assessment' | 'project';
    title: string;
    subtitle?: string;
    status?: string;
    scheduled_at?: string | null;
    scheduled_end_at?: string | null;
    action_url?: string;
}

export interface EnrolledCourse {
    id: number;
    course: Course;
    offer_type?: 'elearning' | 'public';
    offer_mode?: 'online' | 'offline' | '';
    public_session_id?: string;
    status: 'Pending' | 'Completed' | 'Cancelled';
    progress_percentage?: number;
    pre_test_score?: number | null;
    post_test_score?: number | null;
    created_at: string;
}

export interface CourseFeedbackEntry {
    id: number;
    course: number;
    user: number;
    user_name: string;
    user_email?: string | null;
    lesson?: number | null;
    lesson_title?: string | null;
    quiz_attempt?: number | null;
    quiz_score?: number | null;
    criticism: string;
    suggestion: string;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface GamificationBadge {
    key: string;
    label: string;
    description: string;
    icon: string;
    accent_color: string;
    earned: boolean;
    progress_current: number;
    progress_target: number;
    progress_percentage: number;
}

export interface GamificationLevel {
    current: number;
    label: string;
    current_level_xp: number;
    next_level_xp: number | null;
    xp_to_next_level: number;
    progress_percentage: number;
}

export interface GamificationStreak {
    current: number;
    longest: number;
    last_activity_on?: string | null;
    active_days_this_week: number;
}

export interface GamificationStats {
    completed_lessons: number;
    passed_quizzes: number;
    perfect_quizzes: number;
    completed_courses: number;
    approved_certificates: number;
}

export interface GamificationSummary {
    total_xp: number;
    active_courses: number;
    earned_badges_count: number;
    next_focus: string;
    level: GamificationLevel;
    streak: GamificationStreak;
    stats: GamificationStats;
    badges: GamificationBadge[];
    next_badges: GamificationBadge[];
}

export interface GamificationActivityItem {
    id: string;
    type: 'lesson_completed' | 'quiz_passed' | 'perfect_quiz' | 'course_completed' | 'certificate_approved';
    title: string;
    description: string;
    occurred_at?: string | null;
    xp_earned: number;
    icon: string;
    accent_color: string;
}

export interface GamificationLeaderboardEntry {
    rank: number;
    user_id: number;
    username: string;
    full_name: string;
    avatar_url?: string | null;
    total_xp: number;
    level: GamificationLevel;
    current_streak: number;
    earned_badges_count: number;
    completed_courses: number;
    is_current_user: boolean;
}

export interface GamificationLeaderboard {
    leaders: GamificationLeaderboardEntry[];
    current_user_entry?: GamificationLeaderboardEntry | null;
}

export interface CertificationExam {
    id: number;
    course: number;
    course_title?: string;
    title: string;
    description: string;
    exam_mode: 'QUESTIONS_ONLY' | 'INTERVIEW_ONLY' | 'HYBRID';
    tested_materials?: string;
    randomize_questions?: boolean;
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
    category_label?: string;
    text: string;
    image?: string | null;
    image_url?: string | null;
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
    question_order?: number[];
    interview_result?: 'PENDING' | 'PASSED' | 'FAILED';
    interview_reason?: string;
    interview_feedback?: string;
    interview_reviewed_by?: number | null;
    interview_reviewed_by_name?: string | null;
    interview_reviewed_at?: string | null;
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
    template?: number | null;
    template_name?: string | null;
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

export interface InhouseTrainingRequest {
    id: number;
    course: number;
    course_title?: string;
    company_name: string;
    contact_name: string;
    email: string;
    phone: string;
    position?: string | null;
    participants_count: number;
    preferred_mode: 'online' | 'offline' | 'hybrid';
    target_date?: string | null;
    training_goals: string;
    notes?: string | null;
    status: 'new' | 'contacted' | 'quoted' | 'closed';
    sales_notes?: string | null;
    created_at: string;
    updated_at: string;
}

export interface DiscussionAuthor {
    id: number;
    username: string;
    full_name: string;
    avatar?: string | null;
}

export interface CourseDiscussionComment {
    id: number;
    content: string;
    attachment?: string | null;
    attachment_name?: string;
    attachment_is_image?: boolean;
    created_at: string;
    updated_at: string;
    author: DiscussionAuthor;
    can_edit?: boolean;
    can_delete?: boolean;
}

export interface CourseDiscussionTopic {
    id: number;
    course: number;
    title: string;
    content: string;
    attachment?: string | null;
    attachment_name?: string;
    attachment_is_image?: boolean;
    created_at: string;
    updated_at: string;
    latest_activity_at: string;
    author: DiscussionAuthor;
    comment_count: number;
    comments: CourseDiscussionComment[];
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
