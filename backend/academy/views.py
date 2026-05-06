import json
import random
from decimal import Decimal
from io import BytesIO

from rest_framework import viewsets, generics, serializers
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import (
    Category, Instructor, Course, Project, ProjectAssignment, Order, Lesson, Section, UserProfile, ReferralCode,
    Quiz, Question, Alternative, UserQuizAttempt, UserLessonProgress, CourseFeedback,
    CertificationExam, CertificationQuestion, CertificationAlternative, 
    CertificationInstructorSlot, CertificationAttempt, CertificationAnswer, Certificate, CertificateTemplate, WebinarAttendance,
    InhouseTrainingRequest, CourseDiscussionTopic, CourseDiscussionComment, StudentAccessLink, StudentAccessLinkClaim,
    InstructorWithdrawalRequest, ORDER_OFFER_ELEARNING, ORDER_OFFER_PUBLIC,
    AFFILIATE_STATUS_APPROVED, AFFILIATE_STATUS_PENDING, AFFILIATE_STATUS_REJECTED, AFFILIATE_STATUS_NONE,
    STAFF_ROLE_ACCOUNTANT, STAFF_ROLE_ADMIN, STAFF_ROLE_PROJECT_MANAGER,
    WITHDRAWAL_STATUS_APPROVED, WITHDRAWAL_STATUS_PAID, WITHDRAWAL_STATUS_PENDING, WITHDRAWAL_STATUS_REJECTED,
    apply_referral_discount, generate_unique_referral_code, get_gamification_leaderboard, get_order_total_amount, get_public_session, get_user_gamification_activity,
    get_user_gamification_summary, has_assessment_access, has_elearning_access,
    get_staff_role, get_user_role
)
from .serializers import (
    CategorySerializer, InstructorSerializer, ProjectSerializer, ProjectAssignmentSerializer, CourseSerializer, OrderSerializer, 
    RegisterSerializer, LessonSerializer, SectionSerializer, ProfileSerializer,
    ReferralCodeSerializer, ReferralCodeValidateSerializer, AffiliateApplicationReviewSerializer,
    CertificationExamSerializer, CertificationQuestionSerializer, CertificationAlternativeSerializer,
    CertificationInstructorSlotSerializer, CertificationAttemptSerializer, CertificationAnswerSerializer,
    CertificateSerializer, CertificateTemplateSerializer, WebinarAttendanceSerializer, InhouseTrainingRequestSerializer,
    CourseFeedbackSerializer, CourseFeedbackSubmissionSerializer,
    CourseDiscussionTopicSerializer, CourseDiscussionCommentSerializer, StudentAccessLinkSerializer,
    InstructorWithdrawalRequestSerializer, InstructorWithdrawalRequestCreateSerializer, InstructorWithdrawalRequestReviewSerializer
)
from .certificates import generate_certificate_pdf
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser, BasePermission, SAFE_METHODS
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from datetime import datetime
from django.db import transaction
from django.db.models import Sum, Count, Max, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

try:
    import midtransclient
except ImportError:  # pragma: no cover - optional in local dev/check environments
    midtransclient = None


