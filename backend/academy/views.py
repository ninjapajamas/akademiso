import json

from rest_framework import viewsets, generics, serializers
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import (
    Category, Instructor, Course, Order, Lesson, Section, UserProfile, 
    Quiz, Question, Alternative, UserQuizAttempt, UserLessonProgress,
    CertificationExam, CertificationQuestion, CertificationAlternative, 
    CertificationInstructorSlot, CertificationAttempt, CertificationAnswer, Certificate, CertificateTemplate, WebinarAttendance,
    InhouseTrainingRequest, CourseDiscussionTopic, CourseDiscussionComment,
    ORDER_OFFER_ELEARNING, STAFF_ROLE_ACCOUNTANT, STAFF_ROLE_ADMIN, has_elearning_access,
    get_staff_role, get_user_role
)
from .serializers import (
    CategorySerializer, InstructorSerializer, CourseSerializer, OrderSerializer, 
    RegisterSerializer, LessonSerializer, SectionSerializer, ProfileSerializer,
    CertificationExamSerializer, CertificationQuestionSerializer, CertificationAlternativeSerializer,
    CertificationInstructorSlotSerializer, CertificationAttemptSerializer, CertificationAnswerSerializer,
    CertificateSerializer, CertificateTemplateSerializer, WebinarAttendanceSerializer, InhouseTrainingRequestSerializer,
    CourseDiscussionTopicSerializer, CourseDiscussionCommentSerializer
)
from .certificates import generate_certificate_pdf
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser, BasePermission, SAFE_METHODS
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from datetime import datetime
from django.db import transaction
from django.db.models import Sum, Count, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
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


def _can_manage_course(user, course):
    if not user.is_authenticated:
        return False
    if get_user_role(user) == STAFF_ROLE_ADMIN:
        return True
    instructor = _get_instructor_for_user(user)
    return bool(instructor and course.instructor_id == instructor.id)


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
    return has_elearning_access(user, course)


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

    _ensure_webinar_certificate_pending(user, course)
    return attendance


