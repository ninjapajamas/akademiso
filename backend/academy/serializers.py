from decimal import Decimal

from rest_framework import serializers
from .models import (
    Category, Instructor, Course, Lesson, Order, Cart, CartItem, Section, UserProfile, 
    Quiz, Question, Alternative, UserQuizAttempt, UserLessonProgress,
    CertificationExam, CertificationQuestion, CertificationAlternative, 
    CertificationInstructorSlot, CertificationAttempt, CertificationAnswer, Certificate, CertificateTemplate, WebinarAttendance
)
from django.contrib.auth.models import User
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .certificates import build_certificate_number, get_certificate_title

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['is_instructor'] = hasattr(user, 'instructor_profile')
        token['username'] = user.username
        return token

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(write_only=True, required=True)
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined']
        extra_kwargs = {'password': {'write_only': True}}

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
        return instance

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class InstructorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instructor
        fields = '__all__'

class AlternativeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alternative
        fields = ['id', 'text', 'is_correct', 'order']

class QuestionSerializer(serializers.ModelSerializer):
    alternatives = AlternativeSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'order', 'alternatives']

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Quiz
        fields = ['id', 'pass_score', 'time_limit', 'questions']

class LessonSerializer(serializers.ModelSerializer):
    quiz_data = QuizSerializer(required=False)
    is_completed = serializers.SerializerMethodField()

    def get_is_completed(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return UserLessonProgress.objects.filter(user=user, lesson=obj, is_completed=True).exists()
        return False

    class Meta:
        model = Lesson
        fields = ['id', 'course', 'section', 'title', 'type', 'content', 'video_url', 'image', 'duration', 'order', 'quiz_data', 'is_completed']

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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = request.user if request else None
        
        # Check enrollment
        is_enrolled = False
        if user and user.is_authenticated:
            if user.is_staff:
                is_enrolled = True
            else:
                is_enrolled = Order.objects.filter(user=user, course=instance.course, status='Completed').exists()
        
        # If not enrolled, hide sensitive content
        if not is_enrolled:
            data['content'] = "Konten ini hanya tersedia untuk peserta yang sudah terdaftar."
            data['video_url'] = None
            data['is_locked'] = True
            # Hide quiz data if not enrolled
            if 'quiz_data' in data:
                data['quiz_data'] = None
        else:
            data['is_locked'] = False
            
        return data

    def create(self, validated_data):
        quiz_data = validated_data.pop('quiz_data', None)
        lesson = Lesson.objects.create(**validated_data)
        
        if quiz_data and lesson.type in ['quiz', 'mid_test', 'final_test', 'exam']:
            questions_data = quiz_data.pop('questions', [])
            quiz = Quiz.objects.create(lesson=lesson, **quiz_data)
            for question_data in questions_data:
                alternatives_data = question_data.pop('alternatives', [])
                question = Question.objects.create(quiz=quiz, **question_data)
                for alternative_data in alternatives_data:
                    Alternative.objects.create(question=question, **alternative_data)
        
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
            
            # Simple approach for questions/alternatives: replace all (easier for prototype)
            # A more robust approach would match by ID
            quiz.questions.all().delete()
            for question_data in questions_data:
                alternatives_data = question_data.pop('alternatives', [])
                question = Question.objects.create(quiz=quiz, **question_data)
                for alternative_data in alternatives_data:
                    Alternative.objects.create(question=question, **alternative_data)
                    
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

    def get_certification_exams(self, obj):
        exams = obj.certification_exams.filter(is_active=True)
        return CertificationExamSerializer(exams, many=True).data

    def get_webinar_attendance(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if obj.type != 'webinar' or not user or not user.is_authenticated:
            return None

        if user.is_staff:
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
    
    def get_is_enrolled(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        return Order.objects.filter(user=user, course=obj, status='Completed').exists()
    
    
    def get_last_accessed_lesson_id(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
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
        if not user or not user.is_authenticated:
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

        return attrs

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'type', 'description', 'price', 'discount_price', 
            'instructor', 'instructor_id', 'category', 'category_id', 'level', 
            'duration', 'delivery_mode', 'scheduled_at', 'scheduled_end_at', 'location', 'zoom_link', 'is_free', 'thumbnail', 'is_active', 'is_featured', 'has_certification_exam', 
            'created_at', 'rating', 'enrolled_count', 'sections', 'is_enrolled', 'progress_percentage', 'last_accessed_lesson_id', 'certification_exams', 'webinar_attendance'
        ]
        read_only_fields = ['is_active']

class OrderSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = Order
        fields = ['id', 'user', 'course', 'total_amount', 'status', 'snap_token', 'midtrans_id', 'created_at']

class MyCourseSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    last_accessed_lesson_id = serializers.SerializerMethodField()
    
    def get_last_accessed_lesson_id(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
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
        if not user or not user.is_authenticated:
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
    
    class Meta:
        model = Order
        fields = ['id', 'course', 'status', 'created_at', 'progress_percentage', 'last_accessed_lesson_id']

class CartItemSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source='course', write_only=True
    )

    class Meta:
        model = CartItem
        fields = ['id', 'course', 'course_id', 'added_at']

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_price', 'created_at', 'updated_at']

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('avatar', 'phone', 'company', 'position', 'bio')

class ProfileSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    is_instructor = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile', 'is_staff', 'is_instructor')
        read_only_fields = ('id', 'username', 'email', 'is_staff', 'is_instructor')

    def get_is_instructor(self, obj):
        return hasattr(obj, 'instructor_profile')

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        
        # Update User fields
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
            if 'avatar' in profile_data:
                instr.photo = profile_data['avatar']
            instr.save()
            
        return instance

class CertificationAlternativeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificationAlternative
        fields = ['id', 'question', 'text', 'is_correct']

class CertificationQuestionSerializer(serializers.ModelSerializer):
    alternatives = CertificationAlternativeSerializer(many=True, read_only=True)

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
    
    class Meta:
        model = CertificationQuestion
        fields = ['id', 'exam', 'question_type', 'text', 'order', 'points', 'alternatives']

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
            'exam_mode', 'tested_materials', 'passing_percentage',
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

    class Meta:
        model = CertificationAttempt
        fields = [
            'id', 'user', 'user_name', 'exam', 'exam_title', 'status', 'score',
            'interview_slot', 'interview_slot_detail', 'started_at', 'submitted_at', 'answers'
        ]
        read_only_fields = ['user', 'user_name', 'status', 'score', 'started_at', 'submitted_at', 'answers', 'interview_slot_detail']

class CertificateSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    certificate_url = serializers.SerializerMethodField()
    certificate_number = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()
    exam_title = serializers.SerializerMethodField()
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
            'issue_date', 'certificate_url', 'certificate_number', 'approval_status',
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