class IsInstructorOrAdmin(BasePermission):
    """
    Permission to allow instructors to edit their own courses/sections/lessons.
    Admins (is_staff) have full access.
    Non-staff can only GET if it's safe (SAFE_METHODS).
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and (
            get_user_role(request.user) == STAFF_ROLE_ADMIN or
            bool(_get_instructor_for_user(request.user))
        )

    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if get_user_role(request.user) == STAFF_ROLE_ADMIN:
            return True
        
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True

        # Check if the user is the instructor of the course
        instructor = _get_instructor_for_user(request.user)
        if not instructor:
            return False
            
        if isinstance(obj, Course):
            return obj.instructor == instructor
        if isinstance(obj, Section):
            return obj.course.instructor == instructor
        if isinstance(obj, Lesson):
            return obj.course.instructor == instructor
        if isinstance(obj, CertificationExam):
            return obj.course.instructor == instructor
        if isinstance(obj, CertificationQuestion):
            return obj.exam.course.instructor == instructor
            
        return False

class IsAdmin(BasePermission):
    """
    Permission to allow only staff or superusers.
    """
    def has_permission(self, request, view):
        return bool(request.user and get_user_role(request.user) == STAFF_ROLE_ADMIN)


class IsAccountant(BasePermission):
    """
    Permission to allow only accountant staff.
    """
    def has_permission(self, request, view):
        return bool(request.user and get_user_role(request.user) == STAFF_ROLE_ACCOUNTANT)


class IsProjectManager(BasePermission):
    """
    Permission to allow only project manager staff.
    """
    def has_permission(self, request, view):
        return bool(request.user and get_user_role(request.user) == STAFF_ROLE_PROJECT_MANAGER)


class IsProjectManagerOrAdmin(BasePermission):
    """
    Permission to allow only admin or project manager staff.
    """
    def has_permission(self, request, view):
        return bool(request.user and get_user_role(request.user) in {STAFF_ROLE_ADMIN, STAFF_ROLE_PROJECT_MANAGER})


def _can_manage_course(user, course):
    if not user.is_authenticated:
        return False
    if get_user_role(user) == STAFF_ROLE_ADMIN:
        return True
    instructor = _get_instructor_for_user(user)
    return bool(instructor and course.instructor_id == instructor.id)


def _can_manage_project(user, project):
    if not getattr(user, 'is_authenticated', False):
        return False
    if get_user_role(user) == STAFF_ROLE_ADMIN:
        return True
    return get_user_role(user) == STAFF_ROLE_PROJECT_MANAGER and project.created_by_id == user.id


def _get_accountant_whatsapp_number():
    raw_value = str(getattr(settings, 'ACCOUNTANT_WHATSAPP_NUMBER', '6281390012014') or '').strip()
    digits = ''.join(ch for ch in raw_value if ch.isdigit())
    return digits or '6281390012014'


def _build_accountant_whatsapp_url(message=''):
    whatsapp_number = _get_accountant_whatsapp_number()
    base_url = f'https://wa.me/{whatsapp_number}'
    if not message:
        return base_url
    from urllib.parse import quote
    return f'{base_url}?text={quote(message)}'


def _get_completed_order(course, user):
    return Order.objects.filter(user=user, course=course, status='Completed').order_by('-created_at').first()


def _get_course_by_lookup(lookup_value):
    _sync_course_activity()
    queryset = Course.objects.all()
    if str(lookup_value).isdigit():
        by_id = queryset.filter(pk=lookup_value).first()
        if by_id:
            return by_id
    return get_object_or_404(queryset, slug=lookup_value)


def _can_access_course_discussion(user, course):
    return has_assessment_access(user, course)


def _has_lesson_access(user, lesson):
    if has_elearning_access(user, lesson.course):
        return True
    if lesson.type in ['quiz', 'mid_test', 'final_test', 'exam']:
        return has_assessment_access(user, lesson.course)
    return False


def _can_manage_discussion_comment(user, comment):
    if not user.is_authenticated:
        return False
    if comment.user_id == user.id:
        return True
    return _can_manage_course(user, comment.topic.course)


def _get_instructor_withdrawal_queryset(instructor):
    return InstructorWithdrawalRequest.objects.filter(instructor=instructor).select_related(
        'requested_by',
        'reviewed_by',
        'instructor',
    )


def _get_instructor_finance_summary(instructor):
    completed_orders = Order.objects.filter(course__instructor=instructor, status='Completed')
    completed_summary = completed_orders.aggregate(
        gross=Sum('total_amount'),
        instructor=Sum('instructor_earning_amount'),
        platform=Sum('platform_fee_amount'),
    )
    withdrawal_summary = _get_instructor_withdrawal_queryset(instructor).aggregate(
        pending=Sum('amount', filter=Q(status__in=[WITHDRAWAL_STATUS_PENDING, WITHDRAWAL_STATUS_APPROVED])),
        reserved=Sum('amount', filter=Q(status__in=[WITHDRAWAL_STATUS_PENDING, WITHDRAWAL_STATUS_APPROVED, WITHDRAWAL_STATUS_PAID])),
        paid=Sum('amount', filter=Q(status=WITHDRAWAL_STATUS_PAID)),
        rejected=Sum('amount', filter=Q(status=WITHDRAWAL_STATUS_REJECTED)),
    )

    gross_revenue = Decimal(completed_summary['gross'] or 0)
    instructor_earnings = Decimal(completed_summary['instructor'] or 0)
    platform_fee_total = Decimal(completed_summary['platform'] or 0)
    pending_amount = Decimal(withdrawal_summary['pending'] or 0)
    reserved_amount = Decimal(withdrawal_summary['reserved'] or 0)
    paid_amount = Decimal(withdrawal_summary['paid'] or 0)
    rejected_amount = Decimal(withdrawal_summary['rejected'] or 0)
    available_balance = instructor_earnings - reserved_amount
    if available_balance < 0:
        available_balance = Decimal('0')

    profile = getattr(instructor.user, 'profile', None) if instructor.user_id else None
    payout_profile_ready = bool(
        profile
        and (profile.bank_name or '').strip()
        and (profile.bank_account_number or '').strip()
        and (profile.bank_account_holder or '').strip()
    )

    return {
        'gross_revenue': float(gross_revenue),
        'instructor_earnings': float(instructor_earnings),
        'platform_fee_total': float(platform_fee_total),
        'available_balance': float(available_balance),
        'pending_withdrawals': float(pending_amount),
        'paid_withdrawals': float(paid_amount),
        'rejected_withdrawals': float(rejected_amount),
        'reserved_balance': float(reserved_amount),
        'completed_orders': completed_orders.count(),
        'payout_profile_ready': payout_profile_ready,
    }


def _serialize_schedule_item(item_type, title, starts_at, ends_at=None, subtitle='', status='', action_url=''):
    return {
        'type': item_type,
        'title': title,
        'subtitle': subtitle,
        'status': status,
        'scheduled_at': starts_at.isoformat() if starts_at else None,
        'scheduled_end_at': ends_at.isoformat() if ends_at else None,
        'action_url': action_url,
    }


def _build_instructor_schedule_entries(instructor, limit=8):
    now = timezone.now()
    schedule_items = []

    courses = Course.objects.filter(
        instructor=instructor,
    ).filter(
        Q(scheduled_at__isnull=False) | Q(scheduled_end_at__isnull=False)
    ).order_by('scheduled_at', 'scheduled_end_at', 'id')

    for course in courses:
        reference_time = course.scheduled_end_at or course.scheduled_at
        if reference_time and reference_time < now:
            continue
        schedule_items.append(_serialize_schedule_item(
            'pelatihan',
            course.title,
            course.scheduled_at,
            course.scheduled_end_at,
            subtitle='Jadwal pelatihan yang Anda ampu.',
            status=course.get_type_display(),
            action_url=f'/instructor/courses/{course.id}',
        ))

    assessments = CertificationExam.objects.filter(
        course__instructor=instructor,
        confirmed_start_at__isnull=False,
    ).select_related('course').order_by('confirmed_start_at', 'confirmed_end_at', 'id')

    for assessment in assessments:
        reference_time = assessment.confirmed_end_at or assessment.confirmed_start_at
        if reference_time and reference_time < now:
            continue
        schedule_items.append(_serialize_schedule_item(
            'assessment',
            assessment.title,
            assessment.confirmed_start_at,
            assessment.confirmed_end_at,
            subtitle=f'Assessment untuk {assessment.course.title}.',
            status=assessment.get_exam_mode_display(),
            action_url='/instructor/certification',
        ))

    projects = Project.objects.filter(
        assignments__instructor=instructor,
        due_date__isnull=False,
    ).distinct().order_by('due_date', 'id')

    for project in projects:
        due_datetime = timezone.make_aware(datetime.combine(project.due_date, datetime.min.time()), timezone.get_current_timezone())
        if due_datetime < now and project.status in [Project.STATUS_COMPLETED, Project.STATUS_CANCELLED]:
            continue
        schedule_items.append(_serialize_schedule_item(
            'project',
            project.title,
            due_datetime,
            None,
            subtitle=project.client_name or 'Tugas project dari project manager.',
            status=project.get_status_display(),
            action_url='/instructor',
        ))

    schedule_items.sort(key=lambda item: item.get('scheduled_at') or '9999-12-31T00:00:00+07:00')
    return schedule_items[:limit]


def _build_instructor_withdrawal_whatsapp_message(withdrawal):
    profile = getattr(withdrawal.requested_by, 'profile', None)
    display_name = withdrawal.instructor.name or withdrawal.requested_by.username
    bank_name = withdrawal.bank_name_snapshot or getattr(profile, 'bank_name', '') or '-'
    account_number = withdrawal.bank_account_number_snapshot or getattr(profile, 'bank_account_number', '') or '-'
    account_holder = withdrawal.bank_account_holder_snapshot or getattr(profile, 'bank_account_holder', '') or '-'
    note = withdrawal.note or '-'
    amount_label = f"{withdrawal.amount:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    return (
        "Halo tim akuntan, saya ingin mengajukan pencairan fee trainer.\n\n"
        f"Nama trainer: {display_name}\n"
        f"Nominal: Rp {amount_label}\n"
        f"Bank: {bank_name}\n"
        f"No. rekening: {account_number}\n"
        f"Nama pemilik rekening: {account_holder}\n"
        f"Catatan: {note}\n"
        f"ID pengajuan: #{withdrawal.id}"
    )


def _get_default_webinar_attendance_payload(user):
    profile = getattr(user, 'profile', None)
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username

    return {
        'attendee_name': full_name,
        'attendee_email': user.email or '',
        'attendee_phone': getattr(profile, 'phone', '') or '',
        'attendee_company': getattr(profile, 'company', '') or '',
        'attendee_position': getattr(profile, 'position', '') or '',
        'notes': '',
    }


def _build_affiliate_application_payload(profile):
    user = profile.user
    full_name = f"{user.first_name} {user.last_name}".strip()
    referral = ReferralCode.objects.filter(owner=user).order_by('-created_at', '-id').first()
    completed_summary = Order.objects.filter(
        affiliate_user=user,
        status='Completed',
    ).aggregate(
        total_orders=Count('id'),
        total_commission=Sum('affiliate_commission_amount'),
    )
    return {
        'user_id': user.id,
        'username': user.username,
        'full_name': full_name or user.username,
        'email': user.email or '',
        'affiliate_status': profile.affiliate_status,
        'affiliate_requested_at': profile.affiliate_requested_at.isoformat() if profile.affiliate_requested_at else None,
        'affiliate_reviewed_at': profile.affiliate_reviewed_at.isoformat() if profile.affiliate_reviewed_at else None,
        'affiliate_review_notes': profile.affiliate_review_notes or '',
        'personal_referral_code': referral.code if referral else '',
        'personal_referral_label': referral.label if referral else '',
        'referred_completed_orders': completed_summary['total_orders'] or 0,
        'affiliate_commission_total': float(completed_summary['total_commission'] or 0),
    }


def _get_or_create_personal_referral_code(user, created_by=None):
    referral = ReferralCode.objects.filter(owner=user).order_by('-created_at', '-id').first()
    if referral:
        return referral

    base_prefix = ''.join(ch for ch in user.username.upper() if ch.isalnum())[:4] or 'AFIL'
    return ReferralCode.objects.create(
        code=generate_unique_referral_code(base_prefix),
        label=f'Kode Affiliate {user.username}',
        description='Kode referral pribadi affiliator Akademiso.',
        discount_type='percent',
        discount_value=Decimal('10'),
        owner=user,
        created_by=created_by or user,
    )


def _ensure_webinar_certificate_pending(user, course):
    certificate, created = Certificate.objects.get_or_create(
        user=user,
        course=course,
        exam=None,
        defaults={
            'certificate_url': '',
            'approval_status': Certificate.APPROVAL_PENDING,
            'approved_by': None,
            'approved_at': None,
        }
    )

    if certificate.approval_status != Certificate.APPROVAL_APPROVED:
        certificate.approval_status = Certificate.APPROVAL_PENDING
        certificate.approved_by = None
        certificate.approved_at = None
        certificate.certificate_url = ''
        certificate.save(update_fields=['approval_status', 'approved_by', 'approved_at', 'certificate_url'])

    return certificate, created


def _approve_certificate(certificate, approved_by=None, force=False):
    update_fields = set()

    if certificate.approval_status != Certificate.APPROVAL_APPROVED:
        certificate.approval_status = Certificate.APPROVAL_APPROVED
        update_fields.add('approval_status')

    if approved_by and certificate.approved_by_id != approved_by.id:
        certificate.approved_by = approved_by
        update_fields.add('approved_by')
    elif approved_by is None and certificate.approved_by_id is not None:
        certificate.approved_by = None
        update_fields.add('approved_by')

    if certificate.approved_at is None:
        certificate.approved_at = timezone.now()
        update_fields.add('approved_at')

    if force or not certificate.certificate_url:
        generate_certificate_pdf(certificate, force=force or not certificate.certificate_url)
        update_fields.add('certificate_url')

    if update_fields:
        certificate.save(update_fields=list(update_fields))

    return certificate


def _sync_certificate_readiness(certificate):
    if certificate.approval_status == Certificate.APPROVAL_APPROVED:
        if not certificate.certificate_url:
            _approve_certificate(certificate, approved_by=certificate.approved_by, force=True)
        return certificate

    if certificate.exam is None:
        attendance_exists = WebinarAttendance.objects.filter(
            user=certificate.user,
            course=certificate.course,
            is_present=True,
        ).exists()
        if attendance_exists:
            _approve_certificate(certificate, approved_by=None, force=True)
        return certificate

    passed_attempt = CertificationAttempt.objects.filter(
        user=certificate.user,
        exam=certificate.exam,
        status='GRADED',
        score__gte=certificate.exam.passing_percentage or 70,
    ).exists()
    if passed_attempt:
        _approve_certificate(certificate, approved_by=None, force=True)

    return certificate


def _mark_webinar_attendance(course, user, marked_by, notes='', attendance_data=None):
    order = _get_completed_order(course, user)
    if not order:
        raise serializers.ValidationError({'error': 'Peserta belum terdaftar sebagai peserta webinar.'})

    attendance_data = attendance_data or {}
    default_payload = _get_default_webinar_attendance_payload(user)
    attendee_name = attendance_data.get('attendee_name') or default_payload['attendee_name']
    attendee_email = attendance_data.get('attendee_email') or default_payload['attendee_email']
    attendee_phone = attendance_data.get('attendee_phone') or default_payload['attendee_phone']
    attendee_company = attendance_data.get('attendee_company') or default_payload['attendee_company']
    attendee_position = attendance_data.get('attendee_position') or default_payload['attendee_position']
    notes_value = attendance_data.get('notes') if 'notes' in attendance_data else notes

    attendance, created = WebinarAttendance.objects.get_or_create(
        user=user,
        course=course,
        defaults={
            'order': order,
            'attendee_name': attendee_name,
            'attendee_email': attendee_email,
            'attendee_phone': attendee_phone,
            'attendee_company': attendee_company,
            'attendee_position': attendee_position,
            'is_present': True,
            'attended_at': timezone.now(),
            'marked_by': marked_by if marked_by != user else None,
            'notes': notes_value or None,
        }
    )

    if not created:
        attendance.order = order
        attendance.attendee_name = attendee_name
        attendance.attendee_email = attendee_email
        attendance.attendee_phone = attendee_phone
        attendance.attendee_company = attendee_company
        attendance.attendee_position = attendee_position
        attendance.is_present = True
        if not attendance.attended_at:
            attendance.attended_at = timezone.now()
        attendance.marked_by = marked_by if marked_by != user else attendance.marked_by
        attendance.notes = notes_value or None
        attendance.save(update_fields=[
            'order', 'attendee_name', 'attendee_email', 'attendee_phone', 'attendee_company',
            'attendee_position', 'is_present', 'attended_at', 'marked_by', 'notes', 'updated_at'
        ])

    certificate, _ = _ensure_webinar_certificate_pending(user, course)
    _approve_certificate(certificate, approved_by=None, force=True)
    return attendance


def _get_user_display_name(user):
    if not user:
        return '-'
    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or user.username


def _build_attempt_question_order(exam):
    written_questions = list(
        exam.questions.exclude(question_type='Interview').order_by('order', 'id').values_list('id', flat=True)
    )
    interview_questions = list(
        exam.questions.filter(question_type='Interview').order_by('order', 'id').values_list('id', flat=True)
    )
    if exam.randomize_questions:
        random.shuffle(written_questions)
    return written_questions + interview_questions


def _attempt_written_passed(attempt):
    if not attempt.exam.requires_written_questions():
        return True
    passing_percentage = Decimal(str(attempt.exam.passing_percentage or 70))
    return Decimal(str(attempt.score or 0)) >= passing_percentage


def _finalize_attempt_certificate_if_eligible(attempt):
    interview_passed = (
        not attempt.exam.requires_interview()
        or attempt.interview_result == CertificationAttempt.INTERVIEW_RESULT_PASSED
    )
    if not interview_passed or not _attempt_written_passed(attempt):
        return False

    certificate, created = Certificate.objects.get_or_create(
        user=attempt.user,
        course=attempt.exam.course,
        exam=attempt.exam,
        defaults={
            'certificate_url': '',
            'approval_status': Certificate.APPROVAL_PENDING,
            'approved_by': None,
            'approved_at': None,
        }
    )
    if not created:
        certificate.approval_status = Certificate.APPROVAL_PENDING
        certificate.approved_by = None
        certificate.approved_at = None
        certificate.certificate_url = ''
        certificate.save(update_fields=['approval_status', 'approved_by', 'approved_at', 'certificate_url'])
    _approve_certificate(certificate, approved_by=None, force=True)
    return True


def _build_exam_question_rows(exam):
    rows = []
    for index, question in enumerate(exam.questions.all().order_by('order', 'id'), start=1):
        alternatives = list(question.alternatives.all())
        correct_answers = ', '.join([alt.text for alt in alternatives if alt.is_correct]) or '-'
        option_lines = '\n'.join([f"- {alt.text}" for alt in alternatives]) or '-'
        rows.append({
            'no': index,
            'category': question.category_label or 'Umum',
            'type': question.get_question_type_display(),
            'points': question.points,
            'text': question.text,
            'image_url': question.image.url if question.image else '-',
            'options': option_lines,
            'correct_answers': correct_answers,
        })
    return rows


def _build_exam_attempt_rows(exam):
    attempts = exam.attempts.select_related(
        'user',
        'interview_slot',
        'interview_reviewed_by',
    ).order_by('-started_at', '-id')
    rows = []
    for index, attempt in enumerate(attempts, start=1):
        slot_label = '-'
        if attempt.interview_slot:
            slot_label = (
                f"{attempt.interview_slot.date} "
                f"{attempt.interview_slot.start_time.strftime('%H:%M')} - "
                f"{attempt.interview_slot.end_time.strftime('%H:%M')}"
            )
        rows.append({
            'no': index,
            'participant': _get_user_display_name(attempt.user),
            'status': attempt.get_status_display(),
            'score': float(attempt.score or 0),
            'interview_result': dict(CertificationAttempt.INTERVIEW_RESULT_CHOICES).get(
                attempt.interview_result,
                'Menunggu Review',
            ),
            'interview_reason': attempt.interview_reason or '-',
            'interview_feedback': attempt.interview_feedback or '-',
            'slot': slot_label,
            'reviewed_by': _get_user_display_name(attempt.interview_reviewed_by),
            'reviewed_at': (
                timezone.localtime(attempt.interview_reviewed_at).strftime('%d %b %Y %H:%M')
                if attempt.interview_reviewed_at else '-'
            ),
        })
    return rows


def _export_rows_as_xlsx(filename, title, headers, rows):
    from openpyxl import Workbook

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Data'
    sheet.append([title])
    sheet.append(headers)
    for row in rows:
        sheet.append(row)

    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename=\"{filename}.xlsx\"'
    return response


def _export_rows_as_pdf(filename, title, headers, rows):
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.pdfgen import canvas

    output = BytesIO()
    pdf = canvas.Canvas(output, pagesize=landscape(A4))
    _, height = landscape(A4)
    y = height - 40

    pdf.setFont('Helvetica-Bold', 14)
    pdf.drawString(40, y, title)
    y -= 30

    pdf.setFont('Helvetica-Bold', 9)
    pdf.drawString(40, y, ' | '.join(headers))
    y -= 16
    pdf.setFont('Helvetica', 8)

    for row in rows:
        text = ' | '.join([str(value) for value in row])
        for chunk_start in range(0, len(text), 150):
            if y < 40:
                pdf.showPage()
                y = height - 40
                pdf.setFont('Helvetica', 8)
            pdf.drawString(40, y, text[chunk_start:chunk_start + 150])
            y -= 12
        y -= 4

    pdf.save()
    output.seek(0)

    response = HttpResponse(output.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename=\"{filename}.pdf\"'
    return response


def _sync_course_activity(queryset=None):
    now = timezone.now()
    base_queryset = queryset if queryset is not None else Course.objects.all()
    base_queryset.filter(type='course', scheduled_end_at__lt=now, is_active=True).update(is_active=False)
    base_queryset.filter(type='course', scheduled_end_at__gte=now, is_active=False).update(is_active=True)
    base_queryset.filter(type='course', scheduled_end_at__isnull=True, scheduled_at__lt=now, is_active=True).update(is_active=False)
    base_queryset.filter(type='course', scheduled_end_at__isnull=True, scheduled_at__gte=now, is_active=False).update(is_active=True)


def _build_gamification_action_payload(before_summary, after_summary):
    before_badge_keys = {
        badge['key']
        for badge in before_summary.get('badges', [])
        if badge.get('earned')
    }
    new_badges = [
        badge
        for badge in after_summary.get('badges', [])
        if badge.get('earned') and badge['key'] not in before_badge_keys
    ]

    return {
        'earned_xp': max(after_summary.get('total_xp', 0) - before_summary.get('total_xp', 0), 0),
        'total_xp': after_summary.get('total_xp', 0),
        'total_badges': after_summary.get('earned_badges_count', 0),
        'current_streak': after_summary.get('streak', {}).get('current', 0),
        'longest_streak': after_summary.get('streak', {}).get('longest', 0),
        'level': after_summary.get('level', {}),
        'new_badges': new_badges,
    }


def _build_absolute_media_url(request, url):
    if not url:
        return None
    if url.startswith('http://') or url.startswith('https://'):
        return url
    if request and url.startswith('/'):
        return request.build_absolute_uri(url)
    return url


def _serialize_leaderboard_payload(request, payload):
    leaders = []
    for entry in payload.get('leaders', []):
        leaders.append({
            **entry,
            'avatar_url': _build_absolute_media_url(request, entry.get('avatar_url')),
        })

    current_user_entry = payload.get('current_user_entry')
    if current_user_entry:
        current_user_entry = {
            **current_user_entry,
            'avatar_url': _build_absolute_media_url(request, current_user_entry.get('avatar_url')),
        }

    return {
        'leaders': leaders,
        'current_user_entry': current_user_entry,
    }


def _generate_student_access_username():
    for _ in range(20):
        username = f"student-{timezone.now():%y%m%d}-{get_random_string(6).lower()}"
        if not User.objects.filter(username=username).exists():
            return username
    raise RuntimeError('Gagal membuat username unik untuk akun student.')


def _create_student_from_access_link(link):
    username = _generate_student_access_username()
    temp_password = get_random_string(20)
    user = User.objects.create_user(
        username=username,
        email='',
        password=temp_password,
        first_name='',
        last_name='',
    )
    UserProfile.objects.get_or_create(user=user)
    StudentAccessLinkClaim.objects.create(link=link, user=user)
    link.used_count += 1
    link.save(update_fields=['used_count', 'updated_at'])
    return user


class InhouseTrainingRequestViewSet(viewsets.ModelViewSet):
    queryset = InhouseTrainingRequest.objects.select_related('course').all()
    serializer_class = InhouseTrainingRequestSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        course_id = self.request.query_params.get('course')
        status_filter = self.request.query_params.get('status')

        if course_id:
            queryset = queryset.filter(course_id=course_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-created_at', '-id')

    def perform_create(self, serializer):
        serializer.save(status='new', sales_notes='')


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAdmin]

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def get_serializer_class(self):
        from .serializers import UserSerializer
        return UserSerializer


class StudentAccessLinkViewSet(viewsets.ModelViewSet):
    queryset = StudentAccessLink.objects.prefetch_related('claims__user').select_related('created_by').all()
    serializer_class = StudentAccessLinkSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class StudentAccessLinkClaimView(APIView):
    permission_classes = [AllowAny]

    def get_object(self, token):
        return get_object_or_404(StudentAccessLink.objects.prefetch_related('claims__user'), token=token)

    def get(self, request, token):
        link = self.get_object(token)
        return Response({
            'name': link.name,
            'description': link.description,
            'expires_at': link.expires_at,
            'max_uses': link.max_uses,
            'used_count': link.used_count,
            'remaining_uses': link.remaining_uses,
            'is_active': link.is_active,
            'is_available': link.is_available(),
        })

    @transaction.atomic
    def post(self, request, token):
        try:
            link = StudentAccessLink.objects.select_for_update().get(token=token)
        except StudentAccessLink.DoesNotExist:
            return Response({'error': 'Link akses tidak ditemukan.'}, status=404)

        if not link.is_available():
            return Response({
                'error': 'Link akses ini sudah tidak aktif, sudah habis kuotanya, atau masa berlakunya telah lewat.'
            }, status=410)

        user = _create_student_from_access_link(link)

        from .serializers import CustomTokenObtainPairSerializer
        refresh = CustomTokenObtainPairSerializer.get_token(user)
        access = refresh.access_token

        return Response({
            'access': str(access),
            'refresh': str(refresh),
            'username': user.username,
            'redirect_to': link.redirect_path or '/dashboard/settings?welcome=1&claimed=1',
            'message': 'Akun student berhasil dibuat dan sesi login sudah aktif.',
        })


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class InstructorViewSet(viewsets.ModelViewSet):
    queryset = Instructor.objects.select_related('user', 'approved_by').all()
    serializer_class = InstructorSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'approve', 'reject']:
            return [IsAdmin()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(approval_status=status_filter.upper())

        user = self.request.user
        if user.is_authenticated and get_user_role(user) == STAFF_ROLE_ADMIN:
            return queryset.order_by('approval_status', 'name')
        return queryset.filter(approval_status=Instructor.APPROVAL_APPROVED).order_by('name')

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        instructor = self.get_object()
        instructor.approval_status = Instructor.APPROVAL_APPROVED
        instructor.rejection_reason = ''
        instructor.approved_by = request.user
        instructor.approved_at = timezone.now()
        instructor.save(update_fields=['approval_status', 'rejection_reason', 'approved_by', 'approved_at'])
        return Response(self.get_serializer(instructor).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        instructor = self.get_object()
        instructor.approval_status = Instructor.APPROVAL_REJECTED
        instructor.rejection_reason = request.data.get('reason', '')
        instructor.approved_by = None
        instructor.approved_at = None
        instructor.save(update_fields=['approval_status', 'rejection_reason', 'approved_by', 'approved_at'])
        return Response(self.get_serializer(instructor).data)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related('created_by', 'related_course').prefetch_related(
        'assignments__instructor',
        'assignments__assigned_by',
    )
    serializer_class = ProjectSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProjectManagerOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = get_user_role(self.request.user)
        status_filter = (self.request.query_params.get('status') or '').strip().lower()
        instructor_id = (self.request.query_params.get('instructor_id') or '').strip()

        if status_filter in {
            Project.STATUS_DRAFT,
            Project.STATUS_PLANNING,
            Project.STATUS_ACTIVE,
            Project.STATUS_ON_HOLD,
            Project.STATUS_COMPLETED,
            Project.STATUS_CANCELLED,
        }:
            queryset = queryset.filter(status=status_filter)

        if instructor_id.isdigit():
            queryset = queryset.filter(assignments__instructor_id=int(instructor_id))

        if role == STAFF_ROLE_ADMIN:
            return queryset.distinct()
        if role == STAFF_ROLE_PROJECT_MANAGER:
            return queryset.filter(created_by=self.request.user).distinct()

        instructor = _get_instructor_for_user(self.request.user)
        if instructor:
            return queryset.filter(assignments__instructor=instructor).distinct()

        return queryset.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        project = self.get_object()
        if not _can_manage_project(request.user, project):
            return Response({'error': 'Anda tidak memiliki izin untuk mengubah project ini.'}, status=403)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        project = self.get_object()
        if not _can_manage_project(request.user, project):
            return Response({'error': 'Anda tidak memiliki izin untuk mengubah project ini.'}, status=403)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        if not _can_manage_project(request.user, project):
            return Response({'error': 'Anda tidak memiliki izin untuk menghapus project ini.'}, status=403)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_assignment(self, request, pk=None):
        project = self.get_object()
        role = get_user_role(request.user)
        assignment_id = request.data.get('assignment_id')
        assignment = get_object_or_404(ProjectAssignment, pk=assignment_id, project=project)

        instructor = _get_instructor_for_user(request.user)
        is_assignment_owner = bool(instructor and assignment.instructor_id == instructor.id)
        if not (_can_manage_project(request.user, project) or is_assignment_owner):
            return Response({'error': 'Anda tidak memiliki izin untuk memperbarui assignment ini.'}, status=403)

        allowed_statuses = {
            ProjectAssignment.STATUS_ASSIGNED,
            ProjectAssignment.STATUS_IN_PROGRESS,
            ProjectAssignment.STATUS_REVIEW,
            ProjectAssignment.STATUS_COMPLETED,
            ProjectAssignment.STATUS_BLOCKED,
        }
        next_status = (request.data.get('status') or assignment.status).strip()
        if next_status not in allowed_statuses:
            return Response({'error': 'Status assignment tidak valid.'}, status=400)

        assignment.status = next_status
        if 'role_label' in request.data and role in {STAFF_ROLE_ADMIN, STAFF_ROLE_PROJECT_MANAGER}:
            assignment.role_label = str(request.data.get('role_label') or '').strip() or assignment.role_label
        if 'notes' in request.data:
            assignment.notes = str(request.data.get('notes') or '').strip()
        assignment.completed_at = timezone.now() if next_status == ProjectAssignment.STATUS_COMPLETED else None
        assignment.save(update_fields=['status', 'role_label', 'notes', 'completed_at', 'updated_at'])

        return Response({
            'message': 'Status assignment berhasil diperbarui.',
            'assignment': ProjectAssignmentSerializer(assignment).data,
        })


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsInstructorOrAdmin]

    def _get_manageable_lessons(self, user):
        queryset = Lesson.objects.select_related('course', 'section').prefetch_related(
            'quiz_data__questions__alternatives'
        )
        if not user.is_authenticated:
            return queryset.none()
        if get_user_role(user) == STAFF_ROLE_ADMIN:
            return queryset

        instructor = _get_instructor_for_user(user)
        if instructor:
            return queryset.filter(course__instructor=instructor)
        return queryset.none()

    def _serialize_question_bank_item(self, question):
        lesson = question.quiz.lesson
        image_url = None
        if question.image:
            if getattr(self, 'request', None):
                image_url = self.request.build_absolute_uri(question.image.url)
            else:
                image_url = question.image.url
        return {
            'id': question.id,
            'question_type': question.question_type,
            'text': question.text,
            'image_url': image_url,
            'correct_answer': question.correct_answer,
            'order': question.order,
            'alternatives': [
                {
                    'id': alternative.id,
                    'text': alternative.text,
                    'is_correct': alternative.is_correct,
                    'order': alternative.order,
                }
                for alternative in question.alternatives.all()
            ],
            'source_lesson_id': lesson.id,
            'source_lesson_title': lesson.title,
            'source_lesson_type': lesson.type,
            'source_course_id': lesson.course_id,
            'source_course_title': lesson.course.title,
        }

    def _copy_question(self, source_question, target_quiz, order=None):
        copied_question = Question.objects.create(
            quiz=target_quiz,
            question_type=source_question.question_type,
            text=source_question.text,
            image=source_question.image,
            correct_answer=source_question.correct_answer,
            order=order if order is not None else source_question.order,
        )

        if copied_question.question_type == Question.QUESTION_TYPE_MULTIPLE_CHOICE:
            for alternative in source_question.alternatives.all():
                Alternative.objects.create(
                    question=copied_question,
                    text=alternative.text,
                    is_correct=alternative.is_correct,
                    order=alternative.order,
                )

        return copied_question

    def _copy_lesson(self, source_lesson, target_course, target_section, order):
        copied_lesson = Lesson.objects.create(
            course=target_course,
            section=target_section,
            title=source_lesson.title,
            type=source_lesson.type,
            content=source_lesson.content,
            video_url=source_lesson.video_url,
            image=source_lesson.image,
            attachment=source_lesson.attachment,
            duration=source_lesson.duration,
            order=order,
        )

        source_quiz = getattr(source_lesson, 'quiz_data', None)
        if source_quiz and copied_lesson.type in ['quiz', 'mid_test', 'final_test', 'exam']:
            copied_quiz = Quiz.objects.create(
                lesson=copied_lesson,
                pass_score=source_quiz.pass_score,
                time_limit=source_quiz.time_limit,
            )
            for question in source_quiz.questions.all():
                self._copy_question(question, copied_quiz)

        return copied_lesson

    def get_queryset(self):
        queryset = Lesson.objects.all()
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        
        # If not admin, filter by instructor's courses
        if get_user_role(self.request.user) != STAFF_ROLE_ADMIN and self.request.user.is_authenticated:
            instructor = _get_instructor_for_user(self.request.user)
            if instructor:
                queryset = queryset.filter(course__instructor=instructor)
            else:
                queryset = queryset.none()
        return queryset

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='bank')
    def bank(self, request):
        if get_user_role(request.user) != STAFF_ROLE_ADMIN and not _get_instructor_for_user(request.user):
            return Response({'error': 'Hanya admin atau instruktur yang dapat mengakses bank materi.'}, status=403)

        content_type = request.query_params.get('content_type', 'lessons')
        search = (request.query_params.get('q') or '').strip()
        lesson_type = (request.query_params.get('lesson_type') or '').strip()
        question_type = (request.query_params.get('question_type') or '').strip()
        lessons = self._get_manageable_lessons(request.user)

        if lesson_type:
            lessons = lessons.filter(type=lesson_type)

        if content_type == 'questions':
            questions = Question.objects.filter(quiz__lesson__in=lessons).select_related(
                'quiz__lesson__course'
            ).prefetch_related('alternatives').order_by(
                'quiz__lesson__course__title',
                'quiz__lesson__title',
                'order',
                'id',
            )
            if question_type:
                questions = questions.filter(question_type=question_type)
            if search:
                questions = questions.filter(
                    Q(text__icontains=search) |
                    Q(correct_answer__icontains=search) |
                    Q(quiz__lesson__title__icontains=search) |
                    Q(quiz__lesson__course__title__icontains=search)
                ).distinct()
            return Response([self._serialize_question_bank_item(question) for question in questions])

        if search:
            lessons = lessons.filter(
                Q(title__icontains=search) |
                Q(content__icontains=search) |
                Q(course__title__icontains=search) |
                Q(section__title__icontains=search)
            ).distinct()

        data = [
            {
                'id': lesson.id,
                'title': lesson.title,
                'type': lesson.type,
                'duration': lesson.duration,
                'order': lesson.order,
                'course_id': lesson.course_id,
                'course_title': lesson.course.title,
                'section_id': lesson.section_id,
                'section_title': lesson.section.title if lesson.section else None,
                'question_count': lesson.quiz_data.questions.count() if hasattr(lesson, 'quiz_data') else 0,
            }
            for lesson in lessons.order_by('course__title', 'section__order', 'order', 'id')
        ]
        return Response(data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='copy-to-course')
    def copy_to_course(self, request, pk=None):
        source_lesson = self.get_object()
        course_id = request.data.get('course') or request.data.get('course_id')
        section_id = request.data.get('section') or request.data.get('section_id')

        if not course_id or not section_id:
            return Response({'error': 'course dan section wajib diisi.'}, status=400)

        target_course = get_object_or_404(Course, pk=course_id)
        if not _can_manage_course(request.user, target_course):
            return Response({'error': 'Anda tidak memiliki akses ke course tujuan.'}, status=403)

        target_section = get_object_or_404(Section, pk=section_id, course=target_course)
        requested_order = request.data.get('order')
        if requested_order:
            try:
                order = int(requested_order)
            except (TypeError, ValueError):
                return Response({'error': 'order harus berupa angka.'}, status=400)
        else:
            max_order = Lesson.objects.filter(course=target_course, section=target_section).aggregate(Max('order'))['order__max'] or 0
            order = max_order + 1

        with transaction.atomic():
            copied_lesson = self._copy_lesson(source_lesson, target_course, target_section, order)

        serializer = self.get_serializer(copied_lesson)
        return Response(serializer.data, status=201)


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        queryset = Section.objects.all()
        course_id = self.request.query_params.get('course_id') or self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
            
        # If not admin, filter by instructor's courses
        if get_user_role(self.request.user) != STAFF_ROLE_ADMIN and self.request.user.is_authenticated:
            instructor = _get_instructor_for_user(self.request.user)
            if instructor:
                queryset = queryset.filter(course__instructor=instructor)
            else:
                queryset = queryset.none()
        return queryset


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    lookup_field = 'slug'
    permission_classes = [IsInstructorOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        
        # Try lookup by ID if the value is numeric
        if str(lookup_value).isdigit():
            obj = queryset.filter(pk=lookup_value).first()
            if obj:
                return obj
                
        # Fallback to default lookup (slug)
        filter_kwargs = {self.lookup_field: lookup_value}
        return get_object_or_404(queryset, **filter_kwargs)

    def get_queryset(self):
        _sync_course_activity()
        queryset = Course.objects.all()
        user = self.request.user
        is_management_user = user.is_authenticated and (
            get_user_role(user) in {STAFF_ROLE_ADMIN, STAFF_ROLE_PROJECT_MANAGER} or bool(_get_instructor_for_user(user))
        )

        if not is_management_user:
            return queryset.filter(is_active=True)

        # If not admin, filter by instructor's courses for non-GET methods
        # or if they are in the instructor portal context
        if get_user_role(user) != STAFF_ROLE_ADMIN and user.is_authenticated:
            instructor = _get_instructor_for_user(user)
            if instructor:
                if self.request.method not in SAFE_METHODS:
                    queryset = queryset.filter(instructor=instructor)
            else:
                if self.request.method not in SAFE_METHODS:
                    queryset = queryset.none()
        return queryset

    def perform_create(self, serializer):
        # Auto-assign instructor if not admin and user is instructor
        if get_user_role(self.request.user) != STAFF_ROLE_ADMIN:
            instructor = _get_instructor_for_user(self.request.user)
            if instructor:
                serializer.save(instructor=instructor)
                return
        serializer.save()

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='attendance')
    def attendance(self, request, slug=None):
        course = self.get_object()

        if course.type != 'course':
            return Response({'error': 'Daftar hadir otomatis hanya tersedia untuk course pelatihan.'}, status=400)

        if not _can_manage_course(request.user, course):
            return Response({'error': 'Anda tidak memiliki akses ke daftar hadir course ini.'}, status=403)

        orders = Order.objects.filter(
            course=course,
            status='Completed',
            offer_type=ORDER_OFFER_ELEARNING,
        ).select_related('user').order_by('-created_at', '-id')

        course_attempts = UserQuizAttempt.objects.filter(
            user_id__in=orders.values_list('user_id', flat=True),
            quiz__lesson__course=course,
            quiz__lesson__type__in=['mid_test', 'final_test'],
        ).select_related('user', 'quiz__lesson').order_by(
            'user_id',
            'quiz__lesson__type',
            '-completed_at',
            '-id',
        )

        latest_attempts = {}
        for attempt in course_attempts:
            key = (attempt.user_id, attempt.quiz.lesson.type)
            if key not in latest_attempts:
                latest_attempts[key] = attempt

        has_pre_test = Lesson.objects.filter(course=course, type='mid_test').exists()
        has_post_test = Lesson.objects.filter(course=course, type='final_test').exists()

        results = []
        present_count = 0

        for order in orders:
            pre_attempt = latest_attempts.get((order.user_id, 'mid_test'))
            post_attempt = latest_attempts.get((order.user_id, 'final_test'))
            is_present = bool(pre_attempt and post_attempt)
            attended_at = None

            if is_present:
                attended_at = max(
                    pre_attempt.completed_at or order.created_at,
                    post_attempt.completed_at or order.created_at,
                )
                present_count += 1

            results.append({
                'order_id': order.id,
                'user_id': order.user_id,
                'user_name': f"{order.user.first_name} {order.user.last_name}".strip() or order.user.username,
                'email': order.user.email,
                'status': order.status,
                'enrolled_at': order.created_at,
                'pre_test_completed': bool(pre_attempt),
                'pre_test_score': round(float(pre_attempt.score), 2) if pre_attempt else None,
                'pre_test_completed_at': pre_attempt.completed_at if pre_attempt else None,
                'post_test_completed': bool(post_attempt),
                'post_test_score': round(float(post_attempt.score), 2) if post_attempt else None,
                'post_test_completed_at': post_attempt.completed_at if post_attempt else None,
                'is_present': is_present,
                'attended_at': attended_at,
            })

        return Response({
            'course': {
                'id': course.id,
                'title': course.title,
                'slug': course.slug,
            },
            'requirements': {
                'has_pre_test': has_pre_test,
                'has_post_test': has_post_test,
            },
            'count': len(results),
            'present_count': present_count,
            'absent_count': max(len(results) - present_count, 0),
            'results': results,
        })

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticated], url_path='webinar-attendance')
    def webinar_attendance(self, request, slug=None):
        course = self.get_object()

        if course.type != 'webinar':
            return Response({'error': 'Presensi hanya tersedia untuk webinar.'}, status=400)

        can_manage = _can_manage_course(request.user, course)

        if request.method == 'GET':
            if can_manage:
                orders = Order.objects.filter(course=course, status='Completed').select_related('user').order_by('-created_at')
                attendance_map = {
                    attendance.user_id: attendance
                    for attendance in WebinarAttendance.objects.filter(course=course).select_related('marked_by')
                }

                data = []
                for order in orders:
                    attendance = attendance_map.get(order.user_id)
                    data.append({
                        'order_id': order.id,
                        'user_id': order.user_id,
                        'user_name': f"{order.user.first_name} {order.user.last_name}".strip() or order.user.username,
                        'email': order.user.email,
                        'attendee_name': attendance.attendee_name if attendance and attendance.attendee_name else (f"{order.user.first_name} {order.user.last_name}".strip() or order.user.username),
                        'attendee_email': attendance.attendee_email if attendance and attendance.attendee_email else (order.user.email or ''),
                        'attendee_phone': attendance.attendee_phone if attendance else '',
                        'attendee_company': attendance.attendee_company if attendance else '',
                        'attendee_position': attendance.attendee_position if attendance else '',
                        'is_present': bool(attendance and attendance.is_present),
                        'attended_at': attendance.attended_at if attendance else None,
                        'marked_by_name': (
                            f"{attendance.marked_by.first_name} {attendance.marked_by.last_name}".strip() or attendance.marked_by.username
                        ) if attendance and attendance.marked_by else None,
                        'notes': attendance.notes if attendance else None,
                        'certificate_status': (
                            Certificate.objects.filter(user=order.user, course=course).values_list('approval_status', flat=True).first()
                        ),
                    })
                return Response(data)

            order = _get_completed_order(course, request.user)
            if not order:
                return Response({'error': 'Anda belum terdaftar pada webinar ini.'}, status=403)

            attendance = WebinarAttendance.objects.filter(course=course, user=request.user).select_related('marked_by').first()
            default_payload = _get_default_webinar_attendance_payload(request.user)
            return Response({
                'order_id': order.id,
                'user_id': request.user.id,
                'user_name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
                'attendee_name': attendance.attendee_name if attendance and attendance.attendee_name else default_payload['attendee_name'],
                'attendee_email': attendance.attendee_email if attendance and attendance.attendee_email else default_payload['attendee_email'],
                'attendee_phone': attendance.attendee_phone if attendance and attendance.attendee_phone else default_payload['attendee_phone'],
                'attendee_company': attendance.attendee_company if attendance and attendance.attendee_company else default_payload['attendee_company'],
                'attendee_position': attendance.attendee_position if attendance and attendance.attendee_position else default_payload['attendee_position'],
                'is_present': bool(attendance and attendance.is_present),
                'attended_at': attendance.attended_at if attendance else None,
                'marked_by_name': (
                    f"{attendance.marked_by.first_name} {attendance.marked_by.last_name}".strip() or attendance.marked_by.username
                ) if attendance and attendance.marked_by else None,
                'notes': attendance.notes if attendance else None,
                'certificate_status': Certificate.objects.filter(user=request.user, course=course).values_list('approval_status', flat=True).first(),
            })

        target_user = request.user
        notes = request.data.get('notes', '')
        attendance_data = {
            'attendee_name': request.data.get('attendee_name', ''),
            'attendee_email': request.data.get('attendee_email', ''),
            'attendee_phone': request.data.get('attendee_phone', ''),
            'attendee_company': request.data.get('attendee_company', ''),
            'attendee_position': request.data.get('attendee_position', ''),
            'notes': notes,
        }

        if not can_manage:
            existing_attendance = WebinarAttendance.objects.filter(
                course=course,
                user=request.user,
                is_present=True,
            ).first()
            if existing_attendance:
                return Response({'error': 'Presensi webinar hanya bisa dikirim satu kali.'}, status=400)

        if can_manage:
            target_user_id = request.data.get('user_id')
            if target_user_id:
                target_user = get_object_or_404(User, pk=target_user_id)

        attendance = _mark_webinar_attendance(course, target_user, request.user, notes=notes, attendance_data=attendance_data)
        serializer = WebinarAttendanceSerializer(attendance)
        return Response(serializer.data)


class CourseDiscussionTopicListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_course(self, course_slug):
        return _get_course_by_lookup(course_slug)

    def get(self, request, course_slug):
        course = self.get_course(course_slug)
        if not _can_access_course_discussion(request.user, course):
            return Response({'error': 'Forum diskusi hanya tersedia untuk peserta course ini.'}, status=403)

        topics = CourseDiscussionTopic.objects.filter(course=course).select_related(
            'user', 'user__profile'
        ).prefetch_related(
            'comments__user', 'comments__user__profile'
        ).annotate(
            comment_count=Count('comments')
        ).order_by('-updated_at', '-id')
        serializer = CourseDiscussionTopicSerializer(topics, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, course_slug):
        course = self.get_course(course_slug)
        if not _can_access_course_discussion(request.user, course):
            return Response({'error': 'Anda belum bisa membuat topik pada forum course ini.'}, status=403)

        serializer = CourseDiscussionTopicSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        topic = serializer.save(course=course, user=request.user)
        return Response(
            CourseDiscussionTopicSerializer(topic, context={'request': request}).data,
            status=201
        )


class CourseDiscussionCommentCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, course_slug, topic_id):
        course = _get_course_by_lookup(course_slug)
        if not _can_access_course_discussion(request.user, course):
            return Response({'error': 'Anda belum bisa berkomentar pada forum course ini.'}, status=403)

        topic = get_object_or_404(
            CourseDiscussionTopic.objects.select_related('course'),
            pk=topic_id,
            course=course,
        )
        serializer = CourseDiscussionCommentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(topic=topic, user=request.user)
        topic.save(update_fields=['updated_at'])
        return Response(
            CourseDiscussionCommentSerializer(comment, context={'request': request}).data,
            status=201
        )


class CourseDiscussionCommentDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, course_slug, topic_id, comment_id):
        course = _get_course_by_lookup(course_slug)
        topic = get_object_or_404(
            CourseDiscussionTopic.objects.select_related('course'),
            pk=topic_id,
            course=course,
        )
        comment = get_object_or_404(
            CourseDiscussionComment.objects.select_related('topic', 'topic__course'),
            pk=comment_id,
            topic=topic,
        )
        if not _can_manage_discussion_comment(request.user, comment):
            return Response({'error': 'Anda tidak memiliki izin untuk mengubah komentar ini.'}, status=403)

        serializer = CourseDiscussionCommentSerializer(
            comment,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        updated_comment = serializer.save()
        topic.save(update_fields=['updated_at'])
        return Response(CourseDiscussionCommentSerializer(updated_comment, context={'request': request}).data)

    def delete(self, request, course_slug, topic_id, comment_id):
        course = _get_course_by_lookup(course_slug)
        topic = get_object_or_404(
            CourseDiscussionTopic.objects.select_related('course'),
            pk=topic_id,
            course=course,
        )
        comment = get_object_or_404(
            CourseDiscussionComment.objects.select_related('topic', 'topic__course'),
            pk=comment_id,
            topic=topic,
        )
        if not _can_manage_discussion_comment(request.user, comment):
            return Response({'error': 'Anda tidak memiliki izin untuk menghapus komentar ini.'}, status=403)

        comment.delete()
        topic.save(update_fields=['updated_at'])
        return Response(status=204)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related('user', 'course', 'referral_code', 'affiliate_user').order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAccountant()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if get_user_role(self.request.user) != STAFF_ROLE_ACCOUNTANT:
            qs = qs.filter(user=self.request.user)
        return qs

    def perform_create(self, serializer):
        # 1. Save the order locally first as Pending
        order = serializer.save(user=self.request.user, status='Pending')

        if order.total_amount <= 0:
            order.status = 'Completed'
            order.snap_token = None
            order.midtrans_id = None
            order.save(update_fields=['status', 'snap_token', 'midtrans_id'])
            serializer.instance.status = order.status
            serializer.instance.snap_token = order.snap_token
            serializer.instance.midtrans_id = order.midtrans_id
            return

        if midtransclient is None:
            order.delete()
            raise serializers.ValidationError({
                "error": "Integrasi pembayaran Midtrans belum tersedia pada environment ini."
            })
        
        # 2. Initialize Midtrans Snap
        server_key = getattr(settings, 'MIDTRANS_SERVER_KEY', 'SB-Mid-server-placeholder')
        is_production = getattr(settings, 'MIDTRANS_IS_PRODUCTION', False)
        
        # Log for debugging (don't show full key)
        print(f"DEBUG: Initializing Midtrans with key starting with: {server_key[:7]}...")
        
        snap = midtransclient.Snap(
            is_production=is_production,
            server_key=server_key
        )
        
        # 3. Create transaction parameters
        customer_email = self.request.user.email.strip() if self.request.user.email else "customer@example.com"
        
        param = {
            "transaction_details": {
                "order_id": f"ORDER-{order.id}-{int(order.created_at.timestamp())}",
                "gross_amount": int(order.total_amount),
            },
            "item_details": [{
                "id": str(order.course.id),
                "price": int(order.total_amount),
                "quantity": 1,
                "name": order.course.title[:45],
            }],
            "customer_details": {
                "first_name": self.request.user.first_name or "Student",
                "last_name": self.request.user.last_name or "User",
                "email": customer_email,
            }
        }
        
        print(f"DEBUG: Midtrans Parameters: {param}")
        
        try:
            # 4. Get Snap Token from Midtrans
            transaction = snap.create_transaction(param)
            snap_token = transaction['token']
            
            # 5. Update order with snap_token and internal midtrans id
            order.snap_token = snap_token
            order.midtrans_id = param['transaction_details']['order_id']
            order.save()
            
            # 6. Ensure serializer instance is updated for the response
            serializer.instance.snap_token = snap_token
            serializer.instance.midtrans_id = order.midtrans_id
            
            print(f"DEBUG: Snap Token generated: {snap_token}")
        except Exception as e:
            error_msg = f"Midtrans Error: {str(e)}"
            print(f"CRITICAL: {error_msg}")
            # Delete the pending order since it failed to initialize payment
            order.delete()
            raise serializers.ValidationError({"error": error_msg})

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        order = self.get_object()
        if not order.midtrans_id:
            return Response({'error': 'No Midtrans ID found for this order'}, status=400)

        if midtransclient is None:
            return Response({'error': 'Integrasi pembayaran Midtrans belum tersedia pada environment ini.'}, status=503)

        server_key = getattr(settings, 'MIDTRANS_SERVER_KEY', 'SB-Mid-server-placeholder')
        is_production = getattr(settings, 'MIDTRANS_IS_PRODUCTION', False)
        
        snap = midtransclient.Snap(
            is_production=is_production,
            server_key=server_key
        )

        try:
            status_response = snap.transactions.status(order.midtrans_id)
            transaction_status = status_response.get('transaction_status')
            fraud_status = status_response.get('fraud_status')

            old_status = order.status
            new_status = old_status

            if transaction_status == 'capture':
                if fraud_status == 'challenge':
                    new_status = 'Pending'
                elif fraud_status == 'accept':
                    new_status = 'Completed'
            elif transaction_status == 'settlement':
                new_status = 'Completed'
            elif transaction_status in ['cancel', 'expire']:
                new_status = 'Cancelled'
            elif transaction_status == 'deny':
                new_status = 'Failed'
            elif transaction_status == 'pending':
                new_status = 'Pending'

            if old_status != new_status:
                print(f"DEBUG: Syncing Order {order.id}: {old_status} -> {new_status}")
                order.status = new_status
                order.save()

                if old_status == 'Pending' and new_status == 'Completed':
                    course = order.course
                    course.enrolled_count += 1
                    course.save()
                    print(f"DEBUG: Enrollment incremented via sync")

            return Response({
                'id': order.id,
                'status': order.status,
                'midtrans_status': transaction_status,
                'fraud_status': fraud_status
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class MyCoursesView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        include_public = str(self.request.query_params.get('include_public') or '').strip().lower() in {'1', 'true', 'yes'}
        offer_types = [ORDER_OFFER_ELEARNING]
        if include_public:
            offer_types.append(ORDER_OFFER_PUBLIC)
        return Order.objects.filter(
            user=self.request.user,
            status='Completed',
            offer_type__in=offer_types,
        ).order_by('-created_at')

    def get_serializer_class(self):
        from .serializers import MyCourseSerializer
        return MyCourseSerializer


class GamificationSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_user_gamification_summary(request.user))


class GamificationLeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payload = get_gamification_leaderboard(request.user)
        return Response(_serialize_leaderboard_payload(request, payload))


class GamificationActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_user_gamification_activity(request.user))


# ── Admin Stats ─────────────────────────────────────────────────────────────
class StatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        total_users    = User.objects.filter(is_staff=False).count()
        total_courses  = Course.objects.count()
        total_instructors = Instructor.objects.count()
        active_courses = Course.objects.filter(is_active=True).count()
        inhouse_requests = InhouseTrainingRequest.objects.count()
        pending_certificates = Certificate.objects.filter(
            approval_status=Certificate.APPROVAL_PENDING
        ).count()
        pending_affiliate_applications = UserProfile.objects.filter(
            affiliate_status=AFFILIATE_STATUS_PENDING
        ).count()
        total_referral_codes = ReferralCode.objects.count()

        return Response({
            'total_users': total_users,
            'total_courses': total_courses,
            'total_instructors': total_instructors,
            'active_courses': active_courses,
            'inhouse_requests': inhouse_requests,
            'pending_certificates': pending_certificates,
            'pending_affiliate_applications': pending_affiliate_applications,
            'total_referral_codes': total_referral_codes,
        })


class AccountantStatsView(APIView):
    permission_classes = [IsAccountant]

    def get(self, request):
        total_orders = Order.objects.count()
        completed_orders = Order.objects.filter(status='Completed').count()
        pending_orders = Order.objects.filter(status='Pending').count()
        cancelled_orders = Order.objects.filter(status='Cancelled').count()
        completed_summary = Order.objects.filter(status='Completed').aggregate(
            gross=Sum('total_amount'),
            platform=Sum('platform_fee_amount'),
            platform_net=Sum('platform_net_amount'),
            instructor=Sum('instructor_earning_amount'),
            affiliate=Sum('affiliate_commission_amount'),
        )
        revenue = completed_summary['gross'] or 0
        platform_revenue = completed_summary['platform'] or 0
        platform_net_revenue = completed_summary['platform_net'] or 0
        instructor_payout = completed_summary['instructor'] or 0
        affiliate_commission_total = completed_summary['affiliate'] or 0
        affiliate_summary = UserProfile.objects.aggregate(
            pending=Count('id', filter=Q(affiliate_status=AFFILIATE_STATUS_PENDING)),
            approved=Count('id', filter=Q(affiliate_status=AFFILIATE_STATUS_APPROVED)),
        )
        withdrawal_summary = InstructorWithdrawalRequest.objects.aggregate(
            pending=Count('id', filter=Q(status=WITHDRAWAL_STATUS_PENDING)),
            approved=Count('id', filter=Q(status=WITHDRAWAL_STATUS_APPROVED)),
            paid=Count('id', filter=Q(status=WITHDRAWAL_STATUS_PAID)),
            pending_amount=Sum('amount', filter=Q(status=WITHDRAWAL_STATUS_PENDING)),
            approved_amount=Sum('amount', filter=Q(status=WITHDRAWAL_STATUS_APPROVED)),
            paid_amount=Sum('amount', filter=Q(status=WITHDRAWAL_STATUS_PAID)),
        )

        recent_orders = Order.objects.select_related('user', 'course', 'affiliate_user').order_by('-created_at')[:5]
        recent = [
            {
                'id': o.id,
                'user': o.user.username,
                'course': o.course.title,
                'amount': str(o.total_amount),
                'original_amount': str(o.original_amount),
                'referral_discount_amount': str(o.referral_discount_amount),
                'referral_code_snapshot': o.referral_code_snapshot,
                'affiliate_user': o.affiliate_user.username if o.affiliate_user_id else '',
                'platform_fee_amount': str(o.platform_fee_amount),
                'platform_net_amount': str(o.platform_net_amount),
                'instructor_earning_amount': str(o.instructor_earning_amount),
                'affiliate_commission_amount': str(o.affiliate_commission_amount),
                'status': o.status,
                'created_at': o.created_at.strftime('%d %b %Y'),
            }
            for o in recent_orders
        ]
        recent_withdrawals = InstructorWithdrawalRequest.objects.select_related(
            'instructor',
            'requested_by',
        ).order_by('-created_at')[:5]

        return Response({
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'pending_orders': pending_orders,
            'cancelled_orders': cancelled_orders,
            'revenue': float(revenue),
            'platform_revenue': float(platform_revenue),
            'platform_net_revenue': float(platform_net_revenue),
            'instructor_payout': float(instructor_payout),
            'affiliate_commission_total': float(affiliate_commission_total),
            'affiliate_summary': {
                'pending_applications': affiliate_summary['pending'] or 0,
                'approved_affiliates': affiliate_summary['approved'] or 0,
            },
            'withdrawal_summary': {
                'pending_count': withdrawal_summary['pending'] or 0,
                'approved_count': withdrawal_summary['approved'] or 0,
                'paid_count': withdrawal_summary['paid'] or 0,
                'pending_amount': float(withdrawal_summary['pending_amount'] or 0),
                'approved_amount': float(withdrawal_summary['approved_amount'] or 0),
                'paid_amount': float(withdrawal_summary['paid_amount'] or 0),
            },
            'recent_orders': recent,
            'recent_withdrawals': InstructorWithdrawalRequestSerializer(recent_withdrawals, many=True).data,
            'accountant_whatsapp_number': _get_accountant_whatsapp_number(),
        })


class ProjectManagerStatsView(APIView):
    permission_classes = [IsProjectManagerOrAdmin]

    def get(self, request):
        role = get_user_role(request.user)
        projects = Project.objects.all()
        if role == STAFF_ROLE_PROJECT_MANAGER:
            projects = projects.filter(created_by=request.user)

        project_ids = list(projects.values_list('id', flat=True))
        assignments = ProjectAssignment.objects.filter(project_id__in=project_ids).select_related('instructor')

        summary = projects.aggregate(
            total=Count('id'),
            draft=Count('id', filter=Q(status=Project.STATUS_DRAFT)),
            planning=Count('id', filter=Q(status=Project.STATUS_PLANNING)),
            active=Count('id', filter=Q(status=Project.STATUS_ACTIVE)),
            on_hold=Count('id', filter=Q(status=Project.STATUS_ON_HOLD)),
            completed=Count('id', filter=Q(status=Project.STATUS_COMPLETED)),
        )
        overdue_count = projects.filter(
            due_date__lt=timezone.localdate()
        ).exclude(status__in=[Project.STATUS_COMPLETED, Project.STATUS_CANCELLED]).count()

        instructor_workloads = {}
        for assignment in assignments:
            bucket = instructor_workloads.setdefault(assignment.instructor_id, {
                'instructor_id': assignment.instructor_id,
                'instructor_name': assignment.instructor.name,
                'instructor_title': assignment.instructor.title,
                'total_assignments': 0,
                'active_assignments': 0,
                'completed_assignments': 0,
            })
            bucket['total_assignments'] += 1
            if assignment.status == ProjectAssignment.STATUS_COMPLETED:
                bucket['completed_assignments'] += 1
            elif assignment.status != ProjectAssignment.STATUS_ASSIGNED:
                bucket['active_assignments'] += 1
            else:
                bucket['active_assignments'] += 1

        top_instructors = sorted(
            instructor_workloads.values(),
            key=lambda item: (-item['active_assignments'], -item['total_assignments'], item['instructor_name'].lower()),
        )[:6]
        recent_projects = projects.order_by('-updated_at', '-id')[:5]

        return Response({
            'summary': {
                'total_projects': summary['total'] or 0,
                'draft_projects': summary['draft'] or 0,
                'planning_projects': summary['planning'] or 0,
                'active_projects': summary['active'] or 0,
                'on_hold_projects': summary['on_hold'] or 0,
                'completed_projects': summary['completed'] or 0,
                'overdue_projects': overdue_count,
                'total_assignments': assignments.count(),
                'assigned_instructors': len(instructor_workloads),
            },
            'recent_projects': ProjectSerializer(recent_projects, many=True).data,
            'instructor_workloads': top_instructors,
        })


# ── Instructor Portal ────────────────────────────────────────────────────────
class ReferralCodeViewSet(viewsets.ModelViewSet):
    queryset = ReferralCode.objects.select_related('owner', 'created_by').order_by('-created_at', '-id')
    serializer_class = ReferralCodeSerializer

    def get_permissions(self):
        if self.action in ['validate', 'my_code']:
            return [IsAuthenticated()]
        if self.action in ['list', 'retrieve'] and get_user_role(self.request.user) in {STAFF_ROLE_ADMIN, STAFF_ROLE_ACCOUNTANT}:
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = get_user_role(self.request.user)
        if role in {STAFF_ROLE_ADMIN, STAFF_ROLE_ACCOUNTANT}:
            status_filter = (self.request.query_params.get('status') or '').strip().lower()
            owner_filter = (self.request.query_params.get('owner') or '').strip()
            if status_filter == 'active':
                queryset = queryset.filter(is_active=True)
            elif status_filter == 'affiliate':
                queryset = queryset.filter(owner__isnull=False)
            if owner_filter.isdigit():
                queryset = queryset.filter(owner_id=int(owner_filter))
            return queryset
        return queryset.filter(owner=self.request.user, is_active=True)

    @action(detail=False, methods=['get'])
    def validate(self, request):
        serializer = ReferralCodeValidateSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        referral_code_input = ''.join(ch for ch in str(validated['code'] or '').upper().strip() if ch.isalnum())
        referral = ReferralCode.objects.select_related('owner').filter(code=referral_code_input).first()
        if not referral:
            return Response({'valid': False, 'error': 'Kode referral tidak ditemukan.'}, status=404)
        if not referral.is_currently_valid():
            return Response({'valid': False, 'error': 'Kode referral sedang tidak aktif, sudah kedaluwarsa, atau kuotanya habis.'}, status=400)
        if referral.owner_id and referral.owner_id == request.user.id:
            return Response({'valid': False, 'error': 'Kode referral milik sendiri tidak bisa digunakan untuk checkout pribadi.'}, status=400)

        total_amount = get_order_total_amount(
            validated['course'],
            offer_type=validated.get('offer_type', ORDER_OFFER_ELEARNING),
            public_session_id=validated.get('public_session_id', ''),
            offer_mode=(validated.get('offer_mode') or '').strip().lower(),
        )
        if total_amount is None:
            return Response({'valid': False, 'error': 'Harga paket yang dipilih tidak valid.'}, status=400)

        discount_info = apply_referral_discount(total_amount, referral)
        payload = ReferralCodeSerializer(referral, context={'request': request}).data
        payload.update({
            'valid': True,
            'original_amount': str(discount_info['original_amount']),
            'discount_amount': str(discount_info['discount_amount']),
            'final_amount': str(discount_info['final_amount']),
        })
        return Response(payload)

    @action(detail=False, methods=['get'])
    def my_code(self, request):
        referral = ReferralCode.objects.filter(owner=request.user).order_by('-created_at', '-id').first()
        if not referral:
            return Response({'detail': 'Anda belum memiliki kode referral pribadi.'}, status=404)
        return Response(ReferralCodeSerializer(referral, context={'request': request}).data)


class AffiliateApplicationListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        status_filter = (request.query_params.get('status') or '').strip().lower()
        profiles = UserProfile.objects.select_related('user', 'affiliate_reviewed_by').filter(
            affiliate_status__in=[AFFILIATE_STATUS_PENDING, AFFILIATE_STATUS_APPROVED, AFFILIATE_STATUS_REJECTED]
        ).order_by('-affiliate_requested_at', '-id')
        if status_filter in {AFFILIATE_STATUS_PENDING, AFFILIATE_STATUS_APPROVED, AFFILIATE_STATUS_REJECTED}:
            profiles = profiles.filter(affiliate_status=status_filter)
        return Response([_build_affiliate_application_payload(profile) for profile in profiles])


class AffiliateApplicationReviewView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        serializer = AffiliateApplicationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user = get_object_or_404(User.objects.select_related('profile'), pk=user_id)
        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        action = serializer.validated_data['action']
        note = serializer.validated_data.get('note') or ''

        profile.affiliate_status = AFFILIATE_STATUS_APPROVED if action == 'approve' else AFFILIATE_STATUS_REJECTED
        profile.affiliate_reviewed_at = timezone.now()
        profile.affiliate_reviewed_by = request.user
        profile.affiliate_review_notes = note
        if profile.affiliate_requested_at is None:
            profile.affiliate_requested_at = timezone.now()
        profile.save(update_fields=[
            'affiliate_status',
            'affiliate_requested_at',
            'affiliate_reviewed_at',
            'affiliate_reviewed_by',
            'affiliate_review_notes',
        ])

        referral = None
        if action == 'approve':
            referral = _get_or_create_personal_referral_code(target_user, created_by=request.user)

        payload = _build_affiliate_application_payload(profile)
        if referral:
            payload['personal_referral_code'] = referral.code
            payload['personal_referral_label'] = referral.label

        return Response({
            'message': 'Status affiliator berhasil diperbarui.',
            'application': payload,
        })


def _get_instructor_for_user(user):
    """Get Instructor object for the logged-in user. Uses FK link first, then name matching."""
    if not getattr(user, 'is_authenticated', False):
        return None

    # Priority 1: direct FK link (OneToOne)
    if hasattr(user, 'instructor_profile') and user.instructor_profile:
        if user.instructor_profile.is_approved:
            return user.instructor_profile
        return None

    # Priority 2: match by full name
    full_name = f"{user.first_name} {user.last_name}".strip()
    if full_name:
        qs = Instructor.objects.filter(name__iexact=full_name, approval_status=Instructor.APPROVAL_APPROVED)
        if qs.exists():
            return qs.first()
    # Priority 3: partial match on username
    qs = Instructor.objects.filter(name__icontains=user.username, approval_status=Instructor.APPROVAL_APPROVED)
    if qs.exists():
        return qs.first()
    return None


class CertificationExamViewSet(viewsets.ModelViewSet):
    queryset = CertificationExam.objects.all()
    serializer_class = CertificationExamSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        queryset = CertificationExam.objects.select_related(
            'course',
            'course__instructor',
        ).prefetch_related(
            'questions__alternatives',
            'slots',
        )
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(course_id=course_id)

        user = self.request.user
        if not user.is_authenticated:
            return queryset.filter(is_active=True, instructor_confirmed=True)

        if get_user_role(user) == STAFF_ROLE_ADMIN:
            return queryset

        instructor = _get_instructor_for_user(user)
        if instructor:
            return queryset.filter(course__instructor=instructor)

        return queryset.filter(is_active=True, instructor_confirmed=True)

    @action(detail=True, methods=['post'], permission_classes=[IsInstructorOrAdmin])
    def request_instructor_availability(self, request, pk=None):
        exam = self.get_object()
        exam.instructor_confirmed = False # Reset confirmation if needed
        exam.save()
        # Logic here to notify instructor
        return Response({'status': 'availability requested'})

    @action(detail=True, methods=['post'], permission_classes=[IsInstructorOrAdmin])
    def confirm_availability(self, request, pk=None):
        exam = self.get_object()
        # Ensure the requester is the instructor of the course
        instructor = _get_instructor_for_user(request.user)
        if get_user_role(request.user) != STAFF_ROLE_ADMIN and exam.course.instructor != instructor:
            return Response({'error': 'You are not the instructor for this course.'}, status=403)

        if not exam.confirmed_start_at:
            return Response({'error': 'Tentukan tanggal mulai ujian terlebih dahulu.'}, status=400)
        if exam.confirmed_end_at and exam.confirmed_end_at < exam.confirmed_start_at:
            return Response({'error': 'Tanggal selesai ujian tidak boleh lebih awal dari tanggal mulai.'}, status=400)
        if exam.requires_interview() and not exam.slots.exists():
            return Response({'error': 'Tambahkan minimal satu slot sesi sebelum konfirmasi.'}, status=400)

        exam.instructor_confirmed = True
        exam.save()
        return Response({
            'status': 'availability confirmed',
            'instructor_confirmed': True,
            'confirmed_start_at': exam.confirmed_start_at,
            'confirmed_end_at': exam.confirmed_end_at,
        })

    def perform_create(self, serializer):
        course = serializer.validated_data.get('course')
        if course.type != 'course':
            raise serializers.ValidationError({"course": "Ujian akhir hanya diperbolehkan untuk kursus dengan jenis Pelatihan."})
        instructor = _get_instructor_for_user(self.request.user)
        if get_user_role(self.request.user) != STAFF_ROLE_ADMIN and course.instructor != instructor:
            raise serializers.ValidationError({"course": "Anda hanya bisa membuat ujian akhir untuk kursus yang Anda ampu."})
        serializer.save()

    def perform_update(self, serializer):
        if 'course' in serializer.validated_data:
            course = serializer.validated_data.get('course')
            if course.type != 'course':
                raise serializers.ValidationError({"course": "Ujian akhir hanya diperbolehkan untuk kursus dengan jenis Pelatihan."})
        serializer.save()

    @action(detail=True, methods=['get'], permission_classes=[IsInstructorOrAdmin])
    def export_questions(self, request, pk=None):
        exam = self.get_object()
        export_format = (request.query_params.get('format') or 'xlsx').lower()
        rows = _build_exam_question_rows(exam)
        headers = ['No', 'Kategori', 'Tipe', 'Poin', 'Pertanyaan', 'Gambar', 'Pilihan', 'Jawaban Benar']
        values = [
            [
                row['no'],
                row['category'],
                row['type'],
                row['points'],
                row['text'],
                row['image_url'],
                row['options'],
                row['correct_answers'],
            ]
            for row in rows
        ]
        filename = f"bank-soal-{exam.id}"
        title = f"Bank Soal Assessment - {exam.title}"
        if export_format == 'pdf':
            return _export_rows_as_pdf(filename, title, headers, values)
        return _export_rows_as_xlsx(filename, title, headers, values)

    @action(detail=True, methods=['get'], permission_classes=[IsInstructorOrAdmin])
    def export_attempts(self, request, pk=None):
        exam = self.get_object()
        export_format = (request.query_params.get('format') or 'xlsx').lower()
        rows = _build_exam_attempt_rows(exam)
        headers = ['No', 'Peserta', 'Status', 'Skor', 'Hasil Wawancara', 'Alasan', 'Feedback', 'Slot', 'Direview Oleh', 'Waktu Review']
        values = [
            [
                row['no'],
                row['participant'],
                row['status'],
                row['score'],
                row['interview_result'],
                row['interview_reason'],
                row['interview_feedback'],
                row['slot'],
                row['reviewed_by'],
                row['reviewed_at'],
            ]
            for row in rows
        ]
        filename = f"hasil-assessment-{exam.id}"
        title = f"Data Peserta Assessment - {exam.title}"
        if export_format == 'pdf':
            return _export_rows_as_pdf(filename, title, headers, values)
        return _export_rows_as_xlsx(filename, title, headers, values)

class CertificationQuestionViewSet(viewsets.ModelViewSet):
    queryset = CertificationQuestion.objects.all()
    serializer_class = CertificationQuestionSerializer
    permission_classes = [IsInstructorOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = CertificationQuestion.objects.select_related(
            'exam',
            'exam__course',
            'exam__course__instructor',
        ).prefetch_related('alternatives')

        exam_id = self.request.query_params.get('exam')
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)

        category = (self.request.query_params.get('category') or '').strip()
        if category:
            queryset = queryset.filter(category_label__iexact=category)

        user = self.request.user
        if not user.is_authenticated:
            return queryset.filter(exam__is_active=True, exam__instructor_confirmed=True)

        if get_user_role(user) == STAFF_ROLE_ADMIN:
            return queryset

        instructor = _get_instructor_for_user(user)
        if instructor:
            return queryset.filter(exam__course__instructor=instructor)

        return queryset.none()

    def perform_create(self, serializer):
        exam = serializer.validated_data['exam']
        instructor = _get_instructor_for_user(self.request.user)
        if get_user_role(self.request.user) != STAFF_ROLE_ADMIN and exam.course.instructor != instructor:
            raise serializers.ValidationError({"exam": "Anda hanya bisa menambah soal untuk assessment di pelatihan yang Anda ampu."})
        serializer.save()

    def perform_update(self, serializer):
        exam = serializer.validated_data.get('exam', getattr(serializer.instance, 'exam', None))
        instructor = _get_instructor_for_user(self.request.user)
        if exam and get_user_role(self.request.user) != STAFF_ROLE_ADMIN and exam.course.instructor != instructor:
            raise serializers.ValidationError({"exam": "Anda hanya bisa mengubah soal untuk assessment di pelatihan yang Anda ampu."})
        serializer.save()

class CertificationInstructorSlotViewSet(viewsets.ModelViewSet):
    queryset = CertificationInstructorSlot.objects.all()
    serializer_class = CertificationInstructorSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if get_user_role(user) == STAFF_ROLE_ADMIN:
            return CertificationInstructorSlot.objects.all()
        instructor = _get_instructor_for_user(user)
        if instructor:
            return CertificationInstructorSlot.objects.filter(instructor=instructor)
        return CertificationInstructorSlot.objects.none()

    def perform_create(self, serializer):
        instructor = _get_instructor_for_user(self.request.user)
        if instructor:
            serializer.save(instructor=instructor)
        else:
            serializer.save()

class CertificationAlternativeViewSet(viewsets.ModelViewSet):
    queryset = CertificationAlternative.objects.all()
    serializer_class = CertificationAlternativeSerializer
    permission_classes = [IsInstructorOrAdmin]

class CertificationAttemptViewSet(viewsets.ModelViewSet):
    queryset = CertificationAttempt.objects.all()
    serializer_class = CertificationAttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = CertificationAttempt.objects.select_related(
            'user',
            'exam',
            'exam__course',
            'exam__course__instructor',
            'interview_slot',
            'interview_slot__instructor',
            'interview_reviewed_by',
        ).prefetch_related(
            'answers',
        )
        if get_user_role(user) == STAFF_ROLE_ADMIN:
            return queryset

        instructor = _get_instructor_for_user(user)
        if instructor:
            return queryset.filter(exam__course__instructor=instructor)

        return queryset.filter(user=user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        exam = serializer.validated_data['exam']
        user = request.user
        now = timezone.now()
        selected_slot = serializer.validated_data.get('interview_slot')

        if not has_assessment_access(user, exam.course):
            return Response({'error': 'Anda harus terdaftar pada pelatihan ini untuk mengikuti assessment ini.'}, status=403)

        if not exam.is_active:
            return Response({'error': 'Ujian akhir ini belum diaktifkan.'}, status=400)

        if not exam.instructor_confirmed or not exam.confirmed_start_at:
            return Response({'error': 'Jadwal ujian akhir belum dikonfirmasi oleh instruktur.'}, status=400)

        if exam.confirmed_end_at and now > exam.confirmed_end_at:
            return Response({'error': 'Jadwal ujian akhir ini sudah berakhir.'}, status=400)

        has_instructor_slots = exam.slots.exists()
        if exam.requires_interview() and not has_instructor_slots:
            return Response({'error': 'Instruktur belum menambahkan slot sesi untuk ujian ini.'}, status=400)
        if has_instructor_slots and not selected_slot:
            return Response({'error': 'Pilih dulu jadwal ujian yang tersedia dari instruktur.'}, status=400)

        if selected_slot:
            if selected_slot.exam_id != exam.id:
                return Response({'error': 'Jadwal yang dipilih tidak sesuai dengan ujian ini.'}, status=400)

        existing_attempt = CertificationAttempt.objects.filter(
            user=user,
            exam=exam,
            status__in=['PENDING', 'IN_PROGRESS'],
        ).order_by('-started_at').first()

        if selected_slot and selected_slot.is_booked and (
            not existing_attempt or existing_attempt.interview_slot_id != selected_slot.id
        ):
            return Response({'error': 'Jadwal yang dipilih sudah diambil peserta lain.'}, status=400)

        if existing_attempt:
            if not existing_attempt.question_order:
                existing_attempt.question_order = _build_attempt_question_order(exam)
                existing_attempt.save(update_fields=['question_order'])

            if selected_slot and existing_attempt.status == 'PENDING':
                current_slot = existing_attempt.interview_slot
                current_slot_start = None

                if current_slot:
                    current_slot_start = timezone.make_aware(
                        datetime.combine(current_slot.date, current_slot.start_time),
                        timezone.get_current_timezone(),
                    )

                can_change_slot = (
                    not current_slot
                    or now < current_slot_start
                )

                if can_change_slot and current_slot and current_slot.id == selected_slot.id:
                    existing_serializer = self.get_serializer(existing_attempt)
                    return Response(existing_serializer.data, status=200)

                if can_change_slot:
                    with transaction.atomic():
                        locked_new_slot = CertificationInstructorSlot.objects.select_for_update().filter(
                            id=selected_slot.id,
                            exam=exam,
                        ).first()
                        if not locked_new_slot or locked_new_slot.is_booked:
                            return Response({'error': 'Jadwal yang dipilih sudah tidak tersedia.'}, status=400)

                        previous_slot = None
                        if current_slot:
                            previous_slot = CertificationInstructorSlot.objects.select_for_update().filter(
                                id=current_slot.id,
                                exam=exam,
                            ).first()

                        if previous_slot and previous_slot.id != locked_new_slot.id:
                            previous_slot.is_booked = False
                            previous_slot.save(update_fields=['is_booked'])

                        locked_new_slot.is_booked = True
                        locked_new_slot.save(update_fields=['is_booked'])

                        new_slot_start = timezone.make_aware(
                            datetime.combine(locked_new_slot.date, locked_new_slot.start_time),
                            timezone.get_current_timezone(),
                        )
                        existing_attempt.interview_slot = locked_new_slot
                        existing_attempt.status = 'PENDING' if now < new_slot_start else 'IN_PROGRESS'
                        existing_attempt.save(update_fields=['interview_slot', 'status'])

                    existing_serializer = self.get_serializer(existing_attempt)
                    return Response(existing_serializer.data, status=200)

            existing_serializer = self.get_serializer(existing_attempt)
            return Response(existing_serializer.data, status=200)

        locked_attempt = CertificationAttempt.objects.filter(
            user=user,
            exam=exam,
            status__in=['SUBMITTED', 'GRADED'],
        ).exists()
        if locked_attempt:
            return Response({'error': 'Anda sudah menyelesaikan ujian akhir ini.'}, status=400)

        attempt_status = 'IN_PROGRESS'
        if selected_slot:
            slot_start = timezone.make_aware(
                datetime.combine(selected_slot.date, selected_slot.start_time),
                timezone.get_current_timezone(),
            )
            if now < slot_start:
                attempt_status = 'PENDING'
        elif now < exam.confirmed_start_at:
            attempt_status = 'PENDING'

        with transaction.atomic():
            if selected_slot:
                locked_slot = CertificationInstructorSlot.objects.select_for_update().filter(
                    id=selected_slot.id,
                    exam=exam,
                ).first()
                if not locked_slot or locked_slot.is_booked:
                    return Response({'error': 'Jadwal yang dipilih sudah tidak tersedia.'}, status=400)
                locked_slot.is_booked = True
                locked_slot.save(update_fields=['is_booked'])
                attempt = serializer.save(
                    user=user,
                    status=attempt_status,
                    interview_slot=locked_slot,
                    question_order=_build_attempt_question_order(exam),
                )
            else:
                attempt = serializer.save(
                    user=user,
                    status=attempt_status,
                    question_order=_build_attempt_question_order(exam),
                )

        output_serializer = self.get_serializer(attempt)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=201, headers=headers)

    @action(detail=True, methods=['post'])
    def cancel_schedule(self, request, pk=None):
        attempt = self.get_object()

        if attempt.user_id != request.user.id and get_user_role(request.user) != STAFF_ROLE_ADMIN:
            instructor = _get_instructor_for_user(request.user)
            if not instructor or attempt.exam.course.instructor_id != instructor.id:
                return Response({'error': 'Anda tidak memiliki izin untuk membatalkan jadwal ini.'}, status=403)

        if attempt.status in ['SUBMITTED', 'GRADED']:
            return Response({'error': 'Assessment yang sudah dikirim tidak bisa dibatalkan.'}, status=400)

        slot = attempt.interview_slot
        if slot:
            slot_start = timezone.make_aware(
                datetime.combine(slot.date, slot.start_time),
                timezone.get_current_timezone(),
            )
            if timezone.now() >= slot_start:
                return Response({'error': 'Jadwal yang sudah dimulai tidak bisa dibatalkan.'}, status=400)

        with transaction.atomic():
            if slot:
                locked_slot = CertificationInstructorSlot.objects.select_for_update().filter(id=slot.id).first()
                if locked_slot and locked_slot.is_booked:
                    locked_slot.is_booked = False
                    locked_slot.save(update_fields=['is_booked'])
            attempt.delete()

        return Response({'status': 'cancelled'})

    @action(detail=True, methods=['post'])
    def submit_exam(self, request, pk=None):
        attempt = self.get_object()
        answers_data = request.data.get('answers', {})
        questions = list(attempt.exam.questions.all())

        if attempt.status in ['SUBMITTED', 'GRADED']:
            return Response({'error': 'Ujian ini sudah dikirim sebelumnya.'}, status=400)
        
        # Save answers
        for q_id, val in answers_data.items():
            question = CertificationQuestion.objects.filter(id=q_id, exam=attempt.exam).first()
            if not question:
                continue
            if question.question_type == 'MC':
                CertificationAnswer.objects.update_or_create(
                    attempt=attempt, question=question,
                    defaults={'selected_alternative_id': val}
                )
            elif question.question_type == 'Essay':
                CertificationAnswer.objects.update_or_create(
                    attempt=attempt, question=question,
                    defaults={'essay_answer': val}
                )
            elif question.question_type == 'Interview':
                # Map slot and mark as booked
                slot = CertificationInstructorSlot.objects.filter(id=val, exam=attempt.exam).first()
                if slot:
                    if slot.is_booked and attempt.interview_slot_id != slot.id:
                        return Response({'error': 'Slot wawancara tersebut sudah terpesan.'}, status=400)
                    slot.is_booked = True
                    slot.save(update_fields=['is_booked'])
                    attempt.interview_slot = slot

        # Simple Auto-grading for MC
        total_points = sum(q.points for q in questions if q.question_type == 'MC')
        earned_points = 0
        mc_questions = [q for q in questions if q.question_type == 'MC']
        
        for q in mc_questions:
            ans = CertificationAnswer.objects.filter(attempt=attempt, question=q).first()
            if ans and ans.selected_alternative and ans.selected_alternative.is_correct:
                earned_points += q.points
                ans.score = q.points
                ans.save()
        
        if total_points > 0:
            attempt.score = (earned_points / total_points) * 100

        passing_percentage = attempt.exam.passing_percentage or 70
        # In multi-format, this might wait for Essay/Interview grading
        has_essay_or_interview = any(q.question_type in ['Essay', 'Interview'] for q in questions)
        requires_manual_review = attempt.exam.exam_mode != 'QUESTIONS_ONLY' or has_essay_or_interview

        attempt.submitted_at = timezone.now()
        attempt.status = 'SUBMITTED' if requires_manual_review else 'GRADED'
        if not requires_manual_review and attempt.score >= passing_percentage:
            attempt.status = 'GRADED'
            _finalize_attempt_certificate_if_eligible(attempt)
        elif not requires_manual_review:
            attempt.status = 'GRADED'

        attempt.save()

        return Response(self.get_serializer(attempt).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def review_interview(self, request, pk=None):
        attempt = self.get_object()
        instructor = _get_instructor_for_user(request.user)
        if get_user_role(request.user) != STAFF_ROLE_ADMIN and (
            not instructor or attempt.exam.course.instructor_id != instructor.id
        ):
            return Response({'error': 'Anda tidak memiliki izin untuk meninjau hasil wawancara ini.'}, status=403)

        result = (request.data.get('interview_result') or request.data.get('result') or '').upper().strip()
        reason = (request.data.get('interview_reason') or '').strip()
        feedback = (request.data.get('interview_feedback') or '').strip()

        if result not in {
            CertificationAttempt.INTERVIEW_RESULT_PASSED,
            CertificationAttempt.INTERVIEW_RESULT_FAILED,
        }:
            return Response({'error': 'Pilih hasil wawancara yang valid.'}, status=400)

        if result == CertificationAttempt.INTERVIEW_RESULT_FAILED and not reason:
            return Response({'error': 'Berikan alasan jika peserta dinyatakan tidak lolos wawancara.'}, status=400)

        attempt.interview_result = result
        attempt.interview_reason = reason
        attempt.interview_feedback = feedback
        attempt.interview_reviewed_by = request.user
        attempt.interview_reviewed_at = timezone.now()
        attempt.status = 'GRADED'
        attempt.save(update_fields=[
            'interview_result',
            'interview_reason',
            'interview_feedback',
            'interview_reviewed_by',
            'interview_reviewed_at',
            'status',
        ])

        if result == CertificationAttempt.INTERVIEW_RESULT_PASSED:
            _finalize_attempt_certificate_if_eligible(attempt)

        attempt.refresh_from_db()
        return Response(self.get_serializer(attempt).data)

class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if get_user_role(user) == STAFF_ROLE_ADMIN and self.request.query_params.get('scope') == 'all':
            return Certificate.objects.all().select_related('course', 'course__instructor', 'exam', 'user', 'approved_by', 'template')
        return Certificate.objects.filter(
            user=user,
        ).select_related('course', 'course__instructor', 'exam', 'user', 'approved_by', 'template')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        if get_user_role(request.user) != STAFF_ROLE_ADMIN or request.query_params.get('scope') != 'all':
            for certificate in queryset:
                _sync_certificate_readiness(certificate)
        else:
            for certificate in queryset:
                if certificate.approval_status == Certificate.APPROVAL_APPROVED:
                    generate_certificate_pdf(certificate)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if get_user_role(request.user) == STAFF_ROLE_ADMIN and request.query_params.get('scope') == 'all':
            if instance.approval_status == Certificate.APPROVAL_APPROVED:
                generate_certificate_pdf(instance)
        else:
            _sync_certificate_readiness(instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        certificate = self.get_object()
        template_id = request.data.get('template') or request.data.get('template_id')
        if template_id:
            template = CertificateTemplate.objects.filter(
                Q(course=certificate.course) | Q(course__isnull=True),
                id=template_id,
                is_active=True,
            ).first()
            if not template:
                return Response({'template': 'Template tidak aktif atau tidak berlaku untuk course ini.'}, status=400)
            certificate.template = template

        if certificate.approval_status == Certificate.APPROVAL_APPROVED:
            if template_id:
                _approve_certificate(certificate, approved_by=certificate.approved_by or request.user, force=True)
                certificate.save(update_fields=['template'])
            serializer = self.get_serializer(certificate)
            return Response(serializer.data)

        _approve_certificate(certificate, approved_by=request.user, force=True)
        certificate.save(update_fields=['template'])
        serializer = self.get_serializer(certificate)
        return Response(serializer.data)

class CertificateTemplateViewSet(viewsets.ModelViewSet):
    queryset = CertificateTemplate.objects.select_related('course').all()
    serializer_class = CertificateTemplateSerializer
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = self.queryset
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

class InstructorCoursesView(APIView):
    """Returns courses for the currently-logged-in instructor."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        instructor = _get_instructor_for_user(request.user)
        if not instructor:
            return Response({
                'courses': [],
                'assigned_projects': [],
                'instructor': None,
                'total_students': 0,
                'total_courses': 0,
                'finance_summary': None,
                'upcoming_schedule': [],
                'recent_withdrawals': [],
                'accountant_contact': {
                    'whatsapp_number': _get_accountant_whatsapp_number(),
                    'whatsapp_url': _build_accountant_whatsapp_url(),
                },
            })

        _sync_course_activity(Course.objects.filter(instructor=instructor))
        courses = Course.objects.filter(instructor=instructor).order_by('-created_at')
        serializer = CourseSerializer(courses, many=True, context={'request': request})

        total_students = Order.objects.filter(
            course__instructor=instructor
        ).values('user').distinct().count()
        assigned_projects = Project.objects.filter(assignments__instructor=instructor).select_related(
            'created_by',
            'related_course',
        ).prefetch_related(
            'assignments__instructor',
            'assignments__assigned_by',
        ).distinct()
        finance_summary = _get_instructor_finance_summary(instructor)
        upcoming_schedule = _build_instructor_schedule_entries(instructor)
        recent_withdrawals = _get_instructor_withdrawal_queryset(instructor)[:5]

        return Response({
            'instructor': InstructorSerializer(instructor).data,
            'courses': serializer.data,
            'assigned_projects': ProjectSerializer(assigned_projects, many=True).data,
            'total_students': total_students,
            'total_courses': courses.count(),
            'finance_summary': finance_summary,
            'upcoming_schedule': upcoming_schedule,
            'recent_withdrawals': InstructorWithdrawalRequestSerializer(recent_withdrawals, many=True).data,
            'accountant_contact': {
                'whatsapp_number': _get_accountant_whatsapp_number(),
                'whatsapp_url': _build_accountant_whatsapp_url(),
            },
        })


