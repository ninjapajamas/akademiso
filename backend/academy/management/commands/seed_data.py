"""
Management command: seed_data
Creates realistic dummy data for all roles.

Usage:
    python manage.py seed_data
    python manage.py seed_data --reset   # clears existing non-admin data first
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from academy.models import Category, Instructor, Course, Section, Lesson, Order, Cart, CartItem
from django.utils.text import slugify
from decimal import Decimal
import random


CATEGORIES = [
    {'name': 'Mutu (Quality)',          'slug': 'mutu-quality',          'icon': 'shield'},
    {'name': 'Keamanan (Security)',      'slug': 'keamanan-security',     'icon': 'lock'},
    {'name': 'Lingkungan (Environment)', 'slug': 'lingkungan-environment','icon': 'leaf'},
    {'name': 'K3 (Safety)',              'slug': 'k3-safety',             'icon': 'hard-hat'},
    {'name': 'Pangan (Food Safety)',     'slug': 'pangan-food-safety',    'icon': 'utensils'},
]

INSTRUCTORS = [
    {
        'name': 'Dr. Budi Santoso',
        'title': 'Lead Auditor ISO 9001 & 14001',
        'bio': 'Dr. Budi adalah konsultan manajemen mutu berpengalaman 15 tahun. Beliau telah membantu lebih dari 200 perusahaan mendapatkan sertifikasi ISO 9001 di berbagai industri manufaktur dan jasa.',
        'username': 'budi.santoso',
        'email': 'budi.santoso@akademiso.id',
        'first_name': 'Budi',
        'last_name': 'Santoso',
    },
    {
        'name': 'Sarah Wijaya, CISA',
        'title': 'Certified Information Security Auditor',
        'bio': 'Sarah adalah pakar keamanan informasi dengan sertifikasi CISA dan CISSP. Memiliki pengalaman implementasi ISO 27001 di sektor perbankan dan fintech selama lebih dari 10 tahun.',
        'username': 'sarah.wijaya',
        'email': 'sarah.wijaya@akademiso.id',
        'first_name': 'Sarah',
        'last_name': 'Wijaya',
    },
    {
        'name': 'Ir. Hendra Gunawan',
        'title': 'HSE Specialist & ISO 45001 Auditor',
        'bio': 'Ir. Hendra adalah spesialis Kesehatan dan Keselamatan Kerja (K3) dengan pengalaman di industri minyak bumi dan konstruksi. Tersertifikasi sebagai Lead Auditor ISO 45001 oleh IRCA.',
        'username': 'hendra.gunawan',
        'email': 'hendra.gunawan@akademiso.id',
        'first_name': 'Hendra',
        'last_name': 'Gunawan',
    },
]

COURSES = [
    {
        'title': 'ISO 9001:2015 Manajemen Mutu — Awareness',
        'slug': 'iso-9001-awareness',
        'description': 'Pelajari dasar-dasar Sistem Manajemen Mutu berdasarkan standar ISO 9001:2015. Cocok untuk semua level jabatan yang ingin memahami prinsip-prinsip mutu dan penerapannya di organisasi.',
        'price': Decimal('1500000'),
        'level': 'Beginner',
        'duration': '1 Hari',
        'rating': Decimal('4.9'),
        'is_featured': True,
        'instructor_idx': 0,
        'category_slug': 'mutu-quality',
        'sections': [
            {'title': 'Pengenalan ISO 9001:2015', 'lessons': [
                ('Apa itu ISO 9001?', 'video', '45 menit'),
                ('Sejarah dan Revisi Standar', 'article', '20 menit'),
                ('7 Prinsip Manajemen Mutu', 'video', '60 menit'),
            ]},
            {'title': 'Konteks Organisasi', 'lessons': [
                ('Memahami Kebutuhan Pihak Berkepentingan', 'video', '50 menit'),
                ('Menentukan Ruang Lingkup SMM', 'video', '40 menit'),
                ('Quiz Modul 2', 'quiz', '20 menit'),
            ]},
            {'title': 'Kepemimpinan dan Kebijakan Mutu', 'lessons': [
                ('Peran Manajemen Puncak', 'video', '45 menit'),
                ('Menyusun Kebijakan Mutu', 'article', '30 menit'),
            ]},
        ],
    },
    {
        'title': 'ISO 27001:2022 Keamanan Informasi — Lead Implementer',
        'slug': 'iso-27001-lead-implementer',
        'description': 'Program sertifikasi komprehensif untuk menjadi Lead Implementer Sistem Manajemen Keamanan Informasi (SMKI) berbasis ISO/IEC 27001:2022. Termasuk studi kasus nyata dan simulasi implementasi.',
        'price': Decimal('4500000'),
        'level': 'Advanced',
        'duration': '3 Hari',
        'rating': Decimal('4.8'),
        'is_featured': True,
        'instructor_idx': 1,
        'category_slug': 'keamanan-security',
        'sections': [
            {'title': 'Pengenalan ISO 27001:2022', 'lessons': [
                ('Overview Standar dan Perubahan dari 2013', 'video', '60 menit'),
                ('Ancaman dan Risiko Keamanan Informasi', 'video', '75 menit'),
                ('Regulatory Landscape (UU PDP, GDPR)', 'article', '45 menit'),
            ]},
            {'title': 'Penilaian dan Pengelolaan Risiko', 'lessons': [
                ('Metodologi Risk Assessment', 'video', '90 menit'),
                ('Risk Treatment Plan', 'video', '60 menit'),
                ('Studi Kasus: Perbankan Digital', 'article', '60 menit'),
            ]},
            {'title': 'Implementasi Kontrol (Annex A)', 'lessons': [
                ('93 Kontrol ISO 27001:2022', 'video', '120 menit'),
                ('Kebijakan dan Prosedur Keamanan', 'article', '45 menit'),
                ('Quiz Akhir Modul', 'quiz', '30 menit'),
            ]},
        ],
    },
    {
        'title': 'ISO 45001:2018 Keselamatan Kerja — Internal Auditor',
        'slug': 'iso-45001-internal-auditor',
        'description': 'Kuasai teknik audit internal Sistem Manajemen K3 sesuai ISO 45001:2018. Program ini mempersiapkan Anda untuk menjalankan audit internal yang efektif dan mengidentifikasi ketidaksesuaian.',
        'price': Decimal('3200000'),
        'level': 'Intermediate',
        'duration': '2 Hari',
        'rating': Decimal('4.7'),
        'is_featured': False,
        'instructor_idx': 2,
        'category_slug': 'k3-safety',
        'sections': [
            {'title': 'Dasar K3 dan ISO 45001', 'lessons': [
                ('Pengenalan ISO 45001:2018', 'video', '50 menit'),
                ('Identifikasi Bahaya dan Penilaian Risiko K3', 'video', '70 menit'),
            ]},
            {'title': 'Teknik Audit Internal', 'lessons': [
                ('Prinsip Audit (ISO 19011)', 'video', '60 menit'),
                ('Perencanaan dan Pelaksanaan Audit', 'video', '90 menit'),
                ('Pelaporan Temuan dan CAPA', 'article', '45 menit'),
                ('Simulasi Audit Lapangan', 'article', '60 menit'),
            ]},
        ],
    },
    {
        'title': 'ISO 14001:2015 Manajemen Lingkungan — Awareness',
        'slug': 'iso-14001-awareness',
        'description': 'Pahami konsep Sistem Manajemen Lingkungan (SML) dan bagaimana organisasi dapat mengelola dampak lingkungannya secara sistematis sesuai ISO 14001:2015.',
        'price': Decimal('1800000'),
        'level': 'Beginner',
        'duration': '1 Hari',
        'rating': Decimal('4.6'),
        'is_featured': False,
        'instructor_idx': 0,
        'category_slug': 'lingkungan-environment',
        'sections': [
            {'title': 'Pengenalan Manajemen Lingkungan', 'lessons': [
                ('Mengapa Manajemen Lingkungan Penting?', 'video', '40 menit'),
                ('Struktur dan Persyaratan ISO 14001:2015', 'video', '60 menit'),
                ('Aspek dan Dampak Lingkungan', 'article', '35 menit'),
            ]},
            {'title': 'Implementasi SML', 'lessons': [
                ('Planning: Objectives dan Targets', 'video', '50 menit'),
                ('Pengelolaan Limbah dan Emisi', 'video', '55 menit'),
            ]},
        ],
    },
    {
        'title': 'ISO 9001:2015 Manajemen Mutu — Lead Auditor',
        'slug': 'iso-9001-lead-auditor',
        'description': 'Program intensif 5 hari untuk menjadi Lead Auditor Sistem Manajemen Mutu yang kompeten. Terakreditasi IRCA dan diakui secara internasional. Termasuk ujian sertifikasi.',
        'price': Decimal('6500000'),
        'discount_price': Decimal('5800000'),
        'level': 'Advanced',
        'duration': '5 Hari',
        'rating': Decimal('5.0'),
        'is_featured': True,
        'instructor_idx': 0,
        'category_slug': 'mutu-quality',
        'sections': [
            {'title': 'Fondasi Audit dan ISO 9001', 'lessons': [
                ('Prinsip-prinsip Audit Menurut ISO 19011', 'video', '90 menit'),
                ('Persyaratan ISO 9001:2015 Secara Mendalam', 'video', '120 menit'),
            ]},
            {'title': 'Perencanaan dan Persiapan Audit', 'lessons': [
                ('Audit Planning: Scope, Criteria, Objectives', 'video', '75 menit'),
                ('Menyiapkan Checklist Audit yang Efektif', 'article', '45 menit'),
            ]},
            {'title': 'Pelaksanaan dan Pelaporan Audit', 'lessons': [
                ('Opening Meeting dan On-site Audit Techniques', 'video', '90 menit'),
                ('Penulisan Temuan dan NCR', 'video', '60 menit'),
                ('Closing Meeting dan Audit Report', 'article', '45 menit'),
                ('Ujian Sertifikasi (Simulasi)', 'quiz', '120 menit'),
            ]},
        ],
    },
]

PARTICIPANTS = [
    {'username': 'andi.wijaya',  'email': 'andi.wijaya@example.com',  'first_name': 'Andi',    'last_name': 'Wijaya',  'password': 'peserta123'},
    {'username': 'siti.rahayu', 'email': 'siti.rahayu@example.com',  'first_name': 'Siti',    'last_name': 'Rahayu', 'password': 'peserta123'},
    {'username': 'rizky.p',     'email': 'rizky.pratama@example.com','first_name': 'Rizky',   'last_name': 'Pratama','password': 'peserta123'},
    {'username': 'dewi.k',      'email': 'dewi.kusuma@example.com',  'first_name': 'Dewi',    'last_name': 'Kusuma', 'password': 'peserta123'},
    {'username': 'indah.perm',  'email': 'indah.permata@example.com','first_name': 'Indah',   'last_name': 'Permata','password': 'peserta123'},
]


class Command(BaseCommand):
    help = 'Seed the database with realistic dummy data'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete all non-superuser data first')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('🗑  Resetting data...')
            Order.objects.all().delete()
            CartItem.objects.all().delete()
            Cart.objects.all().delete()
            Lesson.objects.all().delete()
            Section.objects.all().delete()
            Course.objects.all().delete()
            Instructor.objects.all().delete()
            Category.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write('✅ Reset done.\n')

        # ── Categories ───────────────────────────────────────────────────────
        self.stdout.write('📂 Creating categories...')
        cat_map = {}
        for c in CATEGORIES:
            obj, created = Category.objects.get_or_create(slug=c['slug'], defaults={'name': c['name'], 'icon': c['icon']})
            cat_map[c['slug']] = obj
            self.stdout.write(f"   {'Created' if created else 'Exists '}: {obj.name}")

        # ── Instructors (with User accounts) ────────────────────────────────
        self.stdout.write('\n👨‍🏫 Creating instructors...')
        instructor_objs = []
        for i_data in INSTRUCTORS:
            user, u_created = User.objects.get_or_create(
                username=i_data['username'],
                defaults={
                    'email': i_data['email'],
                    'first_name': i_data['first_name'],
                    'last_name': i_data['last_name'],
                    'is_staff': False,
                }
            )
            if u_created:
                user.set_password('instruktur123')
                user.save()

            instr, created = Instructor.objects.get_or_create(
                name=i_data['name'],
                defaults={'title': i_data['title'], 'bio': i_data['bio']}
            )
            instructor_objs.append(instr)
            self.stdout.write(f"   {'Created' if created else 'Exists '}: {instr.name}")

        # ── Courses with Sections & Lessons ──────────────────────────────────
        self.stdout.write('\n📚 Creating courses...')
        course_objs = []
        for c_data in COURSES:
            instructor = instructor_objs[c_data['instructor_idx']]
            category   = cat_map[c_data['category_slug']]

            defaults = {
                'description':  c_data['description'],
                'price':        c_data['price'],
                'level':        c_data['level'],
                'duration':     c_data['duration'],
                'rating':       c_data['rating'],
                'is_featured':  c_data['is_featured'],
                'instructor':   instructor,
                'category':     category,
            }
            if 'discount_price' in c_data:
                defaults['discount_price'] = c_data['discount_price']

            course, created = Course.objects.get_or_create(slug=c_data['slug'], defaults={'title': c_data['title'], **defaults})
            course_objs.append(course)
            self.stdout.write(f"   {'Created' if created else 'Exists '}: {course.title}")

            if created:
                for s_order, s_data in enumerate(c_data['sections']):
                    section = Section.objects.create(course=course, title=s_data['title'], order=s_order + 1)
                    for l_order, (l_title, l_type, l_dur) in enumerate(s_data['lessons']):
                        Lesson.objects.create(
                            course=course, section=section,
                            title=l_title, type=l_type, duration=l_dur, order=l_order + 1
                        )

        # ── Participants ─────────────────────────────────────────────────────
        self.stdout.write('\n👥 Creating participants...')
        participant_objs = []
        for p in PARTICIPANTS:
            user, created = User.objects.get_or_create(
                username=p['username'],
                defaults={
                    'email': p['email'],
                    'first_name': p['first_name'],
                    'last_name': p['last_name'],
                }
            )
            if created:
                user.set_password(p['password'])
                user.save()
            participant_objs.append(user)
            self.stdout.write(f"   {'Created' if created else 'Exists '}: {user.username}")

        # ── Orders ───────────────────────────────────────────────────────────
        self.stdout.write('\n🧾 Creating orders...')
        enrollments = [
            # (user_idx, course_idx, status)
            (0, 0, 'Completed'),
            (0, 4, 'Pending'),
            (1, 0, 'Completed'),
            (1, 1, 'Completed'),
            (2, 1, 'Pending'),
            (2, 2, 'Completed'),
            (3, 3, 'Completed'),
            (3, 0, 'Pending'),
            (4, 2, 'Completed'),
            (4, 4, 'Pending'),
        ]
        for u_idx, c_idx, status in enrollments:
            user   = participant_objs[u_idx]
            course = course_objs[c_idx]
            order, created = Order.objects.get_or_create(
                user=user, course=course,
                defaults={'status': status, 'total_amount': course.price}
            )
            self.stdout.write(f"   {'Created' if created else 'Exists '}: {user.username} → {course.title[:40]} [{status}]")

        # ── Summary ──────────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS('\n✅ Seed data complete!'))
        self.stdout.write('─' * 50)
        self.stdout.write(f"  Categories : {Category.objects.count()}")
        self.stdout.write(f"  Instructors: {Instructor.objects.count()}")
        self.stdout.write(f"  Courses    : {Course.objects.count()}")
        self.stdout.write(f"  Sections   : {Section.objects.count()}")
        self.stdout.write(f"  Lessons    : {Lesson.objects.count()}")
        self.stdout.write(f"  Users      : {User.objects.count()} (incl. admin & instructors)")
        self.stdout.write(f"  Orders     : {Order.objects.count()}")
        self.stdout.write('─' * 50)
        self.stdout.write('\n📋 Test Accounts:')
        self.stdout.write('  Admin      : username=root (or your superuser), password=your_password')
        for i_data in INSTRUCTORS:
            self.stdout.write(f"  Instruktur : username={i_data['username']}, password=instruktur123")
        for p in PARTICIPANTS:
            self.stdout.write(f"  Peserta    : username={p['username']}, password=peserta123")
