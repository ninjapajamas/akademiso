import os
import django
import sys

# Add project root to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from academy.models import Category, Instructor, Course, Section, Lesson, Quiz, Question, Alternative
from django.contrib.auth.models import User
from django.utils.text import slugify

def create_demo():
    print("Starting demo course creation...")

    # 1. Category
    category, _ = Category.objects.get_or_create(
        name="IT & Keamanan Siber",
        defaults={'slug': slugify("IT & Keamanan Siber")}
    )

    # 2. Instructor (try to find root or create dummy)
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        user, _ = User.objects.get_or_create(username='instructor_dummy', email='instructor@demo.com')
        user.set_password('password123')
        user.save()

    instructor, _ = Instructor.objects.get_or_create(
        user=user,
        defaults={
            'name': 'Budi Santoso, CISA',
            'bio': 'Expert in Information Security with 10+ years experience.',
            'title': 'Senior Security Consultant'
        }
    )

    # 3. Course
    course_title = "Sistem Manajemen Keamanan Informasi (ISO 27001)"
    course_slug = slugify(course_title)
    
    # Cleanup previous demo if exists
    Course.objects.filter(slug=course_slug).delete()
    
    course = Course.objects.create(
        slug=course_slug,
        title=course_title,
        category=category,
        instructor=instructor,
        description='Pelajari cara mengimplementasikan standar keamanan informasi internasional ISO 27001 dari nol hingga siap sertifikasi.',
        price=750000,
        level='Beginner',
        duration='10 Jam'
    )

    print(f"Course created: {course_title}")

    # 4. Sections & Lessons
    
    # --- Section 1: Pendahuluan ---
    s1 = Section.objects.create(course=course, title="Pendahuluan", order=1)
    
    Lesson.objects.create(
        section=s1, course=course, title="Apa itu ISO 27001?", 
        type='video', order=1, duration="15:00",
        video_url="https://www.youtube.com/embed/dQw4w9WgXcQ",
        content="Pengenalan dasar mengenai standar ISO 27001."
    )
    
    Lesson.objects.create(
        section=s1, course=course, title="Sejarah Keamanan Informasi", 
        type='article', order=2, duration="10:00",
        content="<h1>Sejarah Singkat</h1><p>Keamanan informasi telah berkembang pesat sejak era komputer pertama...</p>"
    )

    # Quiz in Section 1
    l_quiz1 = Lesson.objects.create(
        section=s1, course=course, title="Quiz Dasar Keamanan", 
        type='quiz', order=3, duration="05:00"
    )
    q1 = Quiz.objects.create(lesson=l_quiz1, pass_score=70, time_limit=5)
    
    ques1 = Question.objects.create(quiz=q1, text="Apa singkatan dari CIA dalam keamanan informasi?", order=1)
    Alternative.objects.create(question=ques1, text="Central Intelligence Agency", is_correct=False, order=1)
    Alternative.objects.create(question=ques1, text="Confidentiality, Integrity, Availability", is_correct=True, order=2)
    Alternative.objects.create(question=ques1, text="Computer Information Association", is_correct=False, order=3)

    # --- Section 2: Implementasi ISMS ---
    s2 = Section.objects.create(course=course, title="Implementasi ISMS", order=2)
    
    Lesson.objects.create(
        section=s2, course=course, title="PDCA Cycle dalam ISO 27001", 
        type='video', order=1, duration="25:00",
        video_url="https://www.youtube.com/embed/dQw4w9WgXcQ",
        content="Penjelasan Plan-Do-Check-Act."
    )

    # Mid Test in Section 2
    l_mid = Lesson.objects.create(
        section=s2, course=course, title="Mid Test: Fondasi ISMS", 
        type='mid_test', order=2, duration="20:00"
    )
    q_mid = Quiz.objects.create(lesson=l_mid, pass_score=75, time_limit=15)
    
    ques_mid1 = Question.objects.create(quiz=q_mid, text="Mana yang bukan bagian dari siklus PDCA?", order=1)
    Alternative.objects.create(question=ques_mid1, text="Plan", is_correct=False, order=1)
    Alternative.objects.create(question=ques_mid1, text="Do", is_correct=False, order=2)
    Alternative.objects.create(question=ques_mid1, text="Review", is_correct=True, order=3)
    Alternative.objects.create(question=ques_mid1, text="Act", is_correct=False, order=4)

    # --- Section 3: Audit ---
    s3 = Section.objects.create(course=course, title="Audit & Sertifikasi", order=3)
    
    # Final Test in Section 3
    l_final = Lesson.objects.create(
        section=s3, course=course, title="Final Test: Audit Internal", 
        type='final_test', order=1, duration="45:00"
    )
    q_final = Quiz.objects.create(lesson=l_final, pass_score=80, time_limit=30)
    
    ques_f1 = Question.objects.create(quiz=q_final, text="Siapa yang melakukan audit internal?", order=1)
    Alternative.objects.create(question=ques_f1, text="Pihak ketiga independen", is_correct=False, order=1)
    Alternative.objects.create(question=ques_f1, text="Karyawan organisasi yang kompeten", is_correct=True, order=2)
    Alternative.objects.create(question=ques_f1, text="Badan Sertifikasi", is_correct=False, order=3)

    # --- Section 4: Sertifikasi ---
    s4 = Section.objects.create(course=course, title="Sertifikasi Kompetensi", order=4)
    
    # Exam in Section 4
    l_exam = Lesson.objects.create(
        section=s4, course=course, title="Ujian: Sertifikasi ISO 27001 Foundation", 
        type='exam', order=1, duration="60:00"
    )
    q_exam = Quiz.objects.create(lesson=l_exam, pass_score=85, time_limit=60)
    
    ques_e1 = Question.objects.create(quiz=q_exam, text="ISO 27001 adalah standar untuk?", order=1)
    Alternative.objects.create(question=ques_e1, text="Manajemen Mutu", is_correct=False, order=1)
    Alternative.objects.create(question=ques_e1, text="Manajemen Cloud", is_correct=False, order=2)
    Alternative.objects.create(question=ques_e1, text="Sistem Manajemen Keamanan Informasi", is_correct=True, order=3)

    print(f"Successfully created course: {course_title}")
    print(f"Slug: {course_slug}")

if __name__ == "__main__":
    create_demo()
