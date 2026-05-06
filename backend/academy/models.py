from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from django.utils import timezone

STAFF_ROLE_ADMIN = 'admin'
STAFF_ROLE_ACCOUNTANT = 'akuntan'
STAFF_ROLE_PROJECT_MANAGER = 'project_manager'
STAFF_ROLE_CHOICES = [
    (STAFF_ROLE_ADMIN, 'Admin'),
    (STAFF_ROLE_ACCOUNTANT, 'Akuntan'),
    (STAFF_ROLE_PROJECT_MANAGER, 'Project Manager'),
]

PLATFORM_FEE_RATE = Decimal('0.10')
DEFAULT_AFFILIATE_COMMISSION_RATE = Decimal('0.20')
MONEY_QUANTIZER = Decimal('0.01')
ORDER_OFFER_ELEARNING = 'elearning'
ORDER_OFFER_PUBLIC = 'public'
ORDER_OFFER_CHOICES = [
    (ORDER_OFFER_ELEARNING, 'E-Learning'),
    (ORDER_OFFER_PUBLIC, 'Public Training'),
]
WITHDRAWAL_STATUS_PENDING = 'PENDING'
WITHDRAWAL_STATUS_APPROVED = 'APPROVED'
WITHDRAWAL_STATUS_REJECTED = 'REJECTED'
WITHDRAWAL_STATUS_PAID = 'PAID'
WITHDRAWAL_STATUS_CHOICES = [
    (WITHDRAWAL_STATUS_PENDING, 'Menunggu Review'),
    (WITHDRAWAL_STATUS_APPROVED, 'Disetujui'),
    (WITHDRAWAL_STATUS_REJECTED, 'Ditolak'),
    (WITHDRAWAL_STATUS_PAID, 'Sudah Dicairkan'),
]
AFFILIATE_STATUS_NONE = 'none'
AFFILIATE_STATUS_PENDING = 'pending'
AFFILIATE_STATUS_APPROVED = 'approved'
AFFILIATE_STATUS_REJECTED = 'rejected'
AFFILIATE_STATUS_CHOICES = [
    (AFFILIATE_STATUS_NONE, 'Belum Mengajukan'),
    (AFFILIATE_STATUS_PENDING, 'Menunggu Review'),
    (AFFILIATE_STATUS_APPROVED, 'Disetujui'),
    (AFFILIATE_STATUS_REJECTED, 'Ditolak'),
]
REFERRAL_DISCOUNT_PERCENT = 'percent'
REFERRAL_DISCOUNT_FIXED = 'fixed'
REFERRAL_DISCOUNT_TYPE_CHOICES = [
    (REFERRAL_DISCOUNT_PERCENT, 'Persentase'),
    (REFERRAL_DISCOUNT_FIXED, 'Nominal Tetap'),
]

GAMIFICATION_XP = {
    'completed_lesson': 20,
    'passed_quiz': 60,
    'perfect_quiz_bonus': 20,
    'completed_course_bonus': 120,
    'approved_certificate_bonus': 180,
}

GAMIFICATION_LEVELS = [
    {'level': 1, 'label': 'Pemula ISO', 'min_xp': 0},
    {'level': 2, 'label': 'Praktisi Konsisten', 'min_xp': 100},
    {'level': 3, 'label': 'Pejuang Audit', 'min_xp': 250},
    {'level': 4, 'label': 'Spesialis Implementasi', 'min_xp': 450},
    {'level': 5, 'label': 'Juara Sertifikasi', 'min_xp': 700},
    {'level': 6, 'label': 'Master Akademiso', 'min_xp': 1000},
]

GAMIFICATION_BADGES = [
    {
        'key': 'first_step',
        'label': 'Langkah Pertama',
        'description': 'Selesaikan 1 materi pertama.',
        'icon': 'sparkles',
        'accent_color': 'blue',
        'metric': 'completed_lessons',
        'threshold': 1,
    },
    {
        'key': 'steady_learner',
        'label': 'Belajar Konsisten',
        'description': 'Jaga streak belajar 3 hari berturut-turut.',
        'icon': 'flame',
        'accent_color': 'orange',
        'metric': 'current_streak',
        'threshold': 3,
    },
    {
        'key': 'quiz_conqueror',
        'label': 'Penakluk Quiz',
        'description': 'Lulus 1 quiz atau tes.',
        'icon': 'brain',
        'accent_color': 'indigo',
        'metric': 'passed_quizzes',
        'threshold': 1,
    },
    {
        'key': 'perfect_score',
        'label': 'Nilai Sempurna',
        'description': 'Raih skor 100 pada quiz.',
        'icon': 'star',
        'accent_color': 'amber',
        'metric': 'perfect_quizzes',
        'threshold': 1,
    },
    {
        'key': 'course_finisher',
        'label': 'Course Finisher',
        'description': 'Tamatkan 1 course e-learning.',
        'icon': 'flag',
        'accent_color': 'emerald',
        'metric': 'completed_courses',
        'threshold': 1,
    },
    {
        'key': 'certified_ready',
        'label': 'Tersertifikasi',
        'description': 'Dapatkan 1 sertifikat yang disetujui.',
        'icon': 'award',
        'accent_color': 'rose',
        'metric': 'approved_certificates',
        'threshold': 1,
    },
    {
        'key': 'module_explorer',
        'label': 'Penjelajah Modul',
        'description': 'Selesaikan 10 materi belajar.',
        'icon': 'book-open',
        'accent_color': 'cyan',
        'metric': 'completed_lessons',
        'threshold': 10,
    },
]


def calculate_platform_fee(amount, rate=PLATFORM_FEE_RATE):
    gross_amount = Decimal(amount or 0)
    fee_rate = Decimal(rate if rate is not None else PLATFORM_FEE_RATE)
    return (gross_amount * fee_rate).quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)


def calculate_instructor_earning(amount, rate=PLATFORM_FEE_RATE):
    gross_amount = Decimal(amount or 0)
    fee_amount = calculate_platform_fee(gross_amount, rate)
    return (gross_amount - fee_amount).quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)


def calculate_affiliate_commission(platform_fee_amount, rate=DEFAULT_AFFILIATE_COMMISSION_RATE):
    normalized_platform_fee = Decimal(platform_fee_amount or 0)
    commission_rate = Decimal(rate if rate is not None else DEFAULT_AFFILIATE_COMMISSION_RATE)
    return (normalized_platform_fee * commission_rate).quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)


def parse_money_value(raw_value):
    if raw_value in [None, '', 'null']:
        return None

    try:
        return Decimal(str(raw_value or 0)).quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)
    except Exception:
        return None


