from datetime import time, timedelta
from decimal import Decimal
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont

from academy.models import (
    Alternative,
    Category,
    CertificateTemplate,
    CertificationAlternative,
    CertificationExam,
    CertificationInstructorSlot,
    CertificationQuestion,
    Course,
    Instructor,
    Lesson,
    Question,
    Quiz,
    Section,
    UserProfile,
)


TRIAL_SLUGS = [
    'uji-awareness-iso-9001-gratis',
    'uji-internal-auditor-iso-9001-berbayar',
]


class Command(BaseCommand):
    help = 'Create clearly-labelled, realistic trial courses for production QA.'

    def add_arguments(self, parser):
        parser.add_argument('--admin-username', default='admin_akademiso')
        parser.add_argument('--reset', action='store_true')

    def _thumbnail(self, title, colors):
        image = Image.new('RGB', (1200, 675), colors[0])
        draw = ImageDraw.Draw(image)
        for y in range(image.height):
            ratio = y / image.height
            color = tuple(int(colors[0][index] * (1 - ratio) + colors[1][index] * ratio) for index in range(3))
            draw.line([(0, y), (image.width, y)], fill=color)
        font = ImageFont.load_default(size=36)
        draw.rounded_rectangle((70, 65, 360, 125), radius=18, fill=(255, 255, 255))
        draw.text((95, 82), 'UJI COBA / QA', fill=(20, 55, 115), font=font)
        draw.multiline_text((75, 230), title, fill=(255, 255, 255), font=font, spacing=14)
        draw.text((75, 575), 'Akademiso • Bukan penawaran komersial', fill=(225, 235, 255), font=font)
        buffer = BytesIO()
        image.save(buffer, format='PNG', optimize=True)
        return ContentFile(buffer.getvalue())

    def _set_quiz(self, lesson, questions):
        quiz, _ = Quiz.objects.get_or_create(lesson=lesson, defaults={'pass_score': 70, 'time_limit': 20})
        quiz.pass_score = 70
        quiz.time_limit = 20
        quiz.save()
        quiz.questions.all().delete()
        for order, payload in enumerate(questions, start=1):
            question = Question.objects.create(
                quiz=quiz,
                question_type='MC',
                text=payload['text'],
                order=order,
            )
            for alt_order, answer in enumerate(payload['answers'], start=1):
                Alternative.objects.create(
                    question=question,
                    text=answer,
                    is_correct=alt_order == payload['correct'],
                    order=alt_order,
                )

    def handle(self, *args, **options):
        admin = User.objects.filter(username=options['admin_username']).first() or User.objects.filter(is_superuser=True).first()
        if not admin:
            raise CommandError('Admin user tidak ditemukan. Gunakan --admin-username.')

        if options['reset']:
            Course.objects.filter(slug__in=TRIAL_SLUGS).delete()

        trainer_user, _ = User.objects.get_or_create(
            username='trainer_trial_akademiso',
            defaults={
                'email': 'trainer.trial@akademiso.invalid',
                'first_name': 'Nadia',
                'last_name': 'Pratama',
                'is_active': True,
            },
        )
        trainer_user.set_unusable_password()
        trainer_user.save(update_fields=['password'])
        UserProfile.objects.get_or_create(user=trainer_user)
        instructor, _ = Instructor.objects.update_or_create(
            user=trainer_user,
            defaults={
                'name': 'Nadia Pratama (Trainer Uji)',
                'title': 'Lead Auditor ISO 9001 — Trial Profile',
                'bio': 'Profil trainer khusus pengujian end-to-end Akademiso. Bukan jadwal komersial resmi.',
                'expertise_areas': ['ISO 9001', 'Audit Internal', 'Quality Management System'],
                'approval_status': 'APPROVED',
                'approved_by': admin,
                'approved_at': timezone.now(),
            },
        )

        quality, _ = Category.objects.update_or_create(
            slug='sistem-manajemen-mutu',
            defaults={'name': 'Sistem Manajemen Mutu', 'icon': 'badge-check'},
        )
        audit, _ = Category.objects.update_or_create(
            slug='audit-dan-assessment',
            defaults={'name': 'Audit & Assessment', 'icon': 'clipboard-check'},
        )

        now = timezone.now()
        free_course, _ = Course.objects.update_or_create(
            slug=TRIAL_SLUGS[0],
            defaults={
                'title': '[UJI COBA] Awareness ISO 9001:2015 — Gratis',
                'type': 'webinar',
                'description': 'Program simulasi gratis untuk menguji pendaftaran, akses materi, presensi webinar, forum, dan kartu peserta tanpa pembayaran.',
                'detail_sections': [
                    {'id': 'tujuan', 'title': 'Tujuan Uji', 'body': 'Memvalidasi alur peserta gratis dari checkout sampai penyelesaian materi.', 'items': ['Pengenalan ISO 9001', 'Konteks organisasi', 'Pendekatan proses']},
                    {'id': 'catatan', 'title': 'Catatan Penting', 'body': 'Program ini hanya untuk QA dan tidak menerbitkan sertifikat kompetensi resmi.', 'items': []},
                ],
                'rundown_items': ['09:00 - 09:15 | Pembukaan', '09:15 - 10:00 | Awareness ISO 9001', '10:00 - 10:30 | Diskusi dan quiz'],
                'price': Decimal('0'),
                'discount_price': None,
                'instructor': instructor,
                'category': quality,
                'level': 'Beginner',
                'duration': '90 Menit',
                'delivery_mode': 'online',
                'scheduled_at': now + timedelta(days=7),
                'scheduled_end_at': now + timedelta(days=7, hours=2),
                'zoom_link': 'https://akademiso.isonesia.id/',
                'is_free': True,
                'is_active': True,
                'is_featured': True,
                'has_certification_exam': False,
                'elearning_enabled': True,
                'elearning_intro': 'Akses materi simulasi diberikan otomatis setelah checkout Rp0.',
                'public_training_enabled': False,
                'inhouse_training_enabled': False,
                'rating': Decimal('0'),
                'enrolled_count': 0,
            },
        )
        if not free_course.thumbnail:
            free_course.thumbnail.save(f'{free_course.slug}.png', self._thumbnail('Awareness ISO 9001\nGratis', ((20, 93, 160), (14, 165, 233))), save=True)

        free_section, _ = Section.objects.update_or_create(course=free_course, order=1, defaults={'title': 'Dasar ISO 9001'})
        Lesson.objects.update_or_create(
            course=free_course,
            order=1,
            defaults={
                'section': free_section,
                'title': 'Mengenal ISO 9001:2015',
                'type': 'article',
                'content': '<h2>Tujuan Pembelajaran</h2><p>Peserta memahami tujuan sistem manajemen mutu dan pendekatan proses.</p><h3>Pokok Bahasan</h3><ul><li>Fokus pelanggan</li><li>Kepemimpinan</li><li>Perbaikan berkelanjutan</li></ul>',
                'duration': '20 Menit',
            },
        )
        free_quiz_lesson, _ = Lesson.objects.update_or_create(
            course=free_course,
            order=2,
            defaults={'section': free_section, 'title': 'Quiz Awareness ISO 9001', 'type': 'quiz', 'duration': '10 Menit'},
        )
        self._set_quiz(free_quiz_lesson, [
            {'text': 'Apa fokus utama ISO 9001?', 'answers': ['Kepuasan pelanggan dan mutu proses', 'Kecepatan iklan', 'Jumlah cabang', 'Warna merek'], 'correct': 1},
            {'text': 'Siklus perbaikan yang umum digunakan adalah?', 'answers': ['SWOT', 'PDCA', 'FIFO', 'ROI'], 'correct': 2},
        ])

        paid_course, _ = Course.objects.update_or_create(
            slug=TRIAL_SLUGS[1],
            defaults={
                'title': '[UJI COBA] Internal Auditor ISO 9001:2015 — Berbayar',
                'type': 'course',
                'description': 'Program simulasi berbayar untuk menguji Midtrans Sandbox, materi, exam hybrid, review Trainer, dan penerbitan sertifikat PDF.',
                'detail_sections': [
                    {'id': 'kompetensi', 'title': 'Kompetensi', 'body': 'Menyusun program audit, melakukan wawancara, mencatat bukti, dan merumuskan temuan.', 'items': ['ISO 19011', 'Checklist audit', 'Laporan ketidaksesuaian']},
                    {'id': 'kelulusan', 'title': 'Ketentuan Kelulusan', 'body': 'Selesaikan materi, raih minimal 70% pada ujian tertulis, dan lulus review wawancara simulasi.', 'items': []},
                ],
                'rundown_items': ['08:30 - 09:00 | Registrasi', '09:00 - 12:00 | Prinsip audit ISO 19011', '13:00 - 15:30 | Simulasi audit', '15:30 - 16:30 | Exam dan evaluasi'],
                'price': Decimal('250000'),
                'discount_price': None,
                'instructor': instructor,
                'category': audit,
                'level': 'Intermediate',
                'duration': '1 Hari + E-Learning',
                'delivery_mode': 'online',
                'scheduled_at': now + timedelta(days=10),
                'scheduled_end_at': now + timedelta(days=10, hours=8),
                'zoom_link': 'https://akademiso.isonesia.id/',
                'is_free': False,
                'is_active': True,
                'is_featured': True,
                'has_certification_exam': True,
                'elearning_enabled': True,
                'elearning_intro': 'Materi, quiz, exam, dan sertifikat simulasi tersedia setelah pembayaran Sandbox berhasil.',
                'public_training_enabled': False,
                'inhouse_training_enabled': True,
                'inhouse_training_intro': 'Tersedia simulasi permintaan in-house untuk menguji follow-up Admin.',
                'inhouse_training_benefits': ['Materi dapat disesuaikan', 'Simulasi studi kasus organisasi'],
                'rating': Decimal('0'),
                'enrolled_count': 0,
            },
        )
        if not paid_course.thumbnail:
            paid_course.thumbnail.save(f'{paid_course.slug}.png', self._thumbnail('Internal Auditor ISO 9001\nBerbayar', ((49, 46, 129), (124, 58, 237))), save=True)

        paid_section, _ = Section.objects.update_or_create(course=paid_course, order=1, defaults={'title': 'Perencanaan dan Pelaksanaan Audit'})
        Lesson.objects.update_or_create(
            course=paid_course,
            order=1,
            defaults={
                'section': paid_section,
                'title': 'Prinsip Audit Berdasarkan ISO 19011',
                'type': 'article',
                'content': '<h2>Prinsip Audit</h2><p>Integritas, penyajian yang wajar, kehati-hatian profesional, kerahasiaan, independensi, pendekatan berbasis bukti, dan pendekatan berbasis risiko.</p>',
                'duration': '30 Menit',
            },
        )
        final_lesson, _ = Lesson.objects.update_or_create(
            course=paid_course,
            order=2,
            defaults={'section': paid_section, 'title': 'Post-Test Internal Auditor', 'type': 'final_test', 'duration': '20 Menit'},
        )
        self._set_quiz(final_lesson, [
            {'text': 'Bukti audit yang baik harus bersifat?', 'answers': ['Dapat diverifikasi', 'Berdasarkan dugaan', 'Selalu lisan', 'Rahasia dari auditee'], 'correct': 1},
            {'text': 'Ketidaksesuaian harus ditulis berdasarkan?', 'answers': ['Opini auditor', 'Bukti dan kriteria audit', 'Permintaan manajemen', 'Jumlah peserta'], 'correct': 2},
            {'text': 'Tujuan opening meeting adalah?', 'answers': ['Menetapkan hukuman', 'Mengonfirmasi rencana dan metode audit', 'Mengubah standar', 'Menerbitkan sertifikat'], 'correct': 2},
        ])

        exam, _ = CertificationExam.objects.update_or_create(
            course=paid_course,
            defaults={
                'title': 'Assessment Uji Internal Auditor ISO 9001',
                'description': 'Assessment hybrid khusus pengujian workflow Akademiso.',
                'exam_mode': 'HYBRID',
                'tested_materials': 'ISO 9001:2015, ISO 19011, perencanaan audit, bukti audit, dan pelaporan temuan.',
                'randomize_questions': True,
                'passing_percentage': 70,
                'is_active': True,
                'instructor_confirmed': True,
                'confirmed_start_at': now - timedelta(hours=1),
                'confirmed_end_at': now + timedelta(days=30),
            },
        )
        exam.questions.all().delete()
        exam_questions = [
            ('MC', 'Prinsip apa yang menjaga auditor bebas dari bias?', ['Kerahasiaan', 'Independensi', 'Kompetisi', 'Promosi'], 2),
            ('MC', 'Dokumen utama untuk mengarahkan pelaksanaan audit adalah?', ['Rencana audit', 'Brosur', 'Invoice', 'Sertifikat'], 1),
            ('Essay', 'Jelaskan cara menulis satu temuan ketidaksesuaian yang objektif.', [], 0),
        ]
        for order, (kind, text, answers, correct) in enumerate(exam_questions, start=1):
            question = CertificationQuestion.objects.create(exam=exam, question_type=kind, category_label='Audit Internal', text=text, order=order, points=10)
            for index, answer in enumerate(answers, start=1):
                CertificationAlternative.objects.create(question=question, text=answer, is_correct=index == correct)

        CertificationInstructorSlot.objects.update_or_create(
            exam=exam,
            instructor=instructor,
            date=(now + timedelta(days=3)).date(),
            start_time=time(10, 0),
            defaults={'end_time': time(10, 30), 'zoom_link': 'https://akademiso.isonesia.id/', 'is_booked': False},
        )
        CertificateTemplate.objects.update_or_create(
            name='Template Sertifikat Uji Internal Auditor',
            course=paid_course,
            defaults={
                'orientation': 'landscape',
                'signer_name': 'Manajemen Akademiso',
                'signer_title': 'Penanggung Jawab Program (Uji)',
                'notes': 'Template QA — bukan sertifikat kompetensi resmi.',
                'is_active': True,
            },
        )

        self.stdout.write(self.style.SUCCESS('Trial catalog seeded successfully.'))
        self.stdout.write(f'Free course: {free_course.slug}')
        self.stdout.write(f'Paid course: {paid_course.slug}')
        self.stdout.write('Trainer account uses an unusable password; test via Admin impersonation only.')
