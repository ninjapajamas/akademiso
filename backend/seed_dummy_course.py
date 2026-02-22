import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from academy.models import Course, Category, Instructor, Section, Lesson
from django.utils.text import slugify

def seed():
    print("Starting seed process...")
    
    # 1. Create Category
    cat, _ = Category.objects.get_or_create(
        name="Mutu (Quality)",
        defaults={'slug': 'quality', 'icon': 'award'}
    )
    print(f"Category: {cat}")

    # 2. Create Instructor
    inst, _ = Instructor.objects.get_or_create(
        name="Dr. Budi Santoso",
        defaults={
            'title': 'Senior ISO Consultant',
            'bio': 'Expert in Quality Management Systems with 15 years experience.'
        }
    )
    print(f"Instructor: {inst}")

    # 3. Create Course
    title = "ISO 9001:2015 Management Mutu"
    
    course_data = {
        'description': "Sistem Manajemen Mutu. Pelajari standar internasional untuk manajemen mutu organisasi anda.",
        'price': 2500000,
        'level': 'Beginner',
        'duration': '2 Hari',
        'instructor': inst,
        'category': cat,
        'is_featured': True,
        'rating': 4.9,
        'enrolled_count': 850
    }

    course, created = Course.objects.update_or_create(
        title=title,
        defaults=course_data
    )
    
    # Reset slug to 'iso-9001' if it's new or just to be sure
    # Only change if not already set correctly to avoid unique constraints if duplicate titles exist
    if course.slug != 'iso-9001':
        course.slug = 'iso-9001'
        try:
            course.save()
            print("Slug set to 'iso-9001'")
        except Exception as e:
            print(f"Could not set manual slug 'iso-9001' (might already exist): {e}")
            # Ensure it has SOME slug
            if not course.slug:
                course.slug = slugify(title)
                course.save()
            
    print(f"Course '{course.title}' is ready with slug '{course.slug}'")

    # --- Add Sections and Lessons for ISO 9001 ---
    # Section 1
    s1, _ = Section.objects.get_or_create(course=course, title="Pengenalan ISO 9001", defaults={'order': 1})
    Lesson.objects.get_or_create(section=s1, course=course, title="Apa itu ISO 9001?", defaults={'order': 1, 'type': 'video', 'duration': '10:00'})
    Lesson.objects.get_or_create(section=s1, course=course, title="Sejarah Perkembangan", defaults={'order': 2, 'type': 'article', 'duration': '5 min read'})

    # Section 2
    s2, _ = Section.objects.get_or_create(course=course, title="Prinsip Manajemen Mutu", defaults={'order': 2})
    Lesson.objects.get_or_create(section=s2, course=course, title="Fokus Pelanggan", defaults={'order': 1, 'type': 'video', 'duration': '15:00'})
    Lesson.objects.get_or_create(section=s2, course=course, title="Kepemimpinan", defaults={'order': 2, 'type': 'video', 'duration': '12:00'})


    # ---------------------------------------------------------
    # 4. Create SECOND Course (ISO 27001) - "Tambah 1 lagi"
    # ---------------------------------------------------------
    cat2, _ = Category.objects.get_or_create(name="Keamanan (Security)", defaults={'slug': 'security', 'icon': 'shield'})
    inst2, _ = Instructor.objects.get_or_create(name="Sarah Wijaya, CISA", defaults={'title': 'Cybersecurity Expert', 'bio': 'Certified Information Systems Auditor.'})

    title2 = "ISO 27001 Keamanan Informasi"
    course_data2 = {
        'description': "Pelajari standar internasional untuk Sistem Manajemen Keamanan Informasi (ISMS). Lindungi aset data perusahaan anda.",
        'price': 3500000,
        'discount_price': 2900000, # Added discount
        'level': 'Intermediate',
        'duration': '3 Hari',
        'instructor': inst2,
        'category': cat2,
        'is_featured': True,
        'rating': 4.8,
        'enrolled_count': 520
    }

    course2, created2 = Course.objects.update_or_create(title=title2, defaults=course_data2)

    if course2.slug != 'iso-27001':
        course2.slug = 'iso-27001'
        try:
            course2.save()
        except:
            if not course2.slug:
                course2.slug = slugify(title2)
                course2.save()
    
    print(f"Course '{course2.title}' is ready with slug '{course2.slug}'")

    # Add Curriculum for ISO 27001
    s2_1, _ = Section.objects.get_or_create(course=course2, title="Information Security Basics", defaults={'order': 1})
    Lesson.objects.get_or_create(section=s2_1, course=course2, title="CIA Triad", defaults={'order': 1, 'type': 'video', 'duration': '10:00'})
    Lesson.objects.get_or_create(section=s2_1, course=course2, title="Risk Assessment", defaults={'order': 2, 'type': 'video', 'duration': '20:00'})

    s2_2, _ = Section.objects.get_or_create(course=course2, title="Annex A Controls", defaults={'order': 2})
    Lesson.objects.get_or_create(section=s2_2, course=course2, title="Access Control", defaults={'order': 1, 'type': 'video', 'duration': '15:00'})
    Lesson.objects.get_or_create(section=s2_2, course=course2, title="Cryptography", defaults={'order': 2, 'type': 'article', 'duration': '10 min read'})

if __name__ == '__main__':
    seed()