def resolve_discounted_price(base_price, discount_price=None):
    normalized_base = parse_money_value(base_price)
    normalized_discount = parse_money_value(discount_price)

    if normalized_base is None:
        return {
            'base_price': None,
            'discount_price': None,
            'effective_price': None,
        }

    if normalized_discount is not None and normalized_discount < normalized_base:
        return {
            'base_price': normalized_base,
            'discount_price': normalized_discount,
            'effective_price': normalized_discount,
        }

    return {
        'base_price': normalized_base,
        'discount_price': None,
        'effective_price': normalized_base,
    }


def generate_unique_referral_code(prefix='AKD'):
    normalized_prefix = ''.join(ch for ch in str(prefix or 'AKD').upper() if ch.isalnum())[:6] or 'AKD'
    while True:
        code = f"{normalized_prefix}{get_random_string(6, allowed_chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789')}"
        if not ReferralCode.objects.filter(code=code).exists():
            return code


def apply_referral_discount(amount, referral_code=None):
    normalized_amount = parse_money_value(amount) or Decimal('0')
    if normalized_amount <= 0 or not referral_code:
        return {
            'original_amount': normalized_amount,
            'discount_amount': Decimal('0').quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP),
            'final_amount': normalized_amount,
        }

    discount_amount = Decimal('0')
    if referral_code.discount_type == REFERRAL_DISCOUNT_PERCENT:
        discount_value = Decimal(referral_code.discount_value or 0)
        discount_amount = (normalized_amount * (discount_value / Decimal('100'))).quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)
    else:
        discount_amount = parse_money_value(referral_code.discount_value) or Decimal('0')

    if discount_amount > normalized_amount:
        discount_amount = normalized_amount

    final_amount = (normalized_amount - discount_amount).quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)
    return {
        'original_amount': normalized_amount,
        'discount_amount': discount_amount,
        'final_amount': final_amount,
    }


def get_staff_role(user):
    if not getattr(user, 'is_authenticated', False):
        return None

    if getattr(user, 'is_superuser', False):
        return STAFF_ROLE_ADMIN

    if not getattr(user, 'is_staff', False):
        return None

    profile = getattr(user, 'profile', None)
    if profile and profile.staff_role in {STAFF_ROLE_ACCOUNTANT, STAFF_ROLE_PROJECT_MANAGER}:
        return profile.staff_role

    return STAFF_ROLE_ADMIN


def get_user_role(user):
    if not getattr(user, 'is_authenticated', False):
        return 'guest'

    staff_role = get_staff_role(user)
    if staff_role == STAFF_ROLE_ACCOUNTANT:
        return STAFF_ROLE_ACCOUNTANT
    if staff_role == STAFF_ROLE_PROJECT_MANAGER:
        return STAFF_ROLE_PROJECT_MANAGER
    if staff_role == STAFF_ROLE_ADMIN:
        return STAFF_ROLE_ADMIN
    instructor_profile = getattr(user, 'instructor_profile', None)
    if instructor_profile and instructor_profile.is_approved:
        return 'instructor'
    return 'student'


def get_public_session(course, session_id=None, offer_mode=''):
    sessions = list(getattr(course, 'public_sessions', []) or [])
    normalized_mode = (offer_mode or '').strip().lower()
    normalized_session_id = str(session_id or '').strip()

    def build_fallback_session(mode):
        if mode not in ['online', 'offline']:
            return None

        price_field = f'public_{mode}_price'
        discount_field = f'public_{mode}_discount_price'
        course_level_price = getattr(course, price_field, None)
        course_level_discount = getattr(course, discount_field, None)
        legacy_price = getattr(course, 'price', None)

        if course_level_price in [None, '', 'null'] and legacy_price in [None, '', 'null']:
            return None

        is_online = mode == 'online'
        return {
            'id': f'public-{mode}',
            'title': f'{course.title} - Public {"Online" if is_online else "Offline"}',
            'delivery_mode': mode,
            'schedule': '',
            'location': (
                'Live virtual class'
                if is_online
                else (course.location or 'Lokasi akan diinformasikan')
            ),
            'duration': course.duration or '',
            'price': '' if course_level_price in [None, '', 'null'] else str(course_level_price),
            'discount_price': '' if course_level_discount in [None, '', 'null'] else str(course_level_discount),
            'badge': 'Online Class' if is_online else 'Tatap Muka',
            'cta_label': 'Daftar Sekarang',
            'cta_url': '',
            'legacy_price': '' if legacy_price in [None, '', 'null'] else str(legacy_price),
        }

    if normalized_session_id:
        for session in sessions:
            if str(session.get('id') or '').strip() == normalized_session_id:
                return session

        if normalized_session_id in ['public-online', 'public-offline']:
            fallback = build_fallback_session(normalized_session_id.replace('public-', ''))
            if fallback:
                return fallback

    if normalized_mode:
        for session in sessions:
            if str(session.get('delivery_mode') or '').strip().lower() == normalized_mode:
                return session

        fallback = build_fallback_session(normalized_mode)
        if fallback:
            return fallback

    if sessions:
        return sessions[0]

    return build_fallback_session('online') or build_fallback_session('offline')


def get_public_offer_price_info(course, offer_mode='', session_id='', session=None):
    resolved_session = session or get_public_session(course, session_id=session_id, offer_mode=offer_mode)
    resolved_mode = (
        (offer_mode or '')
        or str((resolved_session or {}).get('delivery_mode') or '').strip().lower()
    )

    base_price = None
    discount_price = None

    if resolved_mode in ['online', 'offline']:
        base_price = parse_money_value(getattr(course, f'public_{resolved_mode}_price', None))
        discount_price = parse_money_value(getattr(course, f'public_{resolved_mode}_discount_price', None))

    if base_price is None and resolved_session:
        base_price = parse_money_value(resolved_session.get('price'))
        discount_price = parse_money_value(resolved_session.get('discount_price'))

    if base_price is None and resolved_session:
        base_price = parse_money_value(resolved_session.get('legacy_price'))

    if base_price is None:
        base_price = parse_money_value(getattr(course, 'price', None))

    price_info = resolve_discounted_price(base_price, discount_price)
    price_info['mode'] = resolved_mode
    return price_info


def get_order_total_amount(course, offer_type=ORDER_OFFER_ELEARNING, public_session_id='', offer_mode=''):
    if offer_type == ORDER_OFFER_PUBLIC:
        session = get_public_session(course, session_id=public_session_id, offer_mode=offer_mode)
        if not session:
            return None

        return get_public_offer_price_info(
            course,
            offer_mode=offer_mode,
            session_id=public_session_id,
            session=session,
        )['effective_price']

    return resolve_discounted_price(
        Decimal('0') if course.is_free else course.price,
        None if course.is_free else course.discount_price,
    )['effective_price']


