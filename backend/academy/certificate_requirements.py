from __future__ import annotations

from .models import (
    CertificationAttempt,
    Lesson,
    Order,
    UserLessonProgress,
    UserQuizAttempt,
    WebinarAttendance,
)


def get_certificate_requirement_status(user, course, exam=None):
    """Return machine-checkable certificate requirements for one participant."""
    checks = []

    has_enrollment = Order.objects.filter(user=user, course=course, status='Completed').exists()
    checks.append({
        'key': 'enrollment',
        'label': 'Pendaftaran dan pembayaran berhasil',
        'required': True,
        'met': has_enrollment,
    })

    minimum_progress = max(0, min(int(course.certificate_min_progress or 0), 100))
    if minimum_progress > 0:
        total_lessons = Lesson.objects.filter(course=course).count()
        completed_lessons = UserLessonProgress.objects.filter(
            user=user,
            lesson__course=course,
            is_completed=True,
        ).count()
        progress = 100 if total_lessons == 0 else round((completed_lessons / total_lessons) * 100)
        checks.append({
            'key': 'progress',
            'label': f'Selesaikan minimal {minimum_progress}% materi',
            'required': True,
            'met': progress >= minimum_progress,
            'value': progress,
        })

    if course.certificate_require_all_quizzes_passed:
        assessment_lessons = Lesson.objects.filter(
            course=course,
            type__in=['quiz', 'mid_test', 'final_test', 'exam'],
            quiz_data__isnull=False,
        ).select_related('quiz_data')
        all_passed = all(
            UserQuizAttempt.objects.filter(
                user=user,
                quiz=lesson.quiz_data,
                score__gte=lesson.quiz_data.pass_score,
            ).exists()
            for lesson in assessment_lessons
        )
        checks.append({
            'key': 'quizzes',
            'label': 'Lulus seluruh quiz, pre-test, dan post-test',
            'required': True,
            'met': all_passed,
        })

    if course.certificate_require_profile_complete:
        profile = getattr(user, 'profile', None)
        profile_complete = bool(
            f'{user.first_name} {user.last_name}'.strip()
            and getattr(profile, 'phone', '')
            and getattr(profile, 'company', '')
        )
        checks.append({
            'key': 'profile',
            'label': 'Lengkapi nama, nomor telepon, dan perusahaan/instansi',
            'required': True,
            'met': profile_complete,
        })

    if course.certificate_require_attendance:
        attendance_met = WebinarAttendance.objects.filter(
            user=user,
            course=course,
            is_present=True,
        ).exists()
        checks.append({
            'key': 'attendance',
            'label': 'Kehadiran telah dikonfirmasi',
            'required': True,
            'met': attendance_met,
        })

    if exam is not None:
        passed_attempts = CertificationAttempt.objects.filter(
            user=user,
            exam=exam,
            status='GRADED',
            score__gte=exam.passing_percentage or 70,
        )
        if exam.requires_interview():
            passed_attempts = passed_attempts.filter(
                interview_result=CertificationAttempt.INTERVIEW_RESULT_PASSED,
            )
        exam_passed = passed_attempts.exists()
        checks.append({
            'key': 'certification_exam',
            'label': f'Lulus assessment sertifikasi minimal {exam.passing_percentage or 70}%',
            'required': True,
            'met': exam_passed,
        })

    custom_requirement = (course.certificate_custom_requirements or '').strip()
    if custom_requirement:
        checks.append({
            'key': 'custom',
            'label': custom_requirement,
            'required': False,
            'met': None,
            'manual': True,
        })

    unmet = [check['label'] for check in checks if check.get('required') and check.get('met') is False]
    return {
        'eligible': not unmet,
        'checks': checks,
        'unmet_requirements': unmet,
    }


def get_certificate_requirement_labels(course):
    labels = ['Pendaftaran dan pembayaran berhasil']
    minimum_progress = max(0, min(int(course.certificate_min_progress or 0), 100))
    if minimum_progress:
        labels.append(f'Selesaikan minimal {minimum_progress}% materi')
    if course.certificate_require_all_quizzes_passed:
        labels.append('Lulus seluruh quiz, pre-test, dan post-test')
    if course.certificate_require_profile_complete:
        labels.append('Lengkapi nama, nomor telepon, dan perusahaan/instansi')
    if course.certificate_require_attendance:
        labels.append('Kehadiran telah dikonfirmasi')
    if (course.certificate_custom_requirements or '').strip():
        labels.append(course.certificate_custom_requirements.strip())
    return labels
