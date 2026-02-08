import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from academy.models import Category, Instructor, Course

def populate():
    # Categories
    categories = [
        {'name': 'Manajemen Mutu', 'slug': 'manajemen-mutu', 'icon': 'quality'},
        {'name': 'K3 (Kesehatan Kerja)', 'slug': 'k3', 'icon': 'safety'},
        {'name': 'Lingkungan', 'slug': 'lingkungan', 'icon': 'environment'},
        {'name': 'Keamanan Informasi', 'slug': 'keamanan-informasi', 'icon': 'security'},
        {'name': 'Keamanan Pangan', 'slug': 'keamanan-pangan', 'icon': 'food-safety'},
    ]

    for cat_data in categories:
        Category.objects.get_or_create(slug=cat_data['slug'], defaults=cat_data)
    
    print("Categories created.")

    # Instructors
    instructor, _ = Instructor.objects.get_or_create(
        name="Dr. Budi Santoso",
        defaults={'title': "Lead Auditor ISO 9001", 'bio': "Expert in Quality Management."}
    )

    # Courses
    course_data = {
        'title': "ISO 9001:2015 Management Mutu",
        'slug': "iso-9001-management-mutu",
        'description': "Learn the basics of Quality Management Systems.",
        'price': 2500000,
        'instructor': instructor,
        'category': Category.objects.get(slug='manajemen-mutu'),
        'level': 'Beginner',
        'duration': '2 Hari',
    }
    
    Course.objects.get_or_create(slug=course_data['slug'], defaults=course_data)
    print("Courses created.")

if __name__ == '__main__':
    populate()