def has_elearning_access(user, course):
    if not getattr(user, 'is_authenticated', False):
        return False

    role = get_user_role(user)
    if role == STAFF_ROLE_ADMIN:
        return True

    instructor = getattr(user, 'instructor_profile', None)
    if instructor and instructor.is_approved and course.instructor_id == instructor.id:
        return True

    return Order.objects.filter(
        user=user,
        course=course,
        status='Completed',
        offer_type=ORDER_OFFER_ELEARNING,
    ).exists()


def has_assessment_access(user, course):
    if not getattr(user, 'is_authenticated', False):
        return False

    role = get_user_role(user)
    if role == STAFF_ROLE_ADMIN:
        return True

    instructor = getattr(user, 'instructor_profile', None)
    if instructor and instructor.is_approved and course.instructor_id == instructor.id:
        return True

    return Order.objects.filter(
        user=user,
        course=course,
        status='Completed',
        offer_type__in=[ORDER_OFFER_ELEARNING, ORDER_OFFER_PUBLIC],
    ).exists()


def default_certificate_layout():
    return {
        'recipient_name': {'x': 50, 'y': 42, 'fontSize': 54, 'fontWeight': 700, 'color': '#000000', 'align': 'center'},
        'course_title': {'x': 50, 'y': 55, 'fontSize': 28, 'fontWeight': 600, 'color': '#000000', 'align': 'center'},
        'issue_date': {'x': 72, 'y': 79, 'fontSize': 18, 'fontWeight': 500, 'color': '#000000', 'align': 'left'},
        'certificate_number': {'x': 16, 'y': 86, 'fontSize': 16, 'fontWeight': 500, 'color': '#000000', 'align': 'left'},
        'signature_image': {'x': 72, 'y': 63, 'width': 18, 'height': 10, 'align': 'center'},
        'signer_name': {'x': 72, 'y': 75, 'fontSize': 20, 'fontWeight': 700, 'color': '#000000', 'align': 'center'},
        'signer_title': {'x': 72, 'y': 80, 'fontSize': 15, 'fontWeight': 500, 'color': '#000000', 'align': 'center'},
    }

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    company = models.CharField(max_length=100, blank=True, null=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    npwp = models.CharField(max_length=32, blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    bank_account_number = models.CharField(max_length=50, blank=True, null=True)
    bank_account_holder = models.CharField(max_length=120, blank=True, null=True)
    staff_role = models.CharField(max_length=20, choices=STAFF_ROLE_CHOICES, blank=True, null=True)
    affiliate_status = models.CharField(max_length=20, choices=AFFILIATE_STATUS_CHOICES, default=AFFILIATE_STATUS_NONE)
    affiliate_requested_at = models.DateTimeField(blank=True, null=True)
    affiliate_reviewed_at = models.DateTimeField(blank=True, null=True)
    affiliate_review_notes = models.TextField(blank=True, null=True)
    affiliate_reviewed_by = models.ForeignKey(
        User,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_affiliate_profiles',
    )

    def __str__(self):
        return f"Profile for {self.user.username}"

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50, blank=True, null=True) # For frontend icon name

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Instructor(models.Model):
    APPROVAL_PENDING = 'PENDING'
    APPROVAL_APPROVED = 'APPROVED'
    APPROVAL_REJECTED = 'REJECTED'
    APPROVAL_STATUS_CHOICES = [
        (APPROVAL_PENDING, 'Menunggu Approval'),
        (APPROVAL_APPROVED, 'Disetujui'),
        (APPROVAL_REJECTED, 'Ditolak'),
    ]

    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='instructor_profile')
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=100)
    bio = models.TextField()
    expertise_areas = models.JSONField(default=list, blank=True)
    photo = models.ImageField(upload_to='instructors/', blank=True, null=True)
    signature_image = models.ImageField(upload_to='instructor_signatures/', blank=True, null=True)
    cv = models.FileField(upload_to='instructor_cvs/', blank=True, null=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default=APPROVAL_APPROVED)
    rejection_reason = models.TextField(blank=True, null=True)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='approved_instructors')
    approved_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_approved(self):
        return self.approval_status == self.APPROVAL_APPROVED

    def __str__(self):
        return self.name

class Course(models.Model):
    LEVEL_CHOICES = [
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
    ]

    TYPE_CHOICES = [
        ('course', 'Pelatihan'),
        ('webinar', 'Webinar'),
        ('workshop', 'Workshop'),
    ]

    DELIVERY_MODE_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
    ]

    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='course')
    description = models.TextField()
    detail_sections = models.JSONField(default=list, blank=True)
    rundown_items = models.JSONField(default=list, blank=True)
    public_training_enabled = models.BooleanField(default=False)
    public_training_intro = models.TextField(blank=True, default='')
    public_sessions = models.JSONField(default=list, blank=True)
    public_online_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    public_online_discount_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    public_offline_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    public_offline_discount_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    inhouse_training_enabled = models.BooleanField(default=False)
    inhouse_training_intro = models.TextField(blank=True, default='')
    inhouse_training_benefits = models.JSONField(default=list, blank=True)
    elearning_enabled = models.BooleanField(default=True)
    elearning_intro = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    instructor = models.ForeignKey(Instructor, on_delete=models.CASCADE, related_name='courses')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='courses')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='Beginner')
    duration = models.CharField(max_length=50, help_text="e.g. 2 Days, 10 Hours")
    delivery_mode = models.CharField(max_length=20, choices=DELIVERY_MODE_CHOICES, blank=True, null=True)
    scheduled_at = models.DateTimeField(blank=True, null=True, help_text="Start date/time for course, webinar, or workshop")
    scheduled_end_at = models.DateTimeField(blank=True, null=True, help_text="End date/time for course, webinar, or workshop")
    location = models.CharField(max_length=255, blank=True, null=True, help_text="Location for Offline Workshop")
    zoom_link = models.URLField(max_length=500, blank=True, null=True, help_text="Zoom Link for Webinar")
    is_free = models.BooleanField(default=False)
    thumbnail = models.ImageField(upload_to='courses/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    has_certification_exam = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    enrolled_count = models.IntegerField(default=0)

    def __str__(self):
        return self.title

    def sync_active_status(self):
        if self.type == 'course':
            if self.scheduled_end_at:
                self.is_active = self.scheduled_end_at >= timezone.now()
            elif self.scheduled_at:
                self.is_active = self.scheduled_at >= timezone.now()
        return self.is_active

    def save(self, *args, **kwargs):
        self.sync_active_status()
        super().save(*args, **kwargs)


class Project(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PLANNING = 'planning'
    STATUS_ACTIVE = 'active'
    STATUS_ON_HOLD = 'on_hold'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PLANNING, 'Planning'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_ON_HOLD, 'On Hold'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'
    PRIORITY_URGENT = 'urgent'
    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_URGENT, 'Urgent'),
    ]

    title = models.CharField(max_length=200)
    client_name = models.CharField(max_length=150, blank=True, default='')
    description = models.TextField(blank=True, default='')
    deliverables = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    start_date = models.DateField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    related_course = models.ForeignKey(Course, null=True, blank=True, on_delete=models.SET_NULL, related_name='projects')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='managed_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return self.title


