import json
from pathlib import Path
from decimal import Decimal
from django.utils import timezone

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import (
    Category, Instructor, Course, Project, ProjectAssignment, Lesson, Order, Cart, CartItem, Section, UserProfile, 
    ReferralCode,
    Quiz, Question, Alternative, UserQuizAttempt, UserLessonProgress, CourseFeedback,
    CertificationExam, CertificationQuestion, CertificationAlternative, 
    CertificationInstructorSlot, CertificationAttempt, CertificationAnswer, Certificate, CertificateTemplate, WebinarAttendance,
    InhouseTrainingRequest, CourseDiscussionTopic, CourseDiscussionComment, StudentAccessLink, StudentAccessLinkClaim,
    InstructorWithdrawalRequest,
    AFFILIATE_STATUS_APPROVED, AFFILIATE_STATUS_PENDING, AFFILIATE_STATUS_REJECTED, AFFILIATE_STATUS_NONE,
    ORDER_OFFER_CHOICES, ORDER_OFFER_ELEARNING, ORDER_OFFER_PUBLIC,
    REFERRAL_DISCOUNT_FIXED, REFERRAL_DISCOUNT_PERCENT,
    STAFF_ROLE_ADMIN, STAFF_ROLE_CHOICES, STAFF_ROLE_PROJECT_MANAGER, WITHDRAWAL_STATUS_APPROVED, WITHDRAWAL_STATUS_PAID,
    WITHDRAWAL_STATUS_PENDING, WITHDRAWAL_STATUS_REJECTED, apply_referral_discount, generate_unique_referral_code,
    get_order_total_amount, get_public_session, get_staff_role, get_user_role,
    has_assessment_access, has_elearning_access, parse_money_value
)
from django.contrib.auth.models import User
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .certificates import build_certificate_number, get_certificate_title

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        role = get_user_role(user)
        token['role'] = role
        token['staff_role'] = get_staff_role(user) or ''
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['is_instructor'] = role == 'instructor'
        token['username'] = user.username
        token['email'] = user.email or ''
        return token

    def validate(self, attrs):
        identifier = (attrs.get(self.username_field) or '').strip()
        password = attrs.get('password') or ''

        if not identifier:
            raise serializers.ValidationError({
                self.username_field: 'Username atau email wajib diisi.'
            })

        if not password:
            raise serializers.ValidationError({
                'password': 'Password wajib diisi.'
            })

        matched_user = User.objects.filter(
            Q(email__iexact=identifier) | Q(username__iexact=identifier)
        ).only('username', 'is_active').first()

        if not matched_user:
            raise serializers.ValidationError({
                self.username_field: 'Username atau email tidak terdaftar.'
            })

        if not matched_user.is_active:
            raise serializers.ValidationError({
                self.username_field: 'Akun Anda sedang tidak aktif. Silakan hubungi admin.'
            })

        authenticated_user = authenticate(
            request=self.context.get('request'),
            username=matched_user.username,
            password=password,
        )
        if not authenticated_user:
            raise serializers.ValidationError({
                'password': 'Password yang Anda masukkan salah.'
            })

        attrs[self.username_field] = matched_user.username
        return super().validate(attrs)

class RegisterSerializer(serializers.ModelSerializer):
    ACCOUNT_TYPE_STUDENT = 'student'
    ACCOUNT_TYPE_INSTRUCTOR = 'instructor'
    ACCOUNT_TYPE_CHOICES = [
        (ACCOUNT_TYPE_STUDENT, 'Student'),
        (ACCOUNT_TYPE_INSTRUCTOR, 'Instructor'),
    ]

    username = serializers.CharField(
        required=True,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message='Username ini sudah digunakan. Silakan pilih username lain.'
            )
        ]
    )
    email = serializers.EmailField(
        required=True,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message='Email ini sudah terdaftar. Gunakan email lain atau masuk ke akun Anda.'
            )
        ]
    )
    password = serializers.CharField(write_only=True, required=True)
    password_confirm = serializers.CharField(write_only=True, required=True)
    is_staff = serializers.BooleanField(write_only=True, required=False, default=False)
    staff_role = serializers.ChoiceField(choices=STAFF_ROLE_CHOICES, write_only=True, required=False, allow_null=True)
    account_type = serializers.ChoiceField(choices=ACCOUNT_TYPE_CHOICES, write_only=True, required=False, default=ACCOUNT_TYPE_STUDENT)
    instructor_title = serializers.CharField(write_only=True, required=False, allow_blank=True)
    instructor_bio = serializers.CharField(write_only=True, required=False, allow_blank=True)
    instructor_cv = serializers.FileField(write_only=True, required=False, allow_null=True)
    terms_accepted = serializers.BooleanField(write_only=True, required=True)
    affiliate_application = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = User
        fields = (
            'username', 'email', 'password', 'password_confirm', 'first_name', 'last_name',
            'is_staff', 'staff_role', 'account_type',
            'instructor_title', 'instructor_bio', 'instructor_cv', 'terms_accepted', 'affiliate_application'
        )

    def validate(self, attrs):
        attrs['username'] = (attrs.get('username') or '').strip()
        attrs['email'] = (attrs.get('email') or '').strip().lower()
        attrs['first_name'] = (attrs.get('first_name') or '').strip()
        attrs['last_name'] = (attrs.get('last_name') or '').strip()

        if len(attrs.get('username', '')) < 3:
            raise serializers.ValidationError({
                'username': 'Username minimal 3 karakter.'
            })

        if ' ' in attrs.get('username', ''):
            raise serializers.ValidationError({
                'username': 'Username tidak boleh mengandung spasi.'
            })

        if len(attrs.get('password', '')) < 6:
            raise serializers.ValidationError({
                'password': 'Password minimal 6 karakter.'
            })

        if not attrs.get('terms_accepted'):
            raise serializers.ValidationError({
                'terms_accepted': 'Anda harus menyetujui syarat dan ketentuan untuk melanjutkan pendaftaran.'
            })

        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Konfirmasi password tidak cocok.'
            })

        if attrs.get('account_type') == self.ACCOUNT_TYPE_INSTRUCTOR:
            if not (attrs.get('first_name') or '').strip():
                raise serializers.ValidationError({"first_name": "Nama depan wajib diisi untuk pendaftaran instruktur."})
            if not (attrs.get('instructor_title') or '').strip():
                raise serializers.ValidationError({"instructor_title": "Keahlian atau jabatan instruktur wajib diisi."})
            if not (attrs.get('instructor_bio') or '').strip():
                raise serializers.ValidationError({"instructor_bio": "Ringkasan profil trainer wajib diisi."})
            if not attrs.get('instructor_cv'):
                raise serializers.ValidationError({"instructor_cv": "CV wajib diunggah untuk pendaftaran instruktur."})

        cv_file = attrs.get('instructor_cv')
        if cv_file:
            ext = Path(cv_file.name).suffix.lower()
            if ext not in {'.pdf', '.doc', '.docx'}:
                raise serializers.ValidationError({"instructor_cv": "CV harus berupa file PDF, DOC, atau DOCX."})
            if cv_file.size > 5 * 1024 * 1024:
                raise serializers.ValidationError({"instructor_cv": "Ukuran CV maksimal 5MB."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        requested_is_staff = validated_data.pop('is_staff', False)
        requested_staff_role = validated_data.pop('staff_role', None)
        account_type = validated_data.pop('account_type', self.ACCOUNT_TYPE_STUDENT)
        instructor_title = validated_data.pop('instructor_title', '')
        instructor_bio = validated_data.pop('instructor_bio', '')
        instructor_cv = validated_data.pop('instructor_cv', None)
        affiliate_application = bool(validated_data.pop('affiliate_application', False))
        validated_data.pop('terms_accepted', None)
        validated_data.pop('password_confirm', None)

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )

        request = self.context.get('request')
        can_create_staff = bool(request and request.user.is_authenticated and get_user_role(request.user) == STAFF_ROLE_ADMIN)
        if can_create_staff and (requested_is_staff or requested_staff_role):
            user.is_staff = True
            user.save(update_fields=['is_staff'])
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.staff_role = requested_staff_role or STAFF_ROLE_ADMIN
            profile.save(update_fields=['staff_role'])
        elif affiliate_application:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.affiliate_status = AFFILIATE_STATUS_PENDING
            profile.affiliate_requested_at = timezone.now()
            profile.affiliate_review_notes = 'Pengajuan otomatis saat pendaftaran akun.'
            profile.save(update_fields=['affiliate_status', 'affiliate_requested_at', 'affiliate_review_notes'])

        if account_type == self.ACCOUNT_TYPE_INSTRUCTOR:
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            Instructor.objects.create(
                user=user,
                name=full_name,
                title=instructor_title.strip(),
                bio=instructor_bio.strip(),
                cv=instructor_cv,
                approval_status=Instructor.APPROVAL_PENDING,
            )

        return user

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    staff_role = serializers.SerializerMethodField()
    is_instructor = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'role', 'staff_role', 'is_instructor']
        extra_kwargs = {'password': {'write_only': True}}

    def get_role(self, obj):
        return get_user_role(obj)

    def get_staff_role(self, obj):
        return get_staff_role(obj)

    def get_is_instructor(self, obj):
        return get_user_role(obj) == 'instructor'

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if instance.is_staff:
            if not profile.staff_role:
                profile.staff_role = STAFF_ROLE_ADMIN
                profile.save(update_fields=['staff_role'])
        elif profile.staff_role:
            profile.staff_role = None
            profile.save(update_fields=['staff_role'])

        return instance


class DiscussionAuthorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'avatar']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_avatar(self, obj):
        profile = getattr(obj, 'profile', None)
        request = self.context.get('request')
        if not profile or not profile.avatar:
            return None
        if request:
            return request.build_absolute_uri(profile.avatar.url)
        return profile.avatar.url


def build_absolute_media_url(request, url):
    if not url:
        return None
    if url.startswith('http://') or url.startswith('https://'):
        return url
    if request and url.startswith('/'):
        return request.build_absolute_uri(url)
    return url


def validate_discussion_attachment(value):
    if not value:
        return value

    ext = Path(value.name).suffix.lower()
    allowed_extensions = {
        '.jpg', '.jpeg', '.png', '.webp',
        '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    }
    if ext not in allowed_extensions:
        raise serializers.ValidationError('Lampiran diskusi harus berupa gambar, PDF, Word, PowerPoint, atau Excel.')

    if value.size > 10 * 1024 * 1024:
        raise serializers.ValidationError('Ukuran lampiran diskusi maksimal 10MB.')

    return value

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class InstructorSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    approved_by_name = serializers.SerializerMethodField()

    def to_internal_value(self, data):
        mutable_data = data.copy()
        expertise_value = mutable_data.get('expertise_areas')
        if isinstance(expertise_value, str):
            try:
                mutable_data['expertise_areas'] = json.loads(expertise_value)
            except (TypeError, ValueError, json.JSONDecodeError):
                pass
        return super().to_internal_value(mutable_data)

    def validate_expertise_areas(self, value):
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Bidang trainer harus berupa daftar.')
        normalized_values = []
        seen = set()
        for item in value:
            normalized_item = str(item or '').strip()
            if not normalized_item:
                continue
            key = normalized_item.lower()
            if key in seen:
                continue
            seen.add(key)
            normalized_values.append(normalized_item)
        return normalized_values

    def get_approved_by_name(self, obj):
        if not obj.approved_by:
            return None
        full_name = f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip()
        return full_name or obj.approved_by.username

    class Meta:
        model = Instructor
        fields = '__all__'
        read_only_fields = ('approved_by', 'approved_at')


class ProjectAssignmentSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.name', read_only=True)
    instructor_title = serializers.CharField(source='instructor.title', read_only=True)
    instructor_user_id = serializers.IntegerField(source='instructor.user_id', read_only=True)
    assigned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectAssignment
        fields = [
            'id', 'instructor', 'instructor_name', 'instructor_title', 'instructor_user_id',
            'assigned_by', 'assigned_by_name', 'status', 'role_label', 'notes',
            'assigned_at', 'updated_at', 'completed_at',
        ]
        read_only_fields = ['assigned_by', 'assigned_at', 'updated_at', 'completed_at']

    def get_assigned_by_name(self, obj):
        if not obj.assigned_by:
            return None
        return f"{obj.assigned_by.first_name} {obj.assigned_by.last_name}".strip() or obj.assigned_by.username


class ProjectSerializer(serializers.ModelSerializer):
    assignments = ProjectAssignmentSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    related_course_title = serializers.CharField(source='related_course.title', read_only=True)
    assigned_instructor_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    assignment_count = serializers.SerializerMethodField()
    completed_assignment_count = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    priority_label = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'client_name', 'description', 'deliverables',
            'status', 'status_label', 'priority', 'priority_label',
            'start_date', 'due_date', 'related_course', 'related_course_title',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'assigned_instructor_ids', 'assignments', 'assignment_count',
            'completed_assignment_count', 'is_overdue',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username

    def get_assignment_count(self, obj):
        prefetched = getattr(obj, 'assignments', None)
        if prefetched is not None and hasattr(prefetched, 'all'):
            return prefetched.all().count()
        return obj.assignments.count()

    def get_completed_assignment_count(self, obj):
        prefetched = getattr(obj, 'assignments', None)
        if prefetched is not None and hasattr(prefetched, 'all'):
            return sum(1 for assignment in prefetched.all() if assignment.status == ProjectAssignment.STATUS_COMPLETED)
        return obj.assignments.filter(status=ProjectAssignment.STATUS_COMPLETED).count()

    def get_is_overdue(self, obj):
        return bool(
            obj.due_date
            and obj.due_date < timezone.localdate()
            and obj.status not in [Project.STATUS_COMPLETED, Project.STATUS_CANCELLED]
        )

    def validate_assigned_instructor_ids(self, value):
        normalized_ids = list(dict.fromkeys(int(item) for item in value))
        if not normalized_ids:
            return []

        matched_ids = set(Instructor.objects.filter(
            id__in=normalized_ids,
            approval_status=Instructor.APPROVAL_APPROVED,
        ).values_list('id', flat=True))
        missing_ids = [item for item in normalized_ids if item not in matched_ids]
        if missing_ids:
            raise serializers.ValidationError(
                f"Trainer berikut tidak tersedia atau belum disetujui: {', '.join(str(item) for item in missing_ids)}."
            )
        return normalized_ids

    def validate(self, attrs):
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        due_date = attrs.get('due_date', getattr(self.instance, 'due_date', None))
        if start_date and due_date and due_date < start_date:
            raise serializers.ValidationError({
                'due_date': 'Tanggal target selesai harus sama atau setelah tanggal mulai.'
            })
        return attrs

    def _sync_assignments(self, project, instructor_ids):
        if instructor_ids is None:
            return

        existing_assignments = {
            assignment.instructor_id: assignment
            for assignment in project.assignments.all()
        }
        target_ids = set(instructor_ids)

        for instructor_id, assignment in existing_assignments.items():
            if instructor_id not in target_ids:
                assignment.delete()

        request = self.context.get('request')
        acting_user = request.user if request and request.user.is_authenticated else None
        for instructor_id in instructor_ids:
            if instructor_id in existing_assignments:
                continue
            ProjectAssignment.objects.create(
                project=project,
                instructor_id=instructor_id,
                assigned_by=acting_user,
            )

    @transaction.atomic
    def create(self, validated_data):
        assigned_instructor_ids = validated_data.pop('assigned_instructor_ids', [])
        request = self.context.get('request')
        created_by = validated_data.pop('created_by', request.user if request else None)
        project = Project.objects.create(
            created_by=created_by,
            **validated_data,
        )
        self._sync_assignments(project, assigned_instructor_ids)
        return project

    @transaction.atomic
    def update(self, instance, validated_data):
        assigned_instructor_ids = validated_data.pop('assigned_instructor_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        self._sync_assignments(instance, assigned_instructor_ids)
        return instance

class AlternativeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alternative
        fields = ['id', 'text', 'is_correct', 'order']

class QuestionSerializer(serializers.ModelSerializer):
    alternatives = AlternativeSerializer(many=True, required=False)
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    class Meta:
        model = Question
        fields = ['id', 'question_type', 'text', 'image', 'image_url', 'correct_answer', 'order', 'alternatives']

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Quiz
        fields = ['id', 'pass_score', 'time_limit', 'questions']

class LessonSerializer(serializers.ModelSerializer):
    quiz_data = QuizSerializer(required=False)
    is_completed = serializers.SerializerMethodField()
    attachment_name = serializers.SerializerMethodField()

    def get_is_completed(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        has_full_access = bool(user and user.is_authenticated and has_elearning_access(user, obj.course))
        has_assessment_only_access = bool(
            user
            and user.is_authenticated
            and obj.type in ['quiz', 'mid_test', 'final_test', 'exam']
            and has_assessment_access(user, obj.course)
        )
        if has_full_access or has_assessment_only_access:
            return UserLessonProgress.objects.filter(user=user, lesson=obj, is_completed=True).exists()
        return False

    class Meta:
        model = Lesson
        fields = [
            'id', 'course', 'section', 'title', 'type', 'content', 'video_url', 'image',
            'attachment', 'attachment_name', 'duration', 'order', 'quiz_data', 'is_completed'
        ]

    def get_attachment_name(self, obj):
        if not obj.attachment:
            return ''
        return Path(obj.attachment.name).name

    def validate_attachment(self, value):
        if not value:
            return value

        ext = Path(value.name).suffix.lower()
        allowed_extensions = {'.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'}
        if ext not in allowed_extensions:
            raise serializers.ValidationError('Lampiran harus berupa PDF, Word, PowerPoint, atau Excel.')

        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('Ukuran lampiran maksimal 10MB.')

        return value

    def to_internal_value(self, data):
        # Support for JSON string if sent via FormData
        if 'quiz_data' in data and isinstance(data['quiz_data'], str):
            import json
            try:
                mutable_data = data.dict() if hasattr(data, 'dict') else data.copy()
                mutable_data['quiz_data'] = json.loads(data['quiz_data'])
                return super().to_internal_value(mutable_data)
            except (ValueError, TypeError, json.JSONDecodeError):
                pass
        return super().to_internal_value(data)

    def _get_question_image_file(self, client_id):
        if not client_id:
            return None
        request = self.context.get('request')
        files = getattr(request, 'FILES', None)
        if not files:
            return None
        return files.get(f'question_image_{client_id}')

    def _resolve_source_question_image(self, source_question_id):
        if not source_question_id:
            return None
        source_question = Question.objects.filter(id=source_question_id).first()
        if not source_question or not source_question.image:
            return None
        return source_question.image

    def _sync_question_alternatives(self, question, alternatives_data):
        question.alternatives.all().delete()
        if question.question_type == Question.QUESTION_TYPE_MULTIPLE_CHOICE:
            for alternative_data in alternatives_data:
                Alternative.objects.create(question=question, **alternative_data)

    def _create_or_update_quiz_questions(self, quiz, questions_data):
        existing_questions = {question.id: question for question in quiz.questions.all()}
        retained_question_ids = []

        for index, raw_question_data in enumerate(questions_data):
            question_data = dict(raw_question_data)
            alternatives_data = question_data.pop('alternatives', [])
            question_id = question_data.pop('id', None)
            client_id = question_data.pop('client_id', None) or f'question-{index}'
            source_question_id = question_data.pop('source_question_id', None)
            clear_image = bool(question_data.pop('clear_image', False))
            image_file = self._get_question_image_file(client_id)

            if question_id and question_id in existing_questions:
                question = existing_questions[question_id]
                for attr, value in question_data.items():
                    setattr(question, attr, value)
                if image_file:
                    question.image = image_file
                elif clear_image:
                    question.image = None
                question.save()
            else:
                question = Question.objects.create(quiz=quiz, **question_data)
                if image_file:
                    question.image = image_file
                elif source_question_id:
                    copied_image = self._resolve_source_question_image(source_question_id)
                    if copied_image:
                        question.image = copied_image
                if image_file or source_question_id:
                    question.save(update_fields=['image'])

            retained_question_ids.append(question.id)
            self._sync_question_alternatives(question, alternatives_data)

        stale_question_ids = [question_id for question_id in existing_questions if question_id not in retained_question_ids]
        if stale_question_ids:
            Question.objects.filter(id__in=stale_question_ids).delete()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = request.user if request else None

        has_full_access = False
        has_assessment_only_access = False
        if user and user.is_authenticated:
            has_full_access = has_elearning_access(user, instance.course)
            has_assessment_only_access = (
                not has_full_access
                and instance.type in ['quiz', 'mid_test', 'final_test', 'exam']
                and has_assessment_access(user, instance.course)
            )

        if not has_full_access and not has_assessment_only_access:
            data['content'] = "Konten ini hanya tersedia untuk peserta yang sudah terdaftar."
            data['video_url'] = None
            data['attachment'] = None
            data['attachment_name'] = ''
            data['is_locked'] = True
            if 'quiz_data' in data:
                data['quiz_data'] = None
        else:
            data['is_locked'] = False
            if data.get('quiz_data') and get_user_role(user) not in {STAFF_ROLE_ADMIN, 'instructor'}:
                for question in data['quiz_data'].get('questions', []):
                    question.pop('correct_answer', None)
                    for alternative in question.get('alternatives', []):
                        alternative.pop('is_correct', None)
            
        return data

    def create(self, validated_data):
        quiz_data = validated_data.pop('quiz_data', None)
        lesson = Lesson.objects.create(**validated_data)
        
        if quiz_data and lesson.type in ['quiz', 'mid_test', 'final_test', 'exam']:
            questions_data = quiz_data.pop('questions', [])
            quiz = Quiz.objects.create(lesson=lesson, **quiz_data)
            self._create_or_update_quiz_questions(quiz, questions_data)
        
        return lesson

    def update(self, instance, validated_data):
        quiz_data = validated_data.pop('quiz_data', None)
        
        # Update lesson fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if quiz_data and instance.type in ['quiz', 'mid_test', 'final_test', 'exam']:
            questions_data = quiz_data.pop('questions', [])
            
            # Update or create Quiz
            quiz, _ = Quiz.objects.get_or_create(lesson=instance)
            quiz.pass_score = quiz_data.get('pass_score', quiz.pass_score)
            quiz.time_limit = quiz_data.get('time_limit', quiz.time_limit)
            quiz.save()
            
            self._create_or_update_quiz_questions(quiz, questions_data)
                    
        return instance

class SectionSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'course', 'title', 'order', 'lessons']

class CourseSerializer(serializers.ModelSerializer):
    instructor = InstructorSerializer(read_only=True)
    instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=Instructor.objects.all(), source='instructor', write_only=True
    )
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, allow_null=True
    )
    sections = SectionSerializer(many=True, read_only=True)
    is_enrolled = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    last_accessed_lesson_id = serializers.SerializerMethodField()
    certification_exams = serializers.SerializerMethodField()
    webinar_attendance = serializers.SerializerMethodField()
    attendance_summary = serializers.SerializerMethodField()
    discussion_summary = serializers.SerializerMethodField()

    def to_internal_value(self, data):
        if hasattr(data, 'lists'):
            mutable_data = {
                key: values if len(values) > 1 else values[0]
                for key, values in data.lists()
            }
        else:
            mutable_data = data.copy()
        request = self.context.get('request')
        user = request.user if request else None

        if get_user_role(user) != STAFF_ROLE_ADMIN:
            mutable_data.pop('is_featured', None)

        for field_name in ['detail_sections', 'rundown_items', 'public_sessions', 'inhouse_training_benefits']:
            value = mutable_data.get(field_name)
            if isinstance(value, str):
                try:
                    mutable_data[field_name] = json.loads(value)
                except (TypeError, ValueError, json.JSONDecodeError):
                    if field_name == 'rundown_items':
                        normalized_lines = [line.replace('\r', '').rstrip() for line in value.split('\n')]
                        while normalized_lines and normalized_lines[0] == '':
                            normalized_lines.pop(0)
                        while normalized_lines and normalized_lines[-1] == '':
                            normalized_lines.pop()
                        mutable_data[field_name] = normalized_lines

        return super().to_internal_value(mutable_data)

    def get_certification_exams(self, obj):
        exams = obj.certification_exams.filter(is_active=True)
        return CertificationExamSerializer(exams, many=True).data

    def get_webinar_attendance(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if obj.type != 'webinar' or not user or not user.is_authenticated:
            return None

        if get_user_role(user) in {STAFF_ROLE_ADMIN, 'instructor'}:
            return None

        attendance = WebinarAttendance.objects.filter(course=obj, user=user).select_related('marked_by').first()
        order = Order.objects.filter(user=user, course=obj, status='Completed').order_by('-created_at').first()

        if not order:
            return None

        profile = getattr(user, 'profile', None)
        default_name = f"{user.first_name} {user.last_name}".strip() or user.username

        return {
            'attendee_name': attendance.attendee_name if attendance and attendance.attendee_name else default_name,
            'attendee_email': attendance.attendee_email if attendance and attendance.attendee_email else (user.email or ''),
            'attendee_phone': attendance.attendee_phone if attendance and attendance.attendee_phone else (getattr(profile, 'phone', '') or ''),
            'attendee_company': attendance.attendee_company if attendance and attendance.attendee_company else (getattr(profile, 'company', '') or ''),
            'attendee_position': attendance.attendee_position if attendance and attendance.attendee_position else (getattr(profile, 'position', '') or ''),
            'is_present': bool(attendance and attendance.is_present),
            'attended_at': attendance.attended_at if attendance else None,
            'certificate_status': Certificate.objects.filter(user=user, course=obj).values_list('approval_status', flat=True).first(),
            'marked_by_name': (
                f"{attendance.marked_by.first_name} {attendance.marked_by.last_name}".strip() or attendance.marked_by.username
            ) if attendance and attendance.marked_by else None,
            'notes': attendance.notes if attendance else None,
        }

    def get_attendance_summary(self, obj):
        request = self.context.get('request')
        user = request.user if request else None

        if obj.type != 'course' or not user or not user.is_authenticated:
            return None

        user_role = get_user_role(user)
        if user_role != STAFF_ROLE_ADMIN and user_role != 'instructor':
            return None

        order_user_ids = list(Order.objects.filter(
            course=obj,
            status='Completed',
            offer_type=ORDER_OFFER_ELEARNING,
        ).values_list('user_id', flat=True).distinct())

        total = len(order_user_ids)
        if total == 0:
            return {
                'total': 0,
                'present': 0,
                'absent': 0,
                'percentage': 0,
            }

        pre_test_users = set(UserQuizAttempt.objects.filter(
            user_id__in=order_user_ids,
            quiz__lesson__course=obj,
            quiz__lesson__type='mid_test',
        ).values_list('user_id', flat=True).distinct())
        post_test_users = set(UserQuizAttempt.objects.filter(
            user_id__in=order_user_ids,
            quiz__lesson__course=obj,
            quiz__lesson__type='final_test',
        ).values_list('user_id', flat=True).distinct())

        present = len(pre_test_users & post_test_users)
        absent = max(total - present, 0)
        percentage = round((present / total) * 100) if total else 0

        return {
            'total': total,
            'present': present,
            'absent': absent,
            'percentage': percentage,
        }

    def get_discussion_summary(self, obj):
        latest_topic = obj.discussion_topics.order_by('-updated_at').values('updated_at').first()
        topic_count = obj.discussion_topics.count()
        comment_count = CourseDiscussionComment.objects.filter(topic__course=obj).count()
        return {
            'topic_count': topic_count,
            'comment_count': comment_count,
            'latest_activity_at': latest_topic['updated_at'] if latest_topic else None,
            'has_active_discussion': topic_count > 0,
        }
    
    def get_is_enrolled(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
            return False
        return has_elearning_access(user, obj)
    
    
    def get_last_accessed_lesson_id(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated or not has_elearning_access(user, obj):
            return None
        
        last_progress = UserLessonProgress.objects.filter(
            user=user, 
            lesson__course=obj
        ).order_by('-updated_at').first()
        
        if last_progress:
            return last_progress.lesson.id
        return None

    def get_progress_percentage(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated or not has_elearning_access(user, obj):
            return 0
        
        total_lessons = Lesson.objects.filter(course=obj).count()
        if total_lessons == 0:
            return 0
            
        completed_lessons = UserLessonProgress.objects.filter(
            user=user, 
            lesson__course=obj, 
            is_completed=True
        ).count()
        
        return round((completed_lessons / total_lessons) * 100)

    def validate_detail_sections(self, value):
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Bagian detail pelatihan harus berupa array.')

        normalized_sections = []
        for index, section in enumerate(value):
            if not isinstance(section, dict):
                raise serializers.ValidationError(f'Bagian detail ke-{index + 1} harus berupa object.')

            items = section.get('items') or []
            if not isinstance(items, list):
                raise serializers.ValidationError(f'Daftar poin pada bagian detail ke-{index + 1} harus berupa array.')

            normalized_sections.append({
                'id': str(section.get('id') or f'section-{index + 1}'),
                'title': str(section.get('title') or '').strip(),
                'body': str(section.get('body') or '').strip(),
                'items': [str(item).strip() for item in items if str(item).strip()],
            })

        return normalized_sections

    def validate_rundown_items(self, value):
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Rundown pelatihan harus berupa array.')
        normalized_items = [str(item).replace('\r', '').rstrip() for item in value]
        while normalized_items and normalized_items[0] == '':
            normalized_items.pop(0)
        while normalized_items and normalized_items[-1] == '':
            normalized_items.pop()
        return normalized_items

    def validate_public_sessions(self, value):
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Jadwal public training harus berupa array.')

        normalized_sessions = []
        for index, session in enumerate(value):
            if not isinstance(session, dict):
                raise serializers.ValidationError(f'Jadwal public training ke-{index + 1} harus berupa object.')

            delivery_mode = str(session.get('delivery_mode') or 'online').lower()
            if delivery_mode not in ['online', 'offline']:
                raise serializers.ValidationError(f'Mode public training ke-{index + 1} harus online atau offline.')

            raw_price = session.get('price')
            if raw_price in [None, '', 'null']:
                normalized_price = ''
            else:
                try:
                    normalized_price = str(Decimal(str(raw_price)))
                except Exception as exc:
                    raise serializers.ValidationError(
                        f'Harga public training ke-{index + 1} tidak valid.'
                    ) from exc

            raw_discount_price = session.get('discount_price')
            if raw_discount_price in [None, '', 'null']:
                normalized_discount_price = ''
            else:
                try:
                    normalized_discount_price = str(Decimal(str(raw_discount_price)))
                except Exception as exc:
                    raise serializers.ValidationError(
                        f'Harga diskon public training ke-{index + 1} tidak valid.'
                    ) from exc

            if normalized_price and normalized_discount_price and Decimal(normalized_discount_price) >= Decimal(normalized_price):
                raise serializers.ValidationError(
                    f'Harga diskon public training ke-{index + 1} harus lebih kecil dari harga normal.'
                )

            normalized_sessions.append({
                'id': str(session.get('id') or f'public-session-{index + 1}'),
                'title': str(session.get('title') or '').strip(),
                'delivery_mode': delivery_mode,
                'schedule': str(session.get('schedule') or '').strip(),
                'location': str(session.get('location') or '').strip(),
                'duration': str(session.get('duration') or '').strip(),
                'price': normalized_price,
                'discount_price': normalized_discount_price,
                'badge': str(session.get('badge') or '').strip(),
                'cta_label': str(session.get('cta_label') or '').strip(),
                'cta_url': str(session.get('cta_url') or '').strip(),
            })

        return normalized_sessions

    def validate_inhouse_training_benefits(self, value):
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Benefit inhouse harus berupa array.')
        return [str(item).strip() for item in value if str(item).strip()]

    def validate(self, attrs):
        attrs = super().validate(attrs)

        course_type = attrs.get('type', getattr(self.instance, 'type', 'course'))
        delivery_mode = attrs.get('delivery_mode', getattr(self.instance, 'delivery_mode', None))
        scheduled_at = attrs.get('scheduled_at', getattr(self.instance, 'scheduled_at', None))
        scheduled_end_at = attrs.get('scheduled_end_at', getattr(self.instance, 'scheduled_end_at', None))
        is_free = attrs.get('is_free', getattr(self.instance, 'is_free', False))

        if course_type == 'course':
            if not scheduled_at:
                raise serializers.ValidationError({
                    'scheduled_at': 'Tanggal mulai pelatihan wajib diisi.'
                })
            if not scheduled_end_at:
                raise serializers.ValidationError({
                    'scheduled_end_at': 'Tanggal selesai pelatihan wajib diisi.'
                })

        if course_type in ['course', 'workshop'] and not delivery_mode:
            raise serializers.ValidationError({
                'delivery_mode': 'Mode pelaksanaan wajib dipilih untuk pelatihan dan workshop.'
            })

        if course_type == 'webinar':
            attrs['delivery_mode'] = 'online'
            if is_free:
                attrs['price'] = Decimal('0')
                attrs['discount_price'] = None
        elif is_free:
            attrs['is_free'] = False

        if attrs.get('delivery_mode') == 'online' and attrs.get('location') == '':
            attrs['location'] = None
        if attrs.get('delivery_mode') == 'offline' and attrs.get('zoom_link') == '':
            attrs['zoom_link'] = None

        if scheduled_at and scheduled_end_at and scheduled_end_at < scheduled_at:
            raise serializers.ValidationError({
                'scheduled_end_at': 'Tanggal selesai harus sama dengan atau setelah tanggal mulai.'
            })

        price_pairs = [
            ('discount_price', 'price', 'Harga diskon e-learning harus lebih kecil dari harga normal.'),
            ('public_online_discount_price', 'public_online_price', 'Harga diskon public online harus lebih kecil dari harga normal.'),
            ('public_offline_discount_price', 'public_offline_price', 'Harga diskon public offline harus lebih kecil dari harga normal.'),
        ]
        for discount_field, base_field, message in price_pairs:
            base_price = parse_money_value(attrs.get(base_field, getattr(self.instance, base_field, None)))
            discount_price = parse_money_value(attrs.get(discount_field, getattr(self.instance, discount_field, None)))
            if base_price is not None and discount_price is not None and discount_price >= base_price:
                raise serializers.ValidationError({
                    discount_field: message
                })

        if attrs.get('public_training_enabled', getattr(self.instance, 'public_training_enabled', False)):
            public_sessions = attrs.get('public_sessions', getattr(self.instance, 'public_sessions', []))
            public_online_price = parse_money_value(attrs.get('public_online_price', getattr(self.instance, 'public_online_price', None)))
            public_offline_price = parse_money_value(attrs.get('public_offline_price', getattr(self.instance, 'public_offline_price', None)))
            has_session_level_price = any(
                parse_money_value((session or {}).get('price')) is not None
                for session in (public_sessions or [])
            )

            if not public_sessions and not public_online_price and not public_offline_price:
                raise serializers.ValidationError({
                    'public_sessions': 'Tambahkan sesi public atau isi minimal satu harga public online/offline.'
                })

            if not public_online_price and not public_offline_price and not has_session_level_price:
                raise serializers.ValidationError({
                    'public_sessions': 'Atur minimal satu harga public online/offline atau isi harga pada salah satu sesi public.'
                })

        return attrs

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'type', 'description', 'detail_sections', 'rundown_items',
            'public_training_enabled', 'public_training_intro', 'public_sessions',
            'public_online_price', 'public_online_discount_price',
            'public_offline_price', 'public_offline_discount_price',
            'inhouse_training_enabled', 'inhouse_training_intro', 'inhouse_training_benefits',
            'elearning_enabled', 'elearning_intro', 'price', 'discount_price',
            'instructor', 'instructor_id', 'category', 'category_id', 'level',
            'duration', 'delivery_mode', 'scheduled_at', 'scheduled_end_at', 'location', 'zoom_link', 'is_free', 'thumbnail', 'is_active', 'is_featured', 'has_certification_exam',
            'created_at', 'rating', 'enrolled_count', 'sections', 'is_enrolled', 'progress_percentage', 'last_accessed_lesson_id', 'certification_exams', 'webinar_attendance', 'attendance_summary', 'discussion_summary'
        ]
        read_only_fields = ['is_active']


class ReferralCodeSerializer(serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)
    owner_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    usage_count = serializers.SerializerMethodField()
    remaining_uses = serializers.SerializerMethodField()
    is_currently_valid = serializers.SerializerMethodField()

    class Meta:
        model = ReferralCode
        fields = [
            'id', 'code', 'label', 'description', 'discount_type', 'discount_value',
            'is_active', 'valid_from', 'valid_until', 'max_uses',
            'owner', 'owner_name', 'created_by', 'created_by_name',
            'affiliate_commission_rate', 'usage_count', 'remaining_uses',
            'is_currently_valid', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'owner_name', 'created_by_name', 'usage_count', 'remaining_uses', 'is_currently_valid', 'created_at', 'updated_at']

    def validate_code(self, value):
        normalized = ''.join(ch for ch in str(value or '').upper().strip() if ch.isalnum())
        if not normalized:
            return ''
        if len(normalized) < 4:
            raise serializers.ValidationError('Kode referral minimal 4 karakter.')
        queryset = ReferralCode.objects.exclude(pk=self.instance.pk if self.instance else None)
        if queryset.filter(code=normalized).exists():
            raise serializers.ValidationError('Kode referral ini sudah digunakan.')
        return normalized

    def validate(self, attrs):
        attrs = super().validate(attrs)
        max_uses = attrs.get('max_uses', getattr(self.instance, 'max_uses', None))
        valid_from = attrs.get('valid_from', getattr(self.instance, 'valid_from', None))
        valid_until = attrs.get('valid_until', getattr(self.instance, 'valid_until', None))
        discount_type = attrs.get('discount_type', getattr(self.instance, 'discount_type', REFERRAL_DISCOUNT_PERCENT))
        discount_value = Decimal(attrs.get('discount_value', getattr(self.instance, 'discount_value', 0)) or 0)

        if valid_from and valid_until and valid_until < valid_from:
            raise serializers.ValidationError({'valid_until': 'Masa berlaku akhir tidak boleh lebih awal dari tanggal mulai.'})
        if max_uses is not None and max_uses < 1:
            raise serializers.ValidationError({'max_uses': 'Maksimal penggunaan minimal 1.'})
        if discount_type == REFERRAL_DISCOUNT_PERCENT and (discount_value <= 0 or discount_value > 100):
            raise serializers.ValidationError({'discount_value': 'Diskon persen harus di antara 0 sampai 100.'})
        if discount_type == REFERRAL_DISCOUNT_FIXED and discount_value <= 0:
            raise serializers.ValidationError({'discount_value': 'Diskon nominal harus lebih dari 0.'})
        return attrs

    def create(self, validated_data):
        if not validated_data.get('code'):
            validated_data['code'] = generate_unique_referral_code()
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data.setdefault('created_by', request.user)
        return super().create(validated_data)

    def get_owner_name(self, obj):
        if not obj.owner_id:
            return None
        full_name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
        return full_name or obj.owner.username

    def get_created_by_name(self, obj):
        if not obj.created_by_id:
            return None
        full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return full_name or obj.created_by.username

    def get_usage_count(self, obj):
        return obj.active_usage_count

    def get_remaining_uses(self, obj):
        if obj.max_uses is None:
            return None
        return max(obj.max_uses - obj.active_usage_count, 0)

    def get_is_currently_valid(self, obj):
        return obj.is_currently_valid()


class ReferralCodeValidateSerializer(serializers.Serializer):
    code = serializers.CharField()
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())
    offer_type = serializers.ChoiceField(choices=ORDER_OFFER_CHOICES, required=False, default=ORDER_OFFER_ELEARNING)
    offer_mode = serializers.CharField(required=False, allow_blank=True, default='')
    public_session_id = serializers.CharField(required=False, allow_blank=True, default='')


class AffiliateApplicationReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    note = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)

    def validate_note(self, value):
        return (value or '').strip()


class OrderSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    course_title = serializers.ReadOnlyField(source='course.title')
    offer_type = serializers.ChoiceField(choices=ORDER_OFFER_CHOICES, required=False, default=ORDER_OFFER_ELEARNING)
    offer_mode = serializers.CharField(required=False, allow_blank=True, default='')
    public_session_id = serializers.CharField(required=False, allow_blank=True, default='')
    referral_code_input = serializers.CharField(required=False, allow_blank=True, write_only=True, default='')
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    original_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    referral_discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    referral_code_snapshot = serializers.CharField(read_only=True)
    platform_fee_rate = serializers.DecimalField(max_digits=5, decimal_places=4, read_only=True)
    platform_fee_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    platform_net_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    instructor_earning_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    affiliate_commission_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)

        if self.instance is None:
            course = attrs.get('course')
            if course:
                offer_type = attrs.get('offer_type', ORDER_OFFER_ELEARNING)
                offer_mode = (attrs.get('offer_mode') or '').strip().lower()
                public_session_id = (attrs.get('public_session_id') or '').strip()

                if offer_type == ORDER_OFFER_ELEARNING:
                    if not course.elearning_enabled:
                        raise serializers.ValidationError({
                            'offer_type': 'Course ini tidak membuka paket e-learning.'
                        })
                elif offer_type == ORDER_OFFER_PUBLIC:
                    if not course.public_training_enabled:
                        raise serializers.ValidationError({
                            'offer_type': 'Course ini tidak membuka paket public training.'
                        })
                    if not get_public_session(course, session_id=public_session_id, offer_mode=offer_mode):
                        raise serializers.ValidationError({
                            'public_session_id': 'Sesi public training yang dipilih tidak ditemukan.'
                        })

                total_amount = get_order_total_amount(
                    course,
                    offer_type=offer_type,
                    public_session_id=public_session_id,
                    offer_mode=offer_mode,
                )
                if total_amount is None:
                    raise serializers.ValidationError({
                        'total_amount': 'Harga paket yang dipilih tidak valid.'
                    })

                referral_code_input = ''.join(ch for ch in str(attrs.get('referral_code_input') or '').upper().strip() if ch.isalnum())
                referral_code = None
                if referral_code_input:
                    referral_code = ReferralCode.objects.select_related('owner').filter(code=referral_code_input).first()
                    if not referral_code:
                        raise serializers.ValidationError({
                            'referral_code_input': 'Kode referral tidak ditemukan.'
                        })
                    if not referral_code.is_currently_valid():
                        raise serializers.ValidationError({
                            'referral_code_input': 'Kode referral sedang tidak aktif, sudah kedaluwarsa, atau kuotanya habis.'
                        })
                    request = self.context.get('request')
                    if request and referral_code.owner_id and referral_code.owner_id == request.user.id:
                        raise serializers.ValidationError({
                            'referral_code_input': 'Kode referral milik sendiri tidak bisa digunakan untuk checkout pribadi.'
                        })

                discount_info = apply_referral_discount(total_amount, referral_code)
                attrs['offer_mode'] = offer_mode
                attrs['public_session_id'] = public_session_id
                attrs['original_amount'] = discount_info['original_amount']
                attrs['referral_discount_amount'] = discount_info['discount_amount']
                attrs['total_amount'] = discount_info['final_amount']
                attrs['referral_code'] = referral_code
                attrs['referral_code_snapshot'] = referral_code.code if referral_code else ''
                attrs['affiliate_user'] = referral_code.owner if referral_code and referral_code.owner_id else None
                attrs['affiliate_commission_rate'] = referral_code.affiliate_commission_rate if referral_code and referral_code.owner_id else Decimal('0')

        return attrs
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'course', 'course_title', 'offer_type', 'offer_mode', 'public_session_id',
            'referral_code_input', 'referral_code_snapshot', 'original_amount', 'referral_discount_amount',
            'total_amount', 'platform_fee_rate', 'platform_fee_amount', 'platform_net_amount',
            'instructor_earning_amount', 'affiliate_commission_amount', 'status', 'snap_token',
            'midtrans_id', 'created_at'
        ]

class MyCourseSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    last_accessed_lesson_id = serializers.SerializerMethodField()
    pre_test_score = serializers.SerializerMethodField()
    post_test_score = serializers.SerializerMethodField()

    def _get_latest_quiz_attempt(self, user, course, lesson_type):
        return UserQuizAttempt.objects.filter(
            user=user,
            quiz__lesson__course=course,
            quiz__lesson__type=lesson_type,
        ).order_by('-completed_at', '-id').first()

    def _normalize_score(self, value):
        if value is None:
            return None
        if isinstance(value, Decimal):
            return round(float(value), 2)
        return round(float(value), 2)

    def get_last_accessed_lesson_id(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated or obj.offer_type != ORDER_OFFER_ELEARNING:
            return None
        
        last_progress = UserLessonProgress.objects.filter(
            user=user, 
            lesson__course=obj.course
        ).order_by('-updated_at').first()
        
        if last_progress:
            return last_progress.lesson.id
        return None
    
    def get_progress_percentage(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated or obj.offer_type != ORDER_OFFER_ELEARNING:
            return 0
        
        total_lessons = Lesson.objects.filter(course=obj.course).count()
        if total_lessons == 0:
            return 0
            
        completed_lessons = UserLessonProgress.objects.filter(
            user=user, 
            lesson__course=obj.course, 
            is_completed=True
        ).count()
        
        return round((completed_lessons / total_lessons) * 100)

    def get_pre_test_score(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated or obj.offer_type not in [ORDER_OFFER_ELEARNING, ORDER_OFFER_PUBLIC]:
            return None

        attempt = self._get_latest_quiz_attempt(user, obj.course, 'mid_test')
        return self._normalize_score(attempt.score) if attempt else None

    def get_post_test_score(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated or obj.offer_type not in [ORDER_OFFER_ELEARNING, ORDER_OFFER_PUBLIC]:
            return None

        lesson_attempt = self._get_latest_quiz_attempt(user, obj.course, 'final_test')
        if lesson_attempt:
            return self._normalize_score(lesson_attempt.score)

        exam_attempt = CertificationAttempt.objects.filter(
            user=user,
            exam__course=obj.course,
            status__in=['SUBMITTED', 'GRADED'],
        ).order_by('-submitted_at', '-started_at', '-id').first()
        if exam_attempt:
            return self._normalize_score(exam_attempt.score)

        return None
    
    class Meta:
        model = Order
        fields = [
            'id', 'course', 'status', 'offer_type', 'offer_mode', 'public_session_id',
            'created_at', 'progress_percentage', 'last_accessed_lesson_id',
            'pre_test_score', 'post_test_score',
        ]


class CourseFeedbackSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    quiz_score = serializers.SerializerMethodField()

    class Meta:
        model = CourseFeedback
        fields = [
            'id', 'course', 'user', 'user_name', 'user_email', 'lesson', 'lesson_title',
            'quiz_attempt', 'quiz_score', 'criticism', 'suggestion', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'course', 'user', 'user_name', 'user_email', 'lesson', 'lesson_title',
            'quiz_attempt', 'quiz_score', 'created_at', 'updated_at',
        ]

    def get_user_name(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.username

    def get_quiz_score(self, obj):
        if not obj.quiz_attempt_id or obj.quiz_attempt.score is None:
            return None
        return round(float(obj.quiz_attempt.score), 2)


class CourseFeedbackSubmissionSerializer(serializers.Serializer):
    criticism = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    suggestion = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)

    def validate(self, attrs):
        criticism = (attrs.get('criticism') or '').strip()
        suggestion = (attrs.get('suggestion') or '').strip()

        if not criticism and not suggestion:
            raise serializers.ValidationError('Isi kritik, saran, atau keduanya.')

        attrs['criticism'] = criticism
        attrs['suggestion'] = suggestion
        return attrs

class CartItemSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source='course', write_only=True
    )
    offer_type = serializers.ChoiceField(choices=ORDER_OFFER_CHOICES, required=False, default=ORDER_OFFER_ELEARNING)
    offer_mode = serializers.CharField(required=False, allow_blank=True, default='')
    public_session_id = serializers.CharField(required=False, allow_blank=True, default='')
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    public_session = serializers.SerializerMethodField()

    def get_public_session(self, obj):
        if obj.offer_type != ORDER_OFFER_PUBLIC:
            return None
        return get_public_session(obj.course, session_id=obj.public_session_id, offer_mode=obj.offer_mode)

    class Meta:
        model = CartItem
        fields = [
            'id', 'course', 'course_id', 'offer_type', 'offer_mode',
            'public_session_id', 'public_session', 'total_amount', 'added_at'
        ]

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_price', 'created_at', 'updated_at']

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            'avatar', 'phone', 'company', 'position', 'bio',
            'npwp', 'nik', 'bank_name', 'bank_account_number', 'bank_account_holder',
        )


class InstructorWithdrawalRequestSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.name', read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()

    class Meta:
        model = InstructorWithdrawalRequest
        fields = [
            'id', 'instructor', 'instructor_name', 'requested_by', 'requested_by_name',
            'amount', 'note', 'status', 'status_label', 'accountant_notes',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'paid_at',
            'npwp_snapshot', 'bank_name_snapshot', 'bank_account_number_snapshot',
            'bank_account_holder_snapshot', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_requested_by_name(self, obj):
        full_name = f"{obj.requested_by.first_name} {obj.requested_by.last_name}".strip()
        return full_name or obj.requested_by.username

    def get_reviewed_by_name(self, obj):
        if not obj.reviewed_by:
            return None
        full_name = f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}".strip()
        return full_name or obj.reviewed_by.username

    def get_status_label(self, obj):
        return obj.get_status_display()


class InstructorWithdrawalRequestCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    note = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)

    def validate_note(self, value):
        return (value or '').strip()


class InstructorWithdrawalRequestReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        WITHDRAWAL_STATUS_APPROVED,
        WITHDRAWAL_STATUS_REJECTED,
        WITHDRAWAL_STATUS_PAID,
    ])
    accountant_notes = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)

    def validate(self, attrs):
        status_value = attrs['status']
        notes = (attrs.get('accountant_notes') or '').strip()

        if status_value == WITHDRAWAL_STATUS_REJECTED and not notes:
            raise serializers.ValidationError({
                'accountant_notes': 'Berikan alasan saat pengajuan pencairan ditolak.'
            })

        attrs['accountant_notes'] = notes
        return attrs

class ProfileSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    is_instructor = serializers.SerializerMethodField()
    instructor = serializers.SerializerMethodField()
    affiliate = serializers.SerializerMethodField()
    instructor_signature_image = serializers.ImageField(write_only=True, required=False, allow_null=True)
    role = serializers.SerializerMethodField()
    staff_role = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'profile',
            'is_staff', 'is_instructor', 'instructor', 'affiliate', 'instructor_signature_image',
            'role', 'staff_role'
        )
        read_only_fields = ('id', 'username', 'is_staff', 'is_instructor', 'role', 'staff_role')

    def get_is_instructor(self, obj):
        return get_user_role(obj) == 'instructor'

    def get_instructor(self, obj):
        instructor = getattr(obj, 'instructor_profile', None)
        if not instructor:
            return None
        return {
            'id': instructor.id,
            'name': instructor.name,
            'title': instructor.title,
            'bio': instructor.bio,
            'photo': instructor.photo.url if instructor.photo else None,
            'signature_image': instructor.signature_image.url if instructor.signature_image else None,
            'approval_status': instructor.approval_status,
        }

    def get_role(self, obj):
        return get_user_role(obj)

    def get_staff_role(self, obj):
        return get_staff_role(obj)

    def get_affiliate(self, obj):
        profile = getattr(obj, 'profile', None)
        referral = ReferralCode.objects.filter(owner=obj).order_by('-created_at', '-id').first()
        completed_summary = Order.objects.filter(
            affiliate_user=obj,
            status='Completed',
        ).aggregate(
            total_orders=Count('id'),
            total_commission=Sum('affiliate_commission_amount'),
        )
        return {
            'status': getattr(profile, 'affiliate_status', AFFILIATE_STATUS_NONE) if profile else AFFILIATE_STATUS_NONE,
            'requested_at': profile.affiliate_requested_at.isoformat() if profile and profile.affiliate_requested_at else None,
            'reviewed_at': profile.affiliate_reviewed_at.isoformat() if profile and profile.affiliate_reviewed_at else None,
            'review_notes': getattr(profile, 'affiliate_review_notes', None) if profile else None,
            'code': referral.code if referral else None,
            'code_label': referral.label if referral else None,
            'discount_type': referral.discount_type if referral else None,
            'discount_value': str(referral.discount_value) if referral else None,
            'valid_until': referral.valid_until.isoformat() if referral and referral.valid_until else None,
            'max_uses': referral.max_uses if referral else None,
            'usage_count': referral.active_usage_count if referral else 0,
            'total_referred_orders': completed_summary['total_orders'] or 0,
            'total_commission': str(completed_summary['total_commission'] or Decimal('0')),
        }

    def validate_email(self, value):
        normalized_email = (value or '').strip().lower()
        if not normalized_email:
            return ''

        user = getattr(self, 'instance', None)
        if user and user.email and user.email.strip() and user.email.strip().lower() != normalized_email:
            raise serializers.ValidationError('Email hanya bisa diisi saat akun Anda belum memiliki email.')

        if User.objects.exclude(pk=user.pk if user else None).filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError('Email ini sudah digunakan akun lain.')

        return normalized_email

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        instructor_signature_image = validated_data.pop('instructor_signature_image', None)
        
        # Update User fields
        incoming_email = validated_data.get('email')
        if incoming_email:
            instance.email = incoming_email
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()
        
        # Update UserProfile fields
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        
        # Sync to Instructor model if exists
        if hasattr(instance, 'instructor_profile'):
            instr = instance.instructor_profile
            instr.name = f"{instance.first_name} {instance.last_name}".strip()
            if 'bio' in profile_data:
                instr.bio = profile_data['bio']
            if 'position' in profile_data:
                instr.title = profile_data['position']
            if 'avatar' in profile_data:
                instr.photo = profile_data['avatar']
            if instructor_signature_image:
                instr.signature_image = instructor_signature_image
            instr.save()

        return instance


class StudentAccessLinkClaimSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentAccessLinkClaim
        fields = ['id', 'username', 'email', 'full_name', 'created_at']

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username


class StudentAccessLinkSerializer(serializers.ModelSerializer):
    remaining_uses = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()
    claim_path = serializers.SerializerMethodField()
    claim_url = serializers.SerializerMethodField()
    claims = StudentAccessLinkClaimSerializer(many=True, read_only=True)

    class Meta:
        model = StudentAccessLink
        fields = [
            'id', 'name', 'description', 'token', 'max_uses', 'used_count', 'remaining_uses',
            'expires_at', 'redirect_path', 'is_active', 'is_available', 'claim_path', 'claim_url',
            'claims', 'created_at', 'updated_at',
        ]
        read_only_fields = ['token', 'used_count', 'remaining_uses', 'claim_path', 'claim_url', 'claims', 'created_at', 'updated_at']

    def get_remaining_uses(self, obj):
        return obj.remaining_uses

    def get_is_available(self, obj):
        return obj.is_available()

    def get_claim_path(self, obj):
        return f"/akses/{obj.token}"

    def get_claim_url(self, obj):
        request = self.context.get('request')
        claim_path = self.get_claim_path(obj)
        frontend_origin = ''
        if request:
            frontend_origin = request.headers.get('X-Frontend-Origin') or ''
        if frontend_origin:
            return f"{frontend_origin.rstrip('/')}{claim_path}"
        return claim_path

class CertificationAlternativeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificationAlternative
        fields = ['id', 'question', 'text', 'is_correct']

class CertificationQuestionSerializer(serializers.ModelSerializer):
    alternatives = CertificationAlternativeSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()

    def validate(self, attrs):
        attrs = super().validate(attrs)

        exam = attrs.get('exam', getattr(self.instance, 'exam', None))
        question_type = attrs.get('question_type', getattr(self.instance, 'question_type', None))

        if not exam or not question_type:
            return attrs

        if exam.exam_mode == 'QUESTIONS_ONLY' and question_type == 'Interview':
            raise serializers.ValidationError({
                'question_type': 'Mode ujian ini hanya menerima soal pilihan ganda atau essay.'
            })

        if exam.exam_mode == 'INTERVIEW_ONLY' and question_type in ['MC', 'Essay']:
            raise serializers.ValidationError({
                'question_type': 'Mode wawancara hanya menerima komponen wawancara.'
            })

        return attrs

    def validate_category_label(self, value):
        normalized_value = (value or '').strip()
        return normalized_value or 'Umum'

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url
      
    class Meta:
        model = CertificationQuestion
        fields = ['id', 'exam', 'question_type', 'category_label', 'text', 'image', 'image_url', 'order', 'points', 'alternatives']

class CertificationInstructorSlotSerializer(serializers.ModelSerializer):
    instructor_name = serializers.ReadOnlyField(source='instructor.name')
    exam_title = serializers.ReadOnlyField(source='exam.title')

    def validate(self, attrs):
        attrs = super().validate(attrs)

        exam = attrs.get('exam', getattr(self.instance, 'exam', None))
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({
                'end_time': 'Jam selesai harus lebih akhir dari jam mulai.'
            })

        return attrs
    
    class Meta:
        model = CertificationInstructorSlot
        fields = ['id', 'instructor', 'instructor_name', 'exam', 'exam_title', 'date', 'start_time', 'end_time', 'zoom_link', 'is_booked']
        read_only_fields = ['instructor', 'instructor_name', 'exam_title', 'is_booked']

