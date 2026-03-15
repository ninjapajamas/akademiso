from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

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
    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='instructor_profile')
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=100)
    bio = models.TextField()
    photo = models.ImageField(upload_to='instructors/', blank=True, null=True)

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
        return sum(item.course.price for item in self.items.all())

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'course')

    def __str__(self):
        return f"{self.course.title} in {self.cart.user.username}'s cart"

class Order(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Completed', 'Completed'),
        ('Failed', 'Failed'),
        ('Cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    snap_token = models.CharField(max_length=255, blank=True, null=True)
    midtrans_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} - {self.user.username}"


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

class Quiz(models.Model):
    lesson = models.OneToOneField('Lesson', on_delete=models.CASCADE, related_name='quiz_data')
    pass_score = models.IntegerField(default=70)
    time_limit = models.IntegerField(null=True, blank=True, help_text="Time limit in minutes")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Quiz for: {self.lesson.title}"

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
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
    text = models.TextField()
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
