import { Course } from '@/types';

const FORUM_READ_STATE_KEY = 'instructor_forum_read_state_v1';
const FORUM_BADGE_EVENT = 'instructor-forum-badge-changed';

type ForumReadState = Record<string, string>;

function parseReadState(rawValue: string | null): ForumReadState {
    if (!rawValue) {
        return {};
    }

    try {
        const parsed = JSON.parse(rawValue) as ForumReadState;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

export function getForumReadState() {
    if (typeof window === 'undefined') {
        return {};
    }

    return parseReadState(window.localStorage.getItem(FORUM_READ_STATE_KEY));
}

export function markForumCourseAsRead(courseSlug: string, latestActivityAt?: string | null) {
    if (typeof window === 'undefined' || !courseSlug || !latestActivityAt) {
        return;
    }

    const currentState = getForumReadState();
    currentState[courseSlug] = latestActivityAt;
    window.localStorage.setItem(FORUM_READ_STATE_KEY, JSON.stringify(currentState));
    window.dispatchEvent(new Event(FORUM_BADGE_EVENT));
}

export function isCourseDiscussionUnread(course: Course, readState?: ForumReadState) {
    const latestActivityAt = course.discussion_summary?.latest_activity_at;
    if (!course.slug || !latestActivityAt) {
        return false;
    }

    const resolvedReadState = readState || getForumReadState();
    const lastReadAt = resolvedReadState[course.slug];
    if (!lastReadAt) {
        return true;
    }

    return new Date(latestActivityAt).getTime() > new Date(lastReadAt).getTime();
}

export function countUnreadDiscussionCourses(courses: Course[]) {
    const readState = getForumReadState();
    return courses.reduce((count, course) => count + (isCourseDiscussionUnread(course, readState) ? 1 : 0), 0);
}

export function subscribeForumBadgeChange(onChange: () => void) {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    const handleChange = () => onChange();
    window.addEventListener('storage', handleChange);
    window.addEventListener(FORUM_BADGE_EVENT, handleChange);

    return () => {
        window.removeEventListener('storage', handleChange);
        window.removeEventListener(FORUM_BADGE_EVENT, handleChange);
    };
}