class ProjectAssignment(models.Model):
    STATUS_ASSIGNED = 'assigned'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_REVIEW = 'review'
    STATUS_COMPLETED = 'completed'
    STATUS_BLOCKED = 'blocked'
    STATUS_CHOICES = [
        (STATUS_ASSIGNED, 'Assigned'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_REVIEW, 'Ready for Review'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_BLOCKED, 'Blocked'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='assignments')
    instructor = models.ForeignKey(Instructor, on_delete=models.CASCADE, related_name='project_assignments')
    assigned_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_project_assignments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ASSIGNED)
    role_label = models.CharField(max_length=120, blank=True, default='Trainer')
    notes = models.TextField(blank=True, default='')
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = ('project', 'instructor')
        ordering = ['assigned_at', 'id']

    def __str__(self):
        return f"{self.project.title} -> {self.instructor.name}"

class Section(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Lesson(models.Model):
    LESSON_TYPES = [
        ('video', 'Video'),
        ('article', 'Article'),
        ('quiz', 'Quiz'),
        ('mid_test', 'Mid Test'),
        ('final_test', 'Final Test'),
        ('exam', 'Ujian Mandiri'),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    section = models.ForeignKey(Section, on_delete=models.SET_NULL, null=True, blank=True, related_name='lessons')
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=LESSON_TYPES, default='video')
    content = models.TextField(blank=True, null=True) # For article content
    video_url = models.URLField(blank=True, null=True)
    image = models.ImageField(upload_to='lessons/', blank=True, null=True)
    attachment = models.FileField(upload_to='lesson_attachments/', blank=True, null=True)
    duration = models.CharField(max_length=50, blank=True)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.order}. {self.title}"

class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.username}"

    @property
    def total_price(self):
        total = Decimal('0')
        for item in self.items.all():
            total += item.total_amount
        return total.quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    offer_type = models.CharField(max_length=20, choices=ORDER_OFFER_CHOICES, default=ORDER_OFFER_ELEARNING)
    offer_mode = models.CharField(max_length=20, blank=True, default='')
    public_session_id = models.CharField(max_length=100, blank=True, default='')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'course', 'offer_type', 'offer_mode', 'public_session_id')

    def __str__(self):
        return f"{self.course.title} ({self.offer_type}) in {self.cart.user.username}'s cart"

    @property
    def total_amount(self):
        amount = get_order_total_amount(
            self.course,
            offer_type=self.offer_type,
            public_session_id=self.public_session_id,
            offer_mode=self.offer_mode,
        )
        if amount is None:
            return Decimal('0').quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)
        return amount


class ReferralCode(models.Model):
    code = models.CharField(max_length=32, unique=True)
    label = models.CharField(max_length=120, blank=True, default='')
    description = models.TextField(blank=True, default='')
    discount_type = models.CharField(
        max_length=20,
        choices=REFERRAL_DISCOUNT_TYPE_CHOICES,
        default=REFERRAL_DISCOUNT_PERCENT,
    )
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(blank=True, null=True)
    valid_until = models.DateTimeField(blank=True, null=True)
    max_uses = models.PositiveIntegerField(blank=True, null=True)
    owner = models.ForeignKey(
        User,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name='owned_referral_codes',
    )
    created_by = models.ForeignKey(
        User,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name='created_referral_codes',
    )
    affiliate_commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=DEFAULT_AFFILIATE_COMMISSION_RATE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return self.code

    @property
    def active_usage_count(self):
        return self.orders.exclude(status__in=['Cancelled', 'Failed']).count()

    def is_currently_valid(self, now=None):
        reference_time = now or timezone.now()
        if not self.is_active:
            return False
        if self.valid_from and self.valid_from > reference_time:
            return False
        if self.valid_until and self.valid_until < reference_time:
            return False
        if self.max_uses is not None and self.active_usage_count >= self.max_uses:
            return False
        return True

class Order(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Completed', 'Completed'),
        ('Failed', 'Failed'),
        ('Cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    offer_type = models.CharField(max_length=20, choices=ORDER_OFFER_CHOICES, default=ORDER_OFFER_ELEARNING)
    offer_mode = models.CharField(max_length=20, blank=True, default='')
    public_session_id = models.CharField(max_length=100, blank=True, default='')
    original_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    referral_code = models.ForeignKey(ReferralCode, on_delete=models.SET_NULL, blank=True, null=True, related_name='orders')
    referral_code_snapshot = models.CharField(max_length=32, blank=True, default='')
    referral_discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    platform_fee_rate = models.DecimalField(max_digits=5, decimal_places=4, default=PLATFORM_FEE_RATE)
    platform_fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    platform_net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    instructor_earning_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    affiliate_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='affiliate_orders',
    )
    affiliate_commission_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0)
    affiliate_commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    snap_token = models.CharField(max_length=255, blank=True, null=True)
    midtrans_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} - {self.user.username} ({self.offer_type})"

    def refresh_revenue_split(self):
        self.platform_fee_amount = calculate_platform_fee(self.total_amount, self.platform_fee_rate)
        self.instructor_earning_amount = calculate_instructor_earning(self.total_amount, self.platform_fee_rate)
        if self.affiliate_user_id and Decimal(self.affiliate_commission_rate or 0) > 0:
            self.affiliate_commission_amount = calculate_affiliate_commission(
                self.platform_fee_amount,
                self.affiliate_commission_rate,
            )
            if self.affiliate_commission_amount > self.platform_fee_amount:
                self.affiliate_commission_amount = self.platform_fee_amount
        else:
            self.affiliate_commission_amount = Decimal('0').quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)
        self.platform_net_amount = (self.platform_fee_amount - self.affiliate_commission_amount).quantize(
            MONEY_QUANTIZER,
            rounding=ROUND_HALF_UP,
        )

    def save(self, *args, **kwargs):
        if not self.original_amount:
            self.original_amount = self.total_amount
        if self.referral_code and not self.referral_code_snapshot:
            self.referral_code_snapshot = self.referral_code.code
        if not self.affiliate_user_id:
            self.affiliate_commission_rate = Decimal('0')
        self.refresh_revenue_split()
        super().save(*args, **kwargs)


