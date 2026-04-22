from decimal import Decimal

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APITestCase

from .models import (
    Course, Instructor, Lesson, Order, Section,
    ORDER_OFFER_ELEARNING, ORDER_OFFER_PUBLIC
)
from .serializers import LessonSerializer


class CourseForumApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor_user = User.objects.create_user(
            username='mentor',
            email='mentor@example.com',
            password='secret123',
            first_name='Mentor',
        )
        self.instructor = Instructor.objects.create(
            user=self.instructor_user,
            name='Mentor Akademiso',
            title='Lead Trainer',
            bio='Instruktur utama',
        )
        self.course = Course.objects.create(
            title='ISO 9001 Foundation',
            slug='iso-9001-foundation',
            description='Kursus ISO 9001',
            price=Decimal('250000.00'),
            instructor=self.instructor,
            level='Beginner',
            duration='4 Jam',
        )
        self.student = User.objects.create_user(
            username='student',
            email='student@example.com',
            password='secret123',
            first_name='Peserta',
        )
        self.other_user = User.objects.create_user(
            username='outsider',
            email='outsider@example.com',
            password='secret123',
        )
        Order.objects.create(
            user=self.student,
            course=self.course,
            status='Completed',
            total_amount=Decimal('250000.00'),
        )

    def test_enrolled_student_can_create_topic_and_comment(self):
        self.client.force_authenticate(user=self.student)

        topic_response = self.client.post(
            f'/api/courses/{self.course.slug}/forum-topics/',
            {
                'title': 'Audit internal mulai dari mana?',
                'content': 'Saya ingin tahu urutan belajar yang paling efektif untuk audit internal.',
            },
            format='json',
        )
        self.assertEqual(topic_response.status_code, 201)
        self.assertEqual(topic_response.data['title'], 'Audit internal mulai dari mana?')
        topic_id = topic_response.data['id']

        comment_response = self.client.post(
            f'/api/courses/{self.course.slug}/forum-topics/{topic_id}/comments/',
            {
                'content': 'Saya juga tertarik, terutama bagian checklist audit.',
            },
            format='json',
        )
        self.assertEqual(comment_response.status_code, 201)
        self.assertEqual(comment_response.data['author']['username'], self.student.username)

        list_response = self.client.get(f'/api/courses/{self.course.slug}/forum-topics/')
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]['comment_count'], 1)
        self.assertEqual(len(list_response.data[0]['comments']), 1)

    def test_non_enrolled_user_cannot_access_course_forum(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(f'/api/courses/{self.course.slug}/forum-topics/')
        self.assertEqual(response.status_code, 403)


class CourseOfferAccessTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor_user = User.objects.create_user(
            username='trainer',
            email='trainer@example.com',
            password='secret123',
        )
        self.instructor = Instructor.objects.create(
            user=self.instructor_user,
            name='Trainer Akademiso',
            title='Lead Trainer',
            bio='Trainer utama',
        )
        self.course = Course.objects.create(
            title='ISO 27001 Implementer',
            slug='iso-27001-implementer',
            description='Kursus ISO 27001',
            price=Decimal('350000.00'),
            instructor=self.instructor,
            level='Intermediate',
            duration='6 Jam',
            public_training_enabled=True,
            public_sessions=[
                {
                    'id': 'public-online-1',
                    'title': 'Public Online',
                    'delivery_mode': 'online',
                    'schedule': '20 Mei 2026',
                    'location': 'Zoom',
                    'duration': '6 Jam',
                    'price': '450000',
                }
            ],
            elearning_enabled=True,
        )
        self.section = Section.objects.create(course=self.course, title='Modul 1', order=1)
        self.lesson = Lesson.objects.create(
            course=self.course,
            section=self.section,
            title='Pengenalan ISO 27001',
            type='article',
            content='Materi khusus e-learning',
            order=1,
        )
        self.elearning_user = User.objects.create_user(
            username='elearning-user',
            email='elearning@example.com',
            password='secret123',
        )
        self.public_user = User.objects.create_user(
            username='public-user',
            email='public@example.com',
            password='secret123',
        )
        Order.objects.create(
            user=self.elearning_user,
            course=self.course,
            offer_type=ORDER_OFFER_ELEARNING,
            status='Completed',
            total_amount=Decimal('350000.00'),
        )
        Order.objects.create(
            user=self.public_user,
            course=self.course,
            offer_type=ORDER_OFFER_PUBLIC,
            offer_mode='online',
            public_session_id='public-online-1',
            status='Completed',
            total_amount=Decimal('450000.00'),
        )

    def test_public_offer_does_not_unlock_elearning_content(self):
        self.client.force_authenticate(user=self.public_user)

        response = self.client.get(f'/api/courses/{self.course.slug}/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['is_enrolled'])
        self.assertEqual(
            response.data['sections'][0]['lessons'][0]['content'],
            'Konten ini hanya tersedia untuk peserta yang sudah terdaftar.'
        )
        self.assertTrue(response.data['sections'][0]['lessons'][0]['is_locked'])

    def test_only_elearning_offer_appears_in_my_courses(self):
        self.client.force_authenticate(user=self.public_user)
        public_response = self.client.get('/api/my-courses/')
        self.assertEqual(public_response.status_code, 200)
        self.assertEqual(len(public_response.data), 0)

        self.client.force_authenticate(user=self.elearning_user)
        elearning_response = self.client.get('/api/my-courses/')
        self.assertEqual(elearning_response.status_code, 200)
        self.assertEqual(len(elearning_response.data), 1)


class LessonAttachmentTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor_user = User.objects.create_user(
            username='doc-trainer',
            email='doc-trainer@example.com',
            password='secret123',
        )
        self.instructor = Instructor.objects.create(
            user=self.instructor_user,
            name='Document Trainer',
            title='Trainer',
            bio='Trainer dokumen',
        )
        self.course = Course.objects.create(
            title='ISO Documentation',
            slug='iso-documentation',
            description='Kursus dokumentasi',
            price=Decimal('100000.00'),
            instructor=self.instructor,
            level='Beginner',
            duration='2 Jam',
        )
        self.section = Section.objects.create(course=self.course, title='Modul Dokumen', order=1)

    def test_lesson_serializer_accepts_supported_document_attachment(self):
        serializer = LessonSerializer(
            data={
                'course': self.course.id,
                'section': self.section.id,
                'title': 'Template SOP',
                'type': 'article',
                'content': '<p>Unduh template SOP pada lampiran.</p>',
                'order': 1,
                'duration': '15 Menit',
                'attachment': SimpleUploadedFile(
                    'materi-iso.pdf',
                    b'%PDF-1.4 sample pdf content',
                    content_type='application/pdf',
                ),
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['attachment'].name, 'materi-iso.pdf')