def _sync_course_activity(queryset=None):
    now = timezone.now()
    base_queryset = queryset if queryset is not None else Course.objects.all()
    base_queryset.filter(type='course', scheduled_end_at__lt=now, is_active=True).update(is_active=False)
    base_queryset.filter(type='course', scheduled_end_at__gte=now, is_active=False).update(is_active=True)
    base_queryset.filter(type='course', scheduled_end_at__isnull=True, scheduled_at__lt=now, is_active=True).update(is_active=False)
    base_queryset.filter(type='course', scheduled_end_at__isnull=True, scheduled_at__gte=now, is_active=False).update(is_active=True)


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
        return {
            'id': question.id,
            'question_type': question.question_type,
            'text': question.text,
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
        lessons = self._get_manageable_lessons(request.user)

        if content_type == 'questions':
            questions = Question.objects.filter(quiz__lesson__in=lessons).select_related(
                'quiz__lesson__course'
            ).prefetch_related('alternatives').order_by(
                'quiz__lesson__course__title',
                'quiz__lesson__title',
                'order',
                'id',
            )
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
            get_user_role(user) == STAFF_ROLE_ADMIN or bool(_get_instructor_for_user(user))
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


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related('user', 'course').order_by('-created_at')
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
        return Order.objects.filter(
            user=self.request.user,
            status='Completed',
            offer_type=ORDER_OFFER_ELEARNING,
        ).order_by('-created_at')

    def get_serializer_class(self):
        from .serializers import MyCourseSerializer
        return MyCourseSerializer


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

        return Response({
            'total_users': total_users,
            'total_courses': total_courses,
            'total_instructors': total_instructors,
            'active_courses': active_courses,
            'inhouse_requests': inhouse_requests,
            'pending_certificates': pending_certificates,
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
            instructor=Sum('instructor_earning_amount'),
        )
        revenue = completed_summary['gross'] or 0
        platform_revenue = completed_summary['platform'] or 0
        instructor_payout = completed_summary['instructor'] or 0

        recent_orders = Order.objects.select_related('user', 'course').order_by('-created_at')[:5]
        recent = [
            {
                'id': o.id,
                'user': o.user.username,
                'course': o.course.title,
                'amount': str(o.total_amount),
                'platform_fee_amount': str(o.platform_fee_amount),
                'instructor_earning_amount': str(o.instructor_earning_amount),
                'status': o.status,
                'created_at': o.created_at.strftime('%d %b %Y'),
            }
            for o in recent_orders
        ]

        return Response({
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'pending_orders': pending_orders,
            'cancelled_orders': cancelled_orders,
            'revenue': float(revenue),
            'platform_revenue': float(platform_revenue),
            'instructor_payout': float(instructor_payout),
            'recent_orders': recent,
        })


# ── Instructor Portal ────────────────────────────────────────────────────────
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

class CertificationQuestionViewSet(viewsets.ModelViewSet):
    queryset = CertificationQuestion.objects.all()
    serializer_class = CertificationQuestionSerializer
    permission_classes = [IsInstructorOrAdmin]

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

        if not has_elearning_access(user, exam.course):
            return Response({'error': 'Anda harus terdaftar pada pelatihan ini untuk mengikuti ujian akhir.'}, status=403)

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
                attempt = serializer.save(user=user, status=attempt_status, interview_slot=locked_slot)
            else:
                attempt = serializer.save(user=user, status=attempt_status)

        output_serializer = self.get_serializer(attempt)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=201, headers=headers)

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
                    slot.save()
                    attempt.interview_slot = slot
        
        attempt.status = 'SUBMITTED'
        attempt.submitted_at = timezone.now()
        
        # Simple Auto-grading for MC
        total_points = sum(q.points for q in questions)
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
        
        if not requires_manual_review and attempt.score >= passing_percentage:
            attempt.status = 'GRADED'
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
        elif not requires_manual_review:
            attempt.status = 'GRADED'
             
        attempt.save()
        
        return Response({'status': 'exam submitted'})

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
            approval_status=Certificate.APPROVAL_APPROVED,
        ).select_related('course', 'course__instructor', 'exam', 'user', 'approved_by', 'template')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        for certificate in queryset:
            if certificate.approval_status == Certificate.APPROVAL_APPROVED:
                generate_certificate_pdf(certificate)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.approval_status == Certificate.APPROVAL_APPROVED:
            generate_certificate_pdf(instance)
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
                generate_certificate_pdf(certificate, force=True)
                certificate.save(update_fields=['template', 'certificate_url'])
            serializer = self.get_serializer(certificate)
            return Response(serializer.data)

        certificate.approval_status = Certificate.APPROVAL_APPROVED
        certificate.approved_by = request.user
        certificate.approved_at = timezone.now()
        generate_certificate_pdf(certificate, force=True)
        certificate.save(update_fields=['approval_status', 'approved_by', 'approved_at', 'certificate_url', 'template'])
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
            return Response({'courses': [], 'instructor': None, 'total_students': 0, 'total_courses': 0})

        _sync_course_activity(Course.objects.filter(instructor=instructor))
        courses = Course.objects.filter(instructor=instructor).order_by('-created_at')
        serializer = CourseSerializer(courses, many=True)

        total_students = Order.objects.filter(
            course__instructor=instructor
        ).values('user').distinct().count()

        return Response({
            'instructor': InstructorSerializer(instructor).data,
            'courses': serializer.data,
            'total_students': total_students,
            'total_courses': courses.count(),
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
        if requested_staff_role not in [None, '', STAFF_ROLE_ADMIN, STAFF_ROLE_ACCOUNTANT]:
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
            item, created = CartItem.objects.get_or_create(cart=cart, course=course)

            if not created:
                return Response({'message': 'Item already in cart'}, status=200)

            return Response({'message': 'Item added to cart'}, status=201)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        course_id = request.data.get('course_id')

        if not course_id:
            return Response({'error': 'course_id required'}, status=400)

        CartItem.objects.filter(cart=cart, course_id=course_id).delete()
        return Response({'message': 'Item removed from cart'}, status=200)

class QuizAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.get(id=lesson_id)
            if not hasattr(lesson, 'quiz_data'):
                return Response({'error': 'Quiz not found for this lesson'}, status=404)
            
            quiz = lesson.quiz_data
            
            # Check enrollment
            if not has_elearning_access(request.user, lesson.course):
                return Response({'error': 'You must be enrolled to take this quiz'}, status=403)
            
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
            
            return Response({
                'score': score,
                'pass_score': quiz.pass_score,
                'is_passed': score >= quiz.pass_score,
                'correct_answers': correct_count,
                'total_questions': total_questions
            })
            
        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

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
        profile_fields = ['phone', 'company', 'position', 'bio']
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
            
            # Check enrollment
            if not has_elearning_access(request.user, lesson.course):
                return Response({'error': 'You must be enrolled to complete this lesson'}, status=403)
            
            progress, created = UserLessonProgress.objects.get_or_create(
                user=request.user,
                lesson=lesson,
                defaults={'is_completed': True}
            )
            
            if not created:
                progress.is_completed = True
                progress.save()
            
            return Response({'status': 'success', 'is_completed': True})
            
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
            
            if not has_elearning_access(request.user, lesson.course):
                return Response({'error': 'You must be enrolled to access this lesson'}, status=403)
            
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