class InstructorWithdrawalRequest(models.Model):
    instructor = models.ForeignKey(Instructor, on_delete=models.CASCADE, related_name='withdrawal_requests')
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='instructor_withdrawal_requests')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=WITHDRAWAL_STATUS_CHOICES, default=WITHDRAWAL_STATUS_PENDING)
    accountant_notes = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_withdrawal_requests',
    )
    reviewed_at = models.DateTimeField(blank=True, null=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    npwp_snapshot = models.CharField(max_length=32, blank=True, null=True)
    bank_name_snapshot = models.CharField(max_length=100, blank=True, null=True)
    bank_account_number_snapshot = models.CharField(max_length=50, blank=True, null=True)
    bank_account_holder_snapshot = models.CharField(max_length=120, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f"Pencairan {self.instructor.name} - {self.amount}"


class WebinarAttendance(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='webinar_attendances')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='webinar_attendances')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='webinar_attendances')
    attendee_name = models.CharField(max_length=150, blank=True, null=True)
    attendee_email = models.EmailField(blank=True, null=True)
    attendee_phone = models.CharField(max_length=30, blank=True, null=True)
    attendee_company = models.CharField(max_length=150, blank=True, null=True)
    attendee_position = models.CharField(max_length=150, blank=True, null=True)
    is_present = models.BooleanField(default=False)
    attended_at = models.DateTimeField(null=True, blank=True)
    marked_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='marked_webinar_attendances')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'course')
        ordering = ['-attended_at', '-updated_at']

    def __str__(self):
        return f"Presensi Webinar: {self.user.username} - {self.course.title}"


class InhouseTrainingRequest(models.Model):
    STATUS_CHOICES = [
        ('new', 'Baru'),
        ('contacted', 'Sudah Dihubungi'),
        ('quoted', 'Penawaran Dikirim'),
        ('closed', 'Selesai'),
    ]

    PREFERRED_MODE_CHOICES = [
        ('offline', 'Offline'),
        ('online', 'Online'),
        ('hybrid', 'Hybrid'),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='inhouse_requests')
    company_name = models.CharField(max_length=150)
    contact_name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    position = models.CharField(max_length=120, blank=True, null=True)
    participants_count = models.PositiveIntegerField(default=1)
    preferred_mode = models.CharField(max_length=20, choices=PREFERRED_MODE_CHOICES, default='offline')
    target_date = models.DateField(blank=True, null=True)
    training_goals = models.TextField()
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    sales_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f"Inhouse {self.course.title} - {self.company_name}"


class CourseDiscussionTopic(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='discussion_topics')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='discussion_topics')
    title = models.CharField(max_length=200)
    content = models.TextField()
    attachment = models.FileField(upload_to='discussion_attachments/topics/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class CourseDiscussionComment(models.Model):
    topic = models.ForeignKey(CourseDiscussionTopic, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='discussion_comments')
    content = models.TextField()
    attachment = models.FileField(upload_to='discussion_attachments/comments/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at', 'id']

    def __str__(self):
        return f"Komentar {self.user.username} pada {self.topic.title}"

class Quiz(models.Model):
    lesson = models.OneToOneField('Lesson', on_delete=models.CASCADE, related_name='quiz_data')
    pass_score = models.IntegerField(default=70)
    time_limit = models.IntegerField(null=True, blank=True, help_text="Time limit in minutes")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Quiz for: {self.lesson.title}"

class Question(models.Model):
    QUESTION_TYPE_MULTIPLE_CHOICE = 'MC'
    QUESTION_TYPE_SHORT_ANSWER = 'SHORT_ANSWER'
    QUESTION_TYPES = [
        (QUESTION_TYPE_MULTIPLE_CHOICE, 'Pilihan Ganda'),
        (QUESTION_TYPE_SHORT_ANSWER, 'Isian Singkat'),
    ]

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default=QUESTION_TYPE_MULTIPLE_CHOICE)
    text = models.TextField()
    image = models.ImageField(upload_to='quiz/questions/', null=True, blank=True)
    correct_answer = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text[:50]

class Alternative(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='alternatives')
    text = models.TextField()
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text[:50]

class UserQuizAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_attempts')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    score = models.DecimalField(max_digits=5, decimal_places=2)
    completed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.quiz.lesson.title} - {self.score}"


class CourseFeedback(models.Model):
    course = models.ForeignKey('Course', on_delete=models.CASCADE, related_name='feedback_entries')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='course_feedback_entries')
    lesson = models.ForeignKey('Lesson', null=True, blank=True, on_delete=models.SET_NULL, related_name='feedback_entries')
    quiz_attempt = models.ForeignKey(UserQuizAttempt, null=True, blank=True, on_delete=models.SET_NULL, related_name='feedback_entries')
    criticism = models.TextField(blank=True, default='')
    suggestion = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']
        constraints = [
            models.UniqueConstraint(fields=['course', 'user'], name='unique_course_feedback_per_user'),
        ]

    def __str__(self):
        return f"Feedback {self.course.title} - {self.user.username}"


class UserLessonProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='user_progress')
    is_completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'lesson')

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title} - {self.is_completed}"

class CertificationExam(models.Model):
    EXAM_MODE_CHOICES = [
        ('QUESTIONS_ONLY', 'Soal Saja'),
        ('INTERVIEW_ONLY', 'Wawancara Saja'),
        ('HYBRID', 'Soal + Wawancara'),
    ]
    course = models.ForeignKey('Course', on_delete=models.CASCADE, related_name='certification_exams')
    title = models.CharField(max_length=200)
    description = models.TextField()
    exam_mode = models.CharField(max_length=20, choices=EXAM_MODE_CHOICES, default='QUESTIONS_ONLY')
    tested_materials = models.TextField(blank=True, default='')
    randomize_questions = models.BooleanField(default=False)
    passing_percentage = models.PositiveSmallIntegerField(
        default=70,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Persentase minimal jawaban benar untuk dinyatakan lulus.",
    )
    is_active = models.BooleanField(default=False)
    instructor_confirmed = models.BooleanField(default=False)
    confirmed_start_at = models.DateTimeField(blank=True, null=True, help_text="Confirmed start datetime for certification exam")
    confirmed_end_at = models.DateTimeField(blank=True, null=True, help_text="Confirmed end datetime for certification exam")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.course.title}"

    def requires_interview(self):
        return self.exam_mode in ['INTERVIEW_ONLY', 'HYBRID']

    def requires_written_questions(self):
        return self.exam_mode in ['QUESTIONS_ONLY', 'HYBRID']

    def schedule_has_started(self, at_time=None):
        if not self.confirmed_start_at:
            return False
        at_time = at_time or timezone.now()
        return at_time >= self.confirmed_start_at

    def schedule_is_closed(self, at_time=None):
        if not self.confirmed_end_at:
            return False
        at_time = at_time or timezone.now()
        return at_time > self.confirmed_end_at

    def schedule_is_open(self, at_time=None):
        if not self.instructor_confirmed or not self.confirmed_start_at:
            return False

        at_time = at_time or timezone.now()
        if at_time < self.confirmed_start_at:
            return False
        if self.confirmed_end_at and at_time > self.confirmed_end_at:
            return False
        return True