class CertificationExamSerializer(serializers.ModelSerializer):
    questions = CertificationQuestionSerializer(many=True, read_only=True)
    slots = CertificationInstructorSlotSerializer(many=True, read_only=True)
    course_title = serializers.ReadOnlyField(source='course.title')
    schedule_is_open = serializers.SerializerMethodField()
    schedule_has_started = serializers.SerializerMethodField()
    schedule_is_closed = serializers.SerializerMethodField()

    class Meta:
        model = CertificationExam
        fields = [
            'id', 'course', 'course_title', 'title', 'description', 'is_active',
            'exam_mode', 'tested_materials', 'randomize_questions', 'passing_percentage',
            'instructor_confirmed', 'confirmed_start_at', 'confirmed_end_at',
            'schedule_is_open', 'schedule_has_started', 'schedule_is_closed',
            'questions', 'slots'
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)

        confirmed_start_at = attrs.get('confirmed_start_at', getattr(self.instance, 'confirmed_start_at', None))
        confirmed_end_at = attrs.get('confirmed_end_at', getattr(self.instance, 'confirmed_end_at', None))
        exam_mode = attrs.get('exam_mode', getattr(self.instance, 'exam_mode', 'QUESTIONS_ONLY'))
        passing_percentage = attrs.get('passing_percentage', getattr(self.instance, 'passing_percentage', 70))

        if confirmed_start_at and confirmed_end_at and confirmed_end_at < confirmed_start_at:
            raise serializers.ValidationError({
                'confirmed_end_at': 'Tanggal selesai ujian harus sama dengan atau setelah tanggal mulai.'
            })

        if passing_percentage < 1 or passing_percentage > 100:
            raise serializers.ValidationError({
                'passing_percentage': 'Persentase kelulusan harus diisi antara 1 sampai 100.'
            })

        if self.instance:
            existing_question_types = set(self.instance.questions.values_list('question_type', flat=True))
            if exam_mode == 'QUESTIONS_ONLY' and 'Interview' in existing_question_types:
                raise serializers.ValidationError({
                    'exam_mode': 'Hapus komponen wawancara terlebih dahulu sebelum mengubah mode menjadi soal saja.'
                })
            if exam_mode == 'INTERVIEW_ONLY' and existing_question_types.intersection({'MC', 'Essay'}):
                raise serializers.ValidationError({
                    'exam_mode': 'Hapus soal pilihan ganda/essay terlebih dahulu sebelum mengubah mode menjadi wawancara saja.'
                })

        return attrs

    def get_schedule_is_open(self, obj):
        return obj.schedule_is_open()

    def get_schedule_has_started(self, obj):
        return obj.schedule_has_started()

    def get_schedule_is_closed(self, obj):
        return obj.schedule_is_closed()

class CertificationAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificationAnswer
        fields = ['id', 'question', 'selected_alternative', 'essay_answer', 'score']

class CertificationAttemptSerializer(serializers.ModelSerializer):
    answers = CertificationAnswerSerializer(many=True, read_only=True)
    exam_title = serializers.ReadOnlyField(source='exam.title')
    user_name = serializers.ReadOnlyField(source='user.username')
    interview_slot_detail = CertificationInstructorSlotSerializer(source='interview_slot', read_only=True)
    interview_reviewed_by_name = serializers.SerializerMethodField()

    def get_interview_reviewed_by_name(self, obj):
        if not obj.interview_reviewed_by:
            return None
        full_name = f"{obj.interview_reviewed_by.first_name} {obj.interview_reviewed_by.last_name}".strip()
        return full_name or obj.interview_reviewed_by.username

    class Meta:
        model = CertificationAttempt
        fields = [
            'id', 'user', 'user_name', 'exam', 'exam_title', 'status', 'score',
            'interview_slot', 'interview_slot_detail', 'question_order',
            'interview_result', 'interview_reason', 'interview_feedback',
            'interview_reviewed_by', 'interview_reviewed_by_name', 'interview_reviewed_at',
            'started_at', 'submitted_at', 'answers'
        ]
        read_only_fields = ['user', 'user_name', 'status', 'score', 'started_at', 'submitted_at', 'answers', 'interview_slot_detail']

class CertificateSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    certificate_url = serializers.SerializerMethodField()
    certificate_number = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()
    exam_title = serializers.SerializerMethodField()
    template_name = serializers.ReadOnlyField(source='template.name')
    approved_by_name = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.username

    def get_certificate_url(self, obj):
        if obj.approval_status != Certificate.APPROVAL_APPROVED or not obj.certificate_url:
            return None

        request = self.context.get('request')
        if request and obj.certificate_url.startswith('/'):
            return request.build_absolute_uri(obj.certificate_url)
        return obj.certificate_url

    def get_certificate_number(self, obj):
        return build_certificate_number(obj)

    def get_course_title(self, obj):
        return get_certificate_title(obj)

    def get_exam_title(self, obj):
        return obj.exam.title if obj.exam else None

    def get_approved_by_name(self, obj):
        if not obj.approved_by:
            return None
        full_name = f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip()
        return full_name or obj.approved_by.username

    class Meta:
        model = Certificate
        fields = [
            'id', 'user', 'user_name', 'course', 'course_title', 'exam', 'exam_title',
            'template', 'template_name', 'issue_date', 'certificate_url', 'certificate_number', 'approval_status',
            'approved_at', 'approved_by', 'approved_by_name'
        ]


class WebinarAttendanceSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    course_title = serializers.ReadOnlyField(source='course.title')
    marked_by_name = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.username

    def get_marked_by_name(self, obj):
        if not obj.marked_by:
            return None
        full_name = f"{obj.marked_by.first_name} {obj.marked_by.last_name}".strip()
        return full_name or obj.marked_by.username

    class Meta:
        model = WebinarAttendance
        fields = [
            'id', 'user', 'user_name', 'course', 'course_title',
            'attendee_name', 'attendee_email', 'attendee_phone', 'attendee_company', 'attendee_position',
            'is_present', 'attended_at', 'marked_by', 'marked_by_name', 'notes'
        ]


class InhouseTrainingRequestSerializer(serializers.ModelSerializer):
    course_title = serializers.ReadOnlyField(source='course.title')

    class Meta:
        model = InhouseTrainingRequest
        fields = [
            'id', 'course', 'course_title', 'company_name', 'contact_name', 'email', 'phone',
            'position', 'participants_count', 'preferred_mode', 'target_date',
            'training_goals', 'notes', 'status', 'sales_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_participants_count(self, value):
        if value < 1:
            raise serializers.ValidationError('Jumlah peserta minimal 1 orang.')
        return value

class CertificateTemplateSerializer(serializers.ModelSerializer):
    course = serializers.PrimaryKeyRelatedField(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source='course', write_only=True, allow_null=True, required=False
    )
    course_title = serializers.ReadOnlyField(source='course.title')
    layout_config = serializers.JSONField(required=False)

    class Meta:
        model = CertificateTemplate
        fields = [
            'id', 'name', 'course', 'course_id', 'course_title', 'orientation',
            'page_width', 'page_height', 'background_image', 'signature_image',
            'signer_name', 'signer_title', 'notes', 'layout_config', 'is_active',
            'created_at', 'updated_at'
        ]

    def to_internal_value(self, data):
        mutable_data = data.dict() if hasattr(data, 'dict') else data.copy()

        if mutable_data.get('course_id') in ['', 'null', 'None']:
            mutable_data['course_id'] = None

        layout_config = mutable_data.get('layout_config')
        if isinstance(layout_config, str):
            import json
            try:
                mutable_data['layout_config'] = json.loads(layout_config)
            except (TypeError, ValueError, json.JSONDecodeError):
                pass

        return super().to_internal_value(mutable_data)

    def validate_layout_config(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError('Layout template harus berupa object JSON.')
        return value


class CourseDiscussionCommentSerializer(serializers.ModelSerializer):
    author = DiscussionAuthorSerializer(source='user', read_only=True)
    attachment = serializers.FileField(required=False, allow_null=True)
    attachment_name = serializers.SerializerMethodField()
    attachment_is_image = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = CourseDiscussionComment
        fields = [
            'id', 'content', 'attachment', 'attachment_name', 'attachment_is_image',
            'created_at', 'updated_at', 'author', 'can_edit', 'can_delete'
        ]

    def validate_content(self, value):
        return (value or '').strip()

    def validate_attachment(self, value):
        return validate_discussion_attachment(value)

    def validate(self, attrs):
        content = attrs.get('content')
        if content is None and self.instance is not None:
            content = self.instance.content
        content = (content or '').strip()
        attachment = attrs.get('attachment')
        existing_attachment = getattr(self.instance, 'attachment', None) if self.instance else None
        if not content and not attachment and not existing_attachment:
            raise serializers.ValidationError('Komentar atau lampiran harus diisi.')
        return attrs

    def get_attachment_name(self, obj):
        if not obj.attachment:
            return ''
        return Path(obj.attachment.name).name

    def get_attachment_is_image(self, obj):
        if not obj.attachment:
            return False
        return Path(obj.attachment.name).suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}

    def get_can_edit(self, obj):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and request.user.id == obj.user_id)

    def get_can_delete(self, obj):
        return self.get_can_edit(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        data['attachment'] = build_absolute_media_url(request, data.get('attachment'))
        return data


class CourseDiscussionTopicSerializer(serializers.ModelSerializer):
    author = DiscussionAuthorSerializer(source='user', read_only=True)
    comments = CourseDiscussionCommentSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()
    latest_activity_at = serializers.DateTimeField(source='updated_at', read_only=True)
    attachment = serializers.FileField(required=False, allow_null=True)
    attachment_name = serializers.SerializerMethodField()
    attachment_is_image = serializers.SerializerMethodField()

    class Meta:
        model = CourseDiscussionTopic
        fields = [
            'id', 'course', 'title', 'content', 'created_at', 'updated_at',
            'latest_activity_at', 'author', 'comment_count', 'comments',
            'attachment', 'attachment_name', 'attachment_is_image'
        ]
        read_only_fields = ['course']

    def get_comment_count(self, obj):
        annotated_value = getattr(obj, 'comment_count', None)
        if annotated_value is not None:
            return annotated_value
        return obj.comments.count()

    def validate_title(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Judul topik tidak boleh kosong.')
        return value

    def validate_content(self, value):
        return (value or '').strip()

    def validate_attachment(self, value):
        return validate_discussion_attachment(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        content = attrs.get('content')
        if content is None and self.instance is not None:
            content = self.instance.content
        content = (content or '').strip()
        attachment = attrs.get('attachment')
        existing_attachment = getattr(self.instance, 'attachment', None) if self.instance else None
        if not content and not attachment and not existing_attachment:
            raise serializers.ValidationError({'content': 'Isi topik atau lampiran harus diisi.'})
        return attrs

    def get_attachment_name(self, obj):
        if not obj.attachment:
            return ''
        return Path(obj.attachment.name).name

    def get_attachment_is_image(self, obj):
        if not obj.attachment:
            return False
        return Path(obj.attachment.name).suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        data['attachment'] = build_absolute_media_url(request, data.get('attachment'))
        return data