class InstructorStudentsView(APIView):
    """Returns enrolled students for the logged-in instructor's courses."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        instructor = _get_instructor_for_user(request.user)
        if not instructor:
            return Response([])
        instructor = instructor  # already resolved
        orders = Order.objects.filter(
            course__instructor=instructor
        ).select_related('user', 'course').order_by('-created_at')

        data = [
            {
                'id': o.id,
                'user_id': o.user.id,
                'username': o.user.username,
                'full_name': f"{o.user.first_name} {o.user.last_name}".strip() or o.user.username,
                'email': o.user.email,
                'course': o.course.title,
                'course_slug': o.course.slug,
                'status': o.status,
                'enrolled_at': o.created_at.strftime('%d %b %Y'),
            }
            for o in orders
        ]
        return Response(data)


class InstructorWithdrawalRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_instructor(self, user):
        instructor = _get_instructor_for_user(user)
        if not instructor:
            raise serializers.ValidationError({'error': 'Akun ini belum terhubung dengan profil instruktur.'})
        return instructor

    def get(self, request):
        try:
            instructor = self._get_instructor(request.user)
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=403)

        finance_summary = _get_instructor_finance_summary(instructor)
        requests = _get_instructor_withdrawal_queryset(instructor)
        return Response({
            'finance_summary': finance_summary,
            'results': InstructorWithdrawalRequestSerializer(requests, many=True).data,
            'accountant_contact': {
                'whatsapp_number': _get_accountant_whatsapp_number(),
                'whatsapp_url': _build_accountant_whatsapp_url(),
            },
        })

    def post(self, request):
        try:
            instructor = self._get_instructor(request.user)
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=403)

        serializer = InstructorWithdrawalRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile = getattr(request.user, 'profile', None)
        bank_name = (getattr(profile, 'bank_name', '') or '').strip()
        bank_account_number = (getattr(profile, 'bank_account_number', '') or '').strip()
        bank_account_holder = (getattr(profile, 'bank_account_holder', '') or '').strip()
        npwp = (getattr(profile, 'npwp', '') or '').strip()
        if not bank_name or not bank_account_number or not bank_account_holder:
            return Response({
                'error': 'Lengkapi nama bank, nomor rekening, dan nama pemilik rekening sebelum mengajukan pencairan.'
            }, status=400)

        finance_summary = _get_instructor_finance_summary(instructor)
        available_balance = Decimal(str(finance_summary['available_balance'] or 0))
        requested_amount = serializer.validated_data['amount']

        if requested_amount > available_balance:
            return Response({
                'error': 'Nominal pencairan melebihi saldo yang tersedia.'
            }, status=400)

        withdrawal = InstructorWithdrawalRequest.objects.create(
            instructor=instructor,
            requested_by=request.user,
            amount=requested_amount,
            note=serializer.validated_data.get('note') or '',
            npwp_snapshot=npwp or None,
            bank_name_snapshot=bank_name,
            bank_account_number_snapshot=bank_account_number,
            bank_account_holder_snapshot=bank_account_holder,
        )
        whatsapp_message = _build_instructor_withdrawal_whatsapp_message(withdrawal)
        return Response({
            'message': 'Pengajuan pencairan berhasil dikirim ke akunting.',
            'withdrawal': InstructorWithdrawalRequestSerializer(withdrawal).data,
            'finance_summary': _get_instructor_finance_summary(instructor),
            'whatsapp_url': _build_accountant_whatsapp_url(whatsapp_message),
            'whatsapp_message': whatsapp_message,
        }, status=201)


class AccountantWithdrawalRequestListView(APIView):
    permission_classes = [IsAccountant]

    def get(self, request):
        status_filter = (request.query_params.get('status') or '').strip().upper()
        queryset = InstructorWithdrawalRequest.objects.select_related(
            'instructor',
            'requested_by',
            'reviewed_by',
        ).order_by('-created_at')
        if status_filter in {
            WITHDRAWAL_STATUS_PENDING,
            WITHDRAWAL_STATUS_APPROVED,
            WITHDRAWAL_STATUS_REJECTED,
            WITHDRAWAL_STATUS_PAID,
        }:
            queryset = queryset.filter(status=status_filter)

        summary = queryset.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status=WITHDRAWAL_STATUS_PENDING)),
            approved=Count('id', filter=Q(status=WITHDRAWAL_STATUS_APPROVED)),
            rejected=Count('id', filter=Q(status=WITHDRAWAL_STATUS_REJECTED)),
            paid=Count('id', filter=Q(status=WITHDRAWAL_STATUS_PAID)),
            pending_amount=Sum('amount', filter=Q(status=WITHDRAWAL_STATUS_PENDING)),
            approved_amount=Sum('amount', filter=Q(status=WITHDRAWAL_STATUS_APPROVED)),
            paid_amount=Sum('amount', filter=Q(status=WITHDRAWAL_STATUS_PAID)),
        )
        return Response({
            'summary': {
                'total': summary['total'] or 0,
                'pending': summary['pending'] or 0,
                'approved': summary['approved'] or 0,
                'rejected': summary['rejected'] or 0,
                'paid': summary['paid'] or 0,
                'pending_amount': float(summary['pending_amount'] or 0),
                'approved_amount': float(summary['approved_amount'] or 0),
                'paid_amount': float(summary['paid_amount'] or 0),
            },
            'results': InstructorWithdrawalRequestSerializer(queryset, many=True).data,
            'accountant_contact': {
                'whatsapp_number': _get_accountant_whatsapp_number(),
                'whatsapp_url': _build_accountant_whatsapp_url(),
            },
        })


class AccountantWithdrawalRequestDetailView(APIView):
    permission_classes = [IsAccountant]

    def patch(self, request, withdrawal_id):
        withdrawal = get_object_or_404(
            InstructorWithdrawalRequest.objects.select_related('instructor', 'requested_by', 'reviewed_by'),
            pk=withdrawal_id,
        )
        serializer = InstructorWithdrawalRequestReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        next_status = serializer.validated_data['status']
        accountant_notes = serializer.validated_data.get('accountant_notes') or ''

        if withdrawal.status == WITHDRAWAL_STATUS_PAID:
            return Response({'error': 'Pengajuan ini sudah ditandai cair dan tidak bisa diubah lagi.'}, status=400)
        if withdrawal.status == WITHDRAWAL_STATUS_REJECTED and next_status != WITHDRAWAL_STATUS_REJECTED:
            return Response({'error': 'Pengajuan yang sudah ditolak tidak bisa diubah menjadi status lain.'}, status=400)
        if next_status == WITHDRAWAL_STATUS_PAID and withdrawal.status not in [WITHDRAWAL_STATUS_PENDING, WITHDRAWAL_STATUS_APPROVED]:
            return Response({'error': 'Hanya pengajuan aktif yang bisa ditandai cair.'}, status=400)

        withdrawal.status = next_status
        withdrawal.accountant_notes = accountant_notes or withdrawal.accountant_notes
        withdrawal.reviewed_by = request.user
        withdrawal.reviewed_at = timezone.now()
        if next_status == WITHDRAWAL_STATUS_PAID:
            withdrawal.paid_at = timezone.now()
        withdrawal.save(update_fields=[
            'status', 'accountant_notes', 'reviewed_by', 'reviewed_at', 'paid_at', 'updated_at',
        ])

        return Response({
            'message': 'Status pencairan berhasil diperbarui.',
            'withdrawal': InstructorWithdrawalRequestSerializer(withdrawal).data,
        })


# ── Midtrans Webhook ──────────────────────────────────────────────────────────
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class MidtransNotificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if midtransclient is None:
            return Response({'error': 'Integrasi pembayaran Midtrans belum tersedia pada environment ini.'}, status=503)

        server_key = getattr(settings, 'MIDTRANS_SERVER_KEY', 'SB-Mid-server-placeholder')
        is_production = getattr(settings, 'MIDTRANS_IS_PRODUCTION', False)
        
        snap = midtransclient.Snap(
            is_production=is_production,
            server_key=server_key
        )
        
        data = request.data
        print(f"DEBUG: Incoming Midtrans Notification: {data}")
        
        try:
            # Verify notification authenticity
            status_response = snap.transactions.notification(data)
            
            order_id = status_response['order_id']
            transaction_status = status_response['transaction_status']
            fraud_status = status_response['fraud_status']
            
            print(f"DEBUG: Midtrans Status: {transaction_status}, Fraud: {fraud_status} for Order: {order_id}")
            
            # Find order by midtrans_id
            try:
                order = Order.objects.get(midtrans_id=order_id)
            except Order.DoesNotExist:
                print(f"ERROR: Order with midtrans_id {order_id} not found")
                return Response({'message': 'Order not found'}, status=404)

            old_status = order.status
            new_status = old_status

            if transaction_status == 'capture':
                if fraud_status == 'challenge':
                    new_status = 'Pending'
                elif fraud_status == 'accept':
                    new_status = 'Completed'
            elif transaction_status == 'settlement':
                new_status = 'Completed'
            elif transaction_status in ['cancel', 'expire']:
                new_status = 'Cancelled'
            elif transaction_status == 'deny':
                new_status = 'Failed'
            elif transaction_status == 'pending':
                new_status = 'Pending'

            print(f"DEBUG: Order {order.id} status transition: {old_status} -> {new_status}")
            order.status = new_status
            order.save()

            # Automatic Enrollment Logic: Increment enrolled_count when payment is first completed
            if old_status == 'Pending' and new_status == 'Completed':
                course = order.course
                course.enrolled_count += 1
                course.save()
                print(f"DEBUG: Course '{course.title}' enrollment incremented to {course.enrolled_count}")

            return Response({'status': 'ok'})
        except Exception as e:
            print(f"ERROR: Webhook processing failed: {str(e)}")
            return Response({'error': str(e)}, status=400)


# ── Admin User Actions ───────────────────────────────────────────────────────
class AdminResetPasswordView(APIView):
    """
    Admin resets a user's password.
    POST /api/users/{id}/reset-password/
    Body: { "new_password": "..." }
    """
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        new_password = request.data.get('new_password', '').strip()
        if len(new_password) < 6:
            return Response({'error': 'Password harus minimal 6 karakter.'}, status=400)
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User tidak ditemukan.'}, status=404)

        # Prevent non-superuser from resetting superuser password
        if user.is_superuser and not request.user.is_superuser:
            return Response({'error': 'Tidak diizinkan mengubah password superuser.'}, status=403)

        user.set_password(new_password)
        user.save()
        return Response({'message': f'Password {user.username} berhasil direset.'})


class AdminEditUserView(APIView):
    """
    Admin edits user data (name, email, is_staff, staff_role, is_active).
    PATCH /api/users/{id}/edit/
    Body: { "first_name": "..", "last_name": "..", "email": "..", "is_staff": bool, "staff_role": "admin|akuntan", "is_active": bool }
    """
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User tidak ditemukan.'}, status=404)

        # Protect superusers from being edited by non-superusers
        if user.is_superuser and not request.user.is_superuser:
            return Response({'error': 'Tidak diizinkan mengedit akun superuser.'}, status=403)

        allowed_fields = ['first_name', 'last_name', 'email', 'is_staff', 'is_active']
        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])

        requested_staff_role = request.data.get('staff_role')
        if requested_staff_role not in [None, '', STAFF_ROLE_ADMIN, STAFF_ROLE_ACCOUNTANT, STAFF_ROLE_PROJECT_MANAGER]:
            return Response({'error': 'Role staff tidak valid.'}, status=400)

        # Validate email uniqueness
        email = request.data.get('email')
        if email and User.objects.filter(email=email).exclude(pk=pk).exists():
            return Response({'error': 'Email sudah digunakan user lain.'}, status=400)

        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if user.is_staff:
            profile.staff_role = requested_staff_role or get_staff_role(user) or STAFF_ROLE_ADMIN
            profile.save(update_fields=['staff_role'])
        elif profile.staff_role:
            profile.staff_role = None
            profile.save(update_fields=['staff_role'])

        from .serializers import UserSerializer
        return Response(UserSerializer(user).data)


class AdminImpersonateView(APIView):
    """
    Admin generates a JWT token pair for another user (login-as / hijack).
    POST /api/users/{id}/impersonate/
    Returns: { "access": "...", "refresh": "...", "username": "...", "warning": "..." }
    """
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User tidak ditemukan.'}, status=404)

        # Only superuser can impersonate another staff/superuser
        if (target_user.is_staff or target_user.is_superuser) and not request.user.is_superuser:
            return Response({'error': 'Hanya superuser yang bisa melakukan impersonasi ke akun staff.'}, status=403)

        # Prevent self-impersonation (pointless)
        if target_user.pk == request.user.pk:
            return Response({'error': 'Tidak bisa melakukan impersonasi ke akun sendiri.'}, status=400)

        # Generate token using CustomTokenObtainPairSerializer logic
        from .serializers import CustomTokenObtainPairSerializer
        refresh = CustomTokenObtainPairSerializer.get_token(target_user)
        access = refresh.access_token

        return Response({
            'access': str(access),
            'refresh': str(refresh),
            'username': target_user.username,
            'user_id': target_user.pk,
            'is_staff': target_user.is_staff,
            'is_superuser': target_user.is_superuser,
            'warning': f'Anda sedang login sebagai {target_user.username}. Gunakan dengan bijak.',
        })


from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import Cart, CartItem


class CartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _normalize_cart_offer(self, course, payload):
        offer_type = (payload.get('offer_type') or ORDER_OFFER_ELEARNING).strip().lower()
        offer_mode = (payload.get('offer_mode') or '').strip().lower()
        public_session_id = (payload.get('public_session_id') or '').strip()

        if offer_type == ORDER_OFFER_ELEARNING:
            if not course.elearning_enabled:
                raise serializers.ValidationError({'offer_type': 'Course ini tidak membuka paket e-learning.'})
            return offer_type, '', ''

        if offer_type == ORDER_OFFER_PUBLIC:
            if not course.public_training_enabled:
                raise serializers.ValidationError({'offer_type': 'Course ini tidak membuka paket public training.'})
            session = get_public_session(course, session_id=public_session_id, offer_mode=offer_mode)
            if not session or (public_session_id and str(session.get('id') or '').strip() != public_session_id):
                raise serializers.ValidationError({'public_session_id': 'Sesi public training yang dipilih tidak ditemukan.'})
            return offer_type, str(session.get('delivery_mode') or offer_mode or '').strip().lower(), str(session.get('id') or public_session_id).strip()

        raise serializers.ValidationError({'offer_type': 'Jenis transaksi ini belum mendukung keranjang.'})

    def list(self, request):
        cart, created = Cart.objects.get_or_create(user=request.user)
        from .serializers import CartSerializer
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        try:
            if not request.user.is_authenticated:
                return Response({'error': 'User not authenticated'}, status=401)

            cart, _ = Cart.objects.get_or_create(user=request.user)
            course_id = request.data.get('course_id')

            if not course_id:
                return Response({'error': 'course_id required'}, status=400)

            course = get_object_or_404(Course, id=course_id)
            offer_type, offer_mode, public_session_id = self._normalize_cart_offer(course, request.data)
            total_amount = get_order_total_amount(
                course,
                offer_type=offer_type,
                public_session_id=public_session_id,
                offer_mode=offer_mode,
            )
            if total_amount is None:
                return Response({'error': 'Harga paket yang dipilih tidak valid'}, status=400)

            item, created = CartItem.objects.get_or_create(
                cart=cart,
                course=course,
                offer_type=offer_type,
                offer_mode=offer_mode,
                public_session_id=public_session_id,
            )

            if not created:
                return Response({'message': 'Item already in cart'}, status=200)

            return Response({'message': 'Item added to cart'}, status=201)
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=400)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        item_id = request.data.get('item_id')
        if item_id:
            CartItem.objects.filter(cart=cart, id=item_id).delete()
            return Response({'message': 'Item removed from cart'}, status=200)

        course_id = request.data.get('course_id')
        if not course_id:
            return Response({'error': 'item_id or course_id required'}, status=400)

        offer_type = (request.data.get('offer_type') or '').strip().lower()
        offer_mode = (request.data.get('offer_mode') or '').strip().lower()
        public_session_id = (request.data.get('public_session_id') or '').strip()

        filters = {'cart': cart, 'course_id': course_id}
        if offer_type:
            filters['offer_type'] = offer_type
        if offer_mode:
            filters['offer_mode'] = offer_mode
        if public_session_id:
            filters['public_session_id'] = public_session_id

        CartItem.objects.filter(**filters).delete()
        return Response({'message': 'Item removed from cart'}, status=200)

class QuizAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.get(id=lesson_id)
            if not hasattr(lesson, 'quiz_data'):
                return Response({'error': 'Quiz not found for this lesson'}, status=404)
            
            quiz = lesson.quiz_data
            gamification_before = get_user_gamification_summary(request.user)
            
            # Check enrollment
            if not _has_lesson_access(request.user, lesson):
                return Response({'error': 'Anda harus terdaftar untuk mengikuti assessment ini.'}, status=403)
            
            user_answers = request.data.get('answers', {}) # {question_id: alternative_id}
            
            questions = quiz.questions.all()
            total_questions = questions.count()
            if total_questions == 0:
                return Response({'error': 'Quiz has no questions'}, status=400)
                
            correct_count = 0
            for question in questions:
                answer_value = user_answers.get(str(question.id))
                if question.question_type == Question.QUESTION_TYPE_SHORT_ANSWER:
                    submitted_answer = ' '.join(str(answer_value or '').strip().lower().split())
                    correct_answer = ' '.join((question.correct_answer or '').strip().lower().split())
                    if submitted_answer and correct_answer and submitted_answer == correct_answer:
                        correct_count += 1
                elif answer_value:
                    correct_alt = question.alternatives.filter(is_correct=True).first()
                    if correct_alt and str(correct_alt.id) == str(answer_value):
                        correct_count += 1
            
            score = (correct_count / total_questions) * 100
            
            attempt = UserQuizAttempt.objects.create(
                user=request.user,
                quiz=quiz,
                score=score
            )
            gamification_after = get_user_gamification_summary(request.user)
            
            return Response({
                'score': score,
                'pass_score': quiz.pass_score,
                'is_passed': score >= quiz.pass_score,
                'correct_answers': correct_count,
                'total_questions': total_questions,
                'gamification': _build_gamification_action_payload(gamification_before, gamification_after),
            })
            
        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class PostTestFeedbackView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_feedback_payload(self, feedback):
        if not feedback:
            return {
                'has_feedback': False,
                'id': None,
                'criticism': '',
                'suggestion': '',
                'created_at': None,
                'updated_at': None,
            }

        payload = CourseFeedbackSerializer(feedback).data
        payload['has_feedback'] = True
        return payload

    def _get_lesson(self, lesson_id):
        lesson = get_object_or_404(Lesson.objects.select_related('course'), pk=lesson_id)
        if lesson.type != 'final_test':
            raise serializers.ValidationError({'error': 'Feedback hanya tersedia setelah post-test.'})
        return lesson

    def get(self, request, lesson_id):
        try:
            lesson = self._get_lesson(lesson_id)
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=400)

        if not _has_lesson_access(request.user, lesson):
            return Response({'error': 'Anda harus terdaftar untuk mengakses feedback post-test ini.'}, status=403)

        feedback = CourseFeedback.objects.filter(course=lesson.course, user=request.user).select_related(
            'user', 'lesson', 'quiz_attempt'
        ).first()
        return Response(self._get_feedback_payload(feedback))

    def post(self, request, lesson_id):
        try:
            lesson = self._get_lesson(lesson_id)
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=400)

        if not _has_lesson_access(request.user, lesson):
            return Response({'error': 'Anda harus terdaftar untuk mengirim feedback post-test ini.'}, status=403)

        latest_attempt = UserQuizAttempt.objects.filter(
            user=request.user,
            quiz__lesson=lesson,
        ).select_related('quiz__lesson').order_by('-completed_at', '-id').first()
        if not latest_attempt:
            return Response({'error': 'Selesaikan post-test terlebih dahulu sebelum mengirim kritik dan saran.'}, status=400)

        serializer = CourseFeedbackSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        feedback, created = CourseFeedback.objects.update_or_create(
            course=lesson.course,
            user=request.user,
            defaults={
                'lesson': lesson,
                'quiz_attempt': latest_attempt,
                'criticism': serializer.validated_data['criticism'],
                'suggestion': serializer.validated_data['suggestion'],
            }
        )

        response_serializer = CourseFeedbackSerializer(feedback)
        payload = response_serializer.data
        payload['has_feedback'] = True
        return Response(payload, status=201 if created else 200)


class CourseFeedbackListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_slug):
        course = _get_course_by_lookup(course_slug)
        if not _can_manage_course(request.user, course):
            return Response({'error': 'Anda tidak memiliki akses ke feedback course ini.'}, status=403)

        feedback_entries = CourseFeedback.objects.filter(course=course).select_related(
            'user', 'lesson', 'quiz_attempt'
        )
        serializer = CourseFeedbackSerializer(feedback_entries, many=True)
        return Response({
            'course': {
                'id': course.id,
                'title': course.title,
                'slug': course.slug,
            },
            'count': feedback_entries.count(),
            'results': serializer.data,
        })

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        # Ensure profile exists
        UserProfile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        # Extract data and files
        data = request.data.copy()
        
        # Prepare nested profile data
        profile_data = {}
        
        # 1. Handle if 'profile' is sent as JSON string
        if 'profile' in data and isinstance(data['profile'], str):
            try:
                profile_data = json.loads(data['profile'])
            except:
                pass
        elif 'profile' in data and isinstance(data['profile'], dict):
            profile_data = data['profile']

        # 2. Extract flat profile fields from main data
        profile_fields = [
            'phone', 'company', 'position', 'bio',
            'npwp', 'bank_name', 'bank_account_number', 'bank_account_holder',
        ]
        for field in profile_fields:
            if field in data:
                profile_data[field] = data.get(field)
        
        # 3. Add avatar from FILES
        if 'avatar' in request.FILES:
            profile_data['avatar'] = request.FILES['avatar']

        # Create a clean dict for serializer
        serializer_data = {
            'email': data.get('email'),
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name'),
            'profile': profile_data
        }
        if 'signature_image' in request.FILES:
            serializer_data['instructor_signature_image'] = request.FILES['signature_image']

        # Remove None values to allow partial update
        serializer_data = {k: v for k, v in serializer_data.items() if v is not None}

        serializer = ProfileSerializer(request.user, data=serializer_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class CompleteLessonView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.get(id=lesson_id)
            gamification_before = get_user_gamification_summary(request.user)
            
            # Check enrollment
            if not _has_lesson_access(request.user, lesson):
                return Response({'error': 'Anda harus terdaftar untuk menandai materi atau assessment ini.'}, status=403)
            
            progress, created = UserLessonProgress.objects.get_or_create(
                user=request.user,
                lesson=lesson,
                defaults={'is_completed': True}
            )
            
            if not created:
                progress.is_completed = True
                progress.save()
            gamification_after = get_user_gamification_summary(request.user)
            
            return Response({
                'status': 'success',
                'is_completed': True,
                'gamification': _build_gamification_action_payload(gamification_before, gamification_after),
            })
            
        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class AccessLessonView(APIView):
    """
    Endpoint strictly for recording that a user has opened a lesson,
    so we can know the LAST accessed lesson for 'Lanjut Belajar'.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.get(id=lesson_id)
            
            if not _has_lesson_access(request.user, lesson):
                return Response({'error': 'Anda harus terdaftar untuk mengakses materi atau assessment ini.'}, status=403)
            
            progress, created = UserLessonProgress.objects.get_or_create(
                user=request.user,
                lesson=lesson
            )
            # Just hitting save updates the auto_now=True updated_at field, moving it to top.
            progress.save()
            
            return Response({'status': 'success'})
        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