class CertificationQuestion(models.Model):
    QUESTION_TYPES = [
        ('MC', 'Multiple Choice'),
        ('Essay', 'Essay'),
        ('Interview', 'Interview'),
    ]
    exam = models.ForeignKey(CertificationExam, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    category_label = models.CharField(max_length=120, blank=True, default='Umum')
    text = models.TextField()
    image = models.ImageField(upload_to='certification/questions/', null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    points = models.IntegerField(default=10)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"[{self.question_type}] {self.text[:50]}"

class CertificationAlternative(models.Model):
    question = models.ForeignKey(CertificationQuestion, on_delete=models.CASCADE, related_name='alternatives')
    text = models.TextField()
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text[:50]

class CertificationInstructorSlot(models.Model):
    exam = models.ForeignKey(CertificationExam, on_delete=models.CASCADE, related_name='slots')
    instructor = models.ForeignKey('Instructor', on_delete=models.CASCADE, related_name='exam_slots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    zoom_link = models.URLField(max_length=500, blank=True, null=True, help_text="Zoom/Meeting Link for interview")
    is_booked = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.instructor.name} - {self.date} ({self.start_time})"

class CertificationAttempt(models.Model):
    INTERVIEW_RESULT_PENDING = 'PENDING'
    INTERVIEW_RESULT_PASSED = 'PASSED'
    INTERVIEW_RESULT_FAILED = 'FAILED'
    INTERVIEW_RESULT_CHOICES = [
        (INTERVIEW_RESULT_PENDING, 'Menunggu Review'),
        (INTERVIEW_RESULT_PASSED, 'Lolos'),
        (INTERVIEW_RESULT_FAILED, 'Tidak Lolos'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('SUBMITTED', 'Submitted'),
        ('GRADED', 'Graded'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certification_attempts')
    exam = models.ForeignKey(CertificationExam, on_delete=models.CASCADE, related_name='attempts')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    interview_slot = models.ForeignKey(CertificationInstructorSlot, null=True, blank=True, on_delete=models.SET_NULL)
    question_order = models.JSONField(default=list, blank=True)
    interview_result = models.CharField(max_length=20, choices=INTERVIEW_RESULT_CHOICES, default=INTERVIEW_RESULT_PENDING)
    interview_reason = models.TextField(blank=True, default='')
    interview_feedback = models.TextField(blank=True, default='')
    interview_reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_certification_attempts')
    interview_reviewed_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.exam.title} ({self.status})"

class CertificationAnswer(models.Model):
    attempt = models.ForeignKey(CertificationAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(CertificationQuestion, on_delete=models.CASCADE)
    selected_alternative = models.ForeignKey(CertificationAlternative, null=True, blank=True, on_delete=models.SET_NULL)
    essay_answer = models.TextField(null=True, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

class Certificate(models.Model):
    APPROVAL_PENDING = 'PENDING'
    APPROVAL_APPROVED = 'APPROVED'
    APPROVAL_REJECTED = 'REJECTED'
    APPROVAL_STATUS_CHOICES = [
        (APPROVAL_PENDING, 'Pending'),
        (APPROVAL_APPROVED, 'Approved'),
        (APPROVAL_REJECTED, 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey('Course', on_delete=models.CASCADE)
    exam = models.ForeignKey(CertificationExam, null=True, blank=True, on_delete=models.CASCADE)
    template = models.ForeignKey('CertificateTemplate', null=True, blank=True, on_delete=models.SET_NULL, related_name='certificates')
    issue_date = models.DateTimeField(auto_now_add=True)
    certificate_url = models.URLField(max_length=500, null=True, blank=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default=APPROVAL_PENDING)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='approved_certificates')
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Certificate: {self.user.username} - {self.course.title}"

class CertificateTemplate(models.Model):
    ORIENTATION_CHOICES = [
        ('landscape', 'Landscape'),
        ('portrait', 'Portrait'),
    ]

    name = models.CharField(max_length=150)
    course = models.ForeignKey('Course', on_delete=models.SET_NULL, null=True, blank=True, related_name='certificate_templates')
    orientation = models.CharField(max_length=20, choices=ORIENTATION_CHOICES, default='landscape')
    page_width = models.PositiveIntegerField(default=1600)
    page_height = models.PositiveIntegerField(default=1200)
    background_image = models.ImageField(upload_to='certificate_templates/backgrounds/', null=True, blank=True)
    signature_image = models.ImageField(upload_to='certificate_templates/signatures/', null=True, blank=True)
    signer_name = models.CharField(max_length=120, blank=True, null=True)
    signer_title = models.CharField(max_length=120, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    layout_config = models.JSONField(default=default_certificate_layout, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']

    def __str__(self):
        if self.course_id:
            return f"{self.name} ({self.course.title})"
        return self.name


class StudentAccessLink(models.Model):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    token = models.CharField(max_length=64, unique=True, db_index=True, editable=False)
    max_uses = models.PositiveIntegerField(blank=True, null=True)
    used_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(blank=True, null=True)
    redirect_path = models.CharField(max_length=255, blank=True, default='/dashboard/settings?welcome=1&claimed=1')
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='student_access_links')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = get_random_string(48)
        super().save(*args, **kwargs)

    @property
    def remaining_uses(self):
        if self.max_uses is None:
            return None
        return max(self.max_uses - self.used_count, 0)

    def is_available(self, at_time=None):
        if not self.is_active:
            return False

        at_time = at_time or timezone.now()
        if self.expires_at and at_time > self.expires_at:
            return False
        if self.max_uses is not None and self.used_count >= self.max_uses:
            return False
        return True


class StudentAccessLinkClaim(models.Model):
    link = models.ForeignKey(StudentAccessLink, on_delete=models.CASCADE, related_name='claims')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_access_claims')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f"{self.link.name} -> {self.user.username}"


def _to_local_date(dt_value):
    if not dt_value:
        return None
    if timezone.is_aware(dt_value):
        dt_value = timezone.localtime(dt_value)
    return dt_value.date()


def _get_best_quiz_attempts(user):
    attempts = UserQuizAttempt.objects.filter(user=user).select_related(
        'quiz',
        'quiz__lesson',
        'quiz__lesson__course',
    ).order_by('quiz_id', '-score', '-completed_at')

    best_attempts = {}
    for attempt in attempts:
        if attempt.quiz_id not in best_attempts:
            best_attempts[attempt.quiz_id] = attempt
    return list(best_attempts.values())


def _calculate_streaks(activity_dates):
    normalized_dates = sorted(set(activity_dates))
    if not normalized_dates:
        return {
            'current': 0,
            'longest': 0,
            'last_activity_on': None,
            'active_days_this_week': 0,
        }

    longest_streak = 1
    running_streak = 1
    for index in range(1, len(normalized_dates)):
        if (normalized_dates[index] - normalized_dates[index - 1]).days == 1:
            running_streak += 1
        else:
            running_streak = 1
        longest_streak = max(longest_streak, running_streak)

    latest_activity = normalized_dates[-1]
    today = timezone.localdate()
    current_streak = 0
    if (today - latest_activity).days <= 1:
        current_streak = 1
        cursor = latest_activity
        for previous_date in reversed(normalized_dates[:-1]):
            if (cursor - previous_date).days == 1:
                current_streak += 1
                cursor = previous_date
            else:
                break

    week_start = today - timedelta(days=6)
    active_days_this_week = sum(1 for activity_date in normalized_dates if activity_date >= week_start)

    return {
        'current': current_streak,
        'longest': longest_streak,
        'last_activity_on': latest_activity.isoformat(),
        'active_days_this_week': active_days_this_week,
    }


def _build_level_info(total_xp):
    current_level = GAMIFICATION_LEVELS[0]
    next_level = None

    for level in GAMIFICATION_LEVELS:
        if total_xp >= level['min_xp']:
            current_level = level
        elif next_level is None:
            next_level = level
            break

    current_floor = current_level['min_xp']
    next_ceiling = next_level['min_xp'] if next_level else None

    if next_ceiling is None or next_ceiling == current_floor:
        progress_percentage = 100
        xp_to_next_level = 0
    else:
        progress_percentage = round(((total_xp - current_floor) / (next_ceiling - current_floor)) * 100)
        xp_to_next_level = max(next_ceiling - total_xp, 0)

    return {
        'current': current_level['level'],
        'label': current_level['label'],
        'current_level_xp': current_floor,
        'next_level_xp': next_ceiling,
        'xp_to_next_level': xp_to_next_level,
        'progress_percentage': max(0, min(progress_percentage, 100)),
    }


def _build_badges(metrics):
    badges = []
    for definition in GAMIFICATION_BADGES:
        current_value = int(metrics.get(definition['metric'], 0) or 0)
        threshold = definition['threshold']
        earned = current_value >= threshold
        progress_percentage = 100 if earned else round((current_value / threshold) * 100)
        badges.append({
            'key': definition['key'],
            'label': definition['label'],
            'description': definition['description'],
            'icon': definition['icon'],
            'accent_color': definition['accent_color'],
            'earned': earned,
            'progress_current': min(current_value, threshold) if earned else current_value,
            'progress_target': threshold,
            'progress_percentage': max(0, min(progress_percentage, 100)),
        })
    return badges


def get_user_gamification_summary(user):
    if not getattr(user, 'is_authenticated', False):
        return {
            'total_xp': 0,
            'active_courses': 0,
            'earned_badges_count': 0,
            'next_focus': '',
            'level': _build_level_info(0),
            'streak': {
                'current': 0,
                'longest': 0,
                'last_activity_on': None,
                'active_days_this_week': 0,
            },
            'stats': {
                'completed_lessons': 0,
                'passed_quizzes': 0,
                'perfect_quizzes': 0,
                'completed_courses': 0,
                'approved_certificates': 0,
            },
            'badges': [],
            'next_badges': [],
        }

    active_course_ids = list(Order.objects.filter(
        user=user,
        status='Completed',
        offer_type=ORDER_OFFER_ELEARNING,
    ).values_list('course_id', flat=True).distinct())

    total_lessons_by_course = {
        row['course_id']: row['total_lessons']
        for row in Lesson.objects.filter(course_id__in=active_course_ids).values('course_id').annotate(
            total_lessons=models.Count('id')
        )
    }
    completed_lessons_by_course = {
        row['lesson__course_id']: row['completed_lessons']
        for row in UserLessonProgress.objects.filter(
            user=user,
            lesson__course_id__in=active_course_ids,
            is_completed=True,
        ).values('lesson__course_id').annotate(
            completed_lessons=models.Count('id')
        )
    }

    completed_courses = sum(
        1
        for course_id, total_lessons in total_lessons_by_course.items()
        if total_lessons > 0 and completed_lessons_by_course.get(course_id, 0) >= total_lessons
    )

    completed_lessons = UserLessonProgress.objects.filter(
        user=user,
        is_completed=True,
    ).count()

    best_quiz_attempts = _get_best_quiz_attempts(user)
    passed_quizzes = sum(
        1
        for attempt in best_quiz_attempts
        if Decimal(str(attempt.score or 0)) >= Decimal(str(attempt.quiz.pass_score or 0))
    )
    perfect_quizzes = sum(
        1 for attempt in best_quiz_attempts
        if Decimal(str(attempt.score or 0)) >= Decimal('100')
    )

    approved_certificates = Certificate.objects.filter(
        user=user,
        approval_status=Certificate.APPROVAL_APPROVED,
    ).count()

    activity_dates = [
        _to_local_date(updated_at)
        for updated_at in UserLessonProgress.objects.filter(user=user).values_list('updated_at', flat=True)
    ]
    activity_dates.extend(
        _to_local_date(completed_at)
        for completed_at in UserQuizAttempt.objects.filter(user=user).values_list('completed_at', flat=True)
    )
    activity_dates = [activity_date for activity_date in activity_dates if activity_date]

    stats = {
        'completed_lessons': completed_lessons,
        'passed_quizzes': passed_quizzes,
        'perfect_quizzes': perfect_quizzes,
        'completed_courses': completed_courses,
        'approved_certificates': approved_certificates,
    }

    total_xp = (
        (completed_lessons * GAMIFICATION_XP['completed_lesson']) +
        (passed_quizzes * GAMIFICATION_XP['passed_quiz']) +
        (perfect_quizzes * GAMIFICATION_XP['perfect_quiz_bonus']) +
        (completed_courses * GAMIFICATION_XP['completed_course_bonus']) +
        (approved_certificates * GAMIFICATION_XP['approved_certificate_bonus'])
    )

    streak = _calculate_streaks(activity_dates)
    metrics = {
        **stats,
        'current_streak': streak['current'],
    }
    badges = _build_badges(metrics)
    earned_badges = [badge for badge in badges if badge['earned']]
    next_badges = [badge for badge in badges if not badge['earned']]
    next_badges.sort(key=lambda badge: (-badge['progress_percentage'], badge['progress_target']))
    highlighted_badges = next_badges[:3]

    if highlighted_badges:
        primary_badge = highlighted_badges[0]
        remaining_steps = max(primary_badge['progress_target'] - primary_badge['progress_current'], 0)
        next_focus = f"{remaining_steps} langkah lagi untuk membuka badge {primary_badge['label']}."
    else:
        next_focus = 'Semua badge inti sudah terbuka. Pertahankan ritme belajar Anda.'

    return {
        'total_xp': total_xp,
        'active_courses': len(active_course_ids),
        'earned_badges_count': len(earned_badges),
        'next_focus': next_focus,
        'level': _build_level_info(total_xp),
        'streak': streak,
        'stats': stats,
        'badges': badges,
        'next_badges': highlighted_badges,
    }


def get_user_gamification_activity(user, limit=8):
    if not getattr(user, 'is_authenticated', False):
        return []

    events = []

    completed_progress = UserLessonProgress.objects.filter(
        user=user,
        is_completed=True,
    ).select_related('lesson', 'lesson__course')
    for progress in completed_progress:
        events.append({
            'id': f'lesson-{progress.id}',
            'type': 'lesson_completed',
            'title': f"Menyelesaikan materi {progress.lesson.title}",
            'description': progress.lesson.course.title,
            'occurred_at': progress.updated_at,
            'xp_earned': GAMIFICATION_XP['completed_lesson'],
            'icon': 'book-open',
            'accent_color': 'blue',
        })

    passed_attempts = UserQuizAttempt.objects.filter(
        user=user,
        score__gte=models.F('quiz__pass_score'),
    ).select_related('quiz', 'quiz__lesson', 'quiz__lesson__course').order_by('completed_at')
    first_passes = {}
    for attempt in passed_attempts:
        if attempt.quiz_id not in first_passes:
            first_passes[attempt.quiz_id] = attempt
    for attempt in first_passes.values():
        events.append({
            'id': f'quiz-pass-{attempt.id}',
            'type': 'quiz_passed',
            'title': f"Lulus quiz {attempt.quiz.lesson.title}",
            'description': attempt.quiz.lesson.course.title,
            'occurred_at': attempt.completed_at,
            'xp_earned': GAMIFICATION_XP['passed_quiz'],
            'icon': 'brain',
            'accent_color': 'indigo',
        })

    perfect_attempts = UserQuizAttempt.objects.filter(
        user=user,
        score__gte=Decimal('100'),
    ).select_related('quiz', 'quiz__lesson', 'quiz__lesson__course').order_by('completed_at')
    first_perfects = {}
    for attempt in perfect_attempts:
        if attempt.quiz_id not in first_perfects:
            first_perfects[attempt.quiz_id] = attempt
    for attempt in first_perfects.values():
        events.append({
            'id': f'quiz-perfect-{attempt.id}',
            'type': 'perfect_quiz',
            'title': f"Skor sempurna di {attempt.quiz.lesson.title}",
            'description': attempt.quiz.lesson.course.title,
            'occurred_at': attempt.completed_at,
            'xp_earned': GAMIFICATION_XP['perfect_quiz_bonus'],
            'icon': 'star',
            'accent_color': 'amber',
        })

    total_lessons_by_course = {
        row['course_id']: row['total_lessons']
        for row in Lesson.objects.values('course_id').annotate(total_lessons=models.Count('id'))
    }
    completion_candidates = completed_progress.values(
        'lesson__course_id',
        'lesson__course__title',
    ).annotate(
        completed_lessons=models.Count('id'),
        completed_at=models.Max('updated_at'),
    )
    for candidate in completion_candidates:
        course_id = candidate['lesson__course_id']
        if total_lessons_by_course.get(course_id, 0) and candidate['completed_lessons'] >= total_lessons_by_course.get(course_id, 0):
            events.append({
                'id': f'course-{course_id}',
                'type': 'course_completed',
                'title': f"Menamatkan course {candidate['lesson__course__title']}",
                'description': 'Semua materi pada course ini sudah selesai.',
                'occurred_at': candidate['completed_at'],
                'xp_earned': GAMIFICATION_XP['completed_course_bonus'],
                'icon': 'flag',
                'accent_color': 'emerald',
            })

    approved_certificates = Certificate.objects.filter(
        user=user,
        approval_status=Certificate.APPROVAL_APPROVED,
    ).select_related('course')
    for certificate in approved_certificates:
        events.append({
            'id': f'certificate-{certificate.id}',
            'type': 'certificate_approved',
            'title': f"Sertifikat disetujui untuk {certificate.course.title}",
            'description': 'Sertifikat resmi siap diunduh dari dashboard.',
            'occurred_at': certificate.approved_at or certificate.issue_date,
            'xp_earned': GAMIFICATION_XP['approved_certificate_bonus'],
            'icon': 'award',
            'accent_color': 'rose',
        })

    fallback_time = timezone.now()
    events.sort(key=lambda event: event['occurred_at'] or fallback_time, reverse=True)

    normalized_events = []
    for event in events[:limit]:
        normalized_events.append({
            **event,
            'occurred_at': event['occurred_at'].isoformat() if event['occurred_at'] else None,
        })
    return normalized_events


def get_gamification_leaderboard(current_user=None, limit=10):
    users = User.objects.filter(
        orders__status='Completed',
        orders__offer_type=ORDER_OFFER_ELEARNING,
    ).distinct().select_related('profile')

    entries = []
    current_user_id = getattr(current_user, 'id', None)
    for user in users:
        summary = get_user_gamification_summary(user)
        entries.append({
            'user_id': user.id,
            'username': user.username,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'avatar_url': getattr(getattr(user, 'profile', None), 'avatar', None).url if getattr(getattr(user, 'profile', None), 'avatar', None) else None,
            'total_xp': summary['total_xp'],
            'level': summary['level'],
            'current_streak': summary['streak']['current'],
            'earned_badges_count': summary['earned_badges_count'],
            'completed_courses': summary['stats']['completed_courses'],
            'is_current_user': user.id == current_user_id,
        })

    entries.sort(
        key=lambda entry: (
            -entry['total_xp'],
            -entry['current_streak'],
            -entry['completed_courses'],
            entry['username'],
        )
    )

    current_user_entry = None
    for index, entry in enumerate(entries, start=1):
        entry['rank'] = index
        if entry['is_current_user']:
            current_user_entry = entry

    leaders = entries[:limit]
    if current_user_entry and current_user_entry['rank'] > limit:
        current_user_entry = dict(current_user_entry)
    else:
        current_user_entry = None

    return {
        'leaders': leaders,
        'current_user_entry': current_user_entry,
    }
