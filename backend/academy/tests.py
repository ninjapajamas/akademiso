from datetime import timedelta
from decimal import Decimal
from datetime import timedelta, time

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from .models import (
    Alternative, CartItem, Certificate, CertificationAttempt, CertificationExam, Course, CourseDiscussionComment, CourseFeedback, Instructor,
    CertificationAlternative, CertificationInstructorSlot, CertificationQuestion,
    InstructorWithdrawalRequest, Lesson, Order, Question, Quiz, Section, UserLessonProgress, UserProfile, UserQuizAttempt,
    ORDER_OFFER_ELEARNING, ORDER_OFFER_PUBLIC, STAFF_ROLE_ACCOUNTANT, StudentAccessLink, StudentAccessLinkClaim, get_order_total_amount
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

    def test_student_can_upload_edit_and_delete_own_comment(self):
        self.client.force_authenticate(user=self.student)

        topic_response = self.client.post(
            f'/api/courses/{self.course.slug}/forum-topics/',
            {
                'title': 'Butuh template audit',
                'content': 'Saya ingin contoh file yang bisa dipakai untuk audit internal.',
            },
            format='json',
        )
        self.assertEqual(topic_response.status_code, 201, topic_response.data)
        topic_id = topic_response.data['id']

        comment_response = self.client.post(
            f'/api/courses/{self.course.slug}/forum-topics/{topic_id}/comments/',
            {
                'content': 'Saya lampirkan catatan audit yang saya punya.',
                'attachment': SimpleUploadedFile('catatan-audit.pdf', b'%PDF-1.4 demo', content_type='application/pdf'),
            },
            format='multipart',
        )
        self.assertEqual(comment_response.status_code, 201, comment_response.data)
        comment_id = comment_response.data['id']
        self.assertTrue(comment_response.data['attachment_name'].endswith('.pdf'))
        self.assertTrue(comment_response.data['can_edit'])

        update_response = self.client.patch(
            f'/api/courses/{self.course.slug}/forum-topics/{topic_id}/comments/{comment_id}/',
            {
                'content': 'Saya perbarui dengan versi gambar agar lebih mudah dibaca.',
                'attachment': SimpleUploadedFile('audit.png', b'pngdata', content_type='image/png'),
            },
            format='multipart',
        )
        self.assertEqual(update_response.status_code, 200, update_response.data)
        self.assertEqual(update_response.data['content'], 'Saya perbarui dengan versi gambar agar lebih mudah dibaca.')
        self.assertTrue(update_response.data['attachment_name'].endswith('.png'))
        self.assertTrue(update_response.data['attachment_is_image'])

        delete_response = self.client.delete(
            f'/api/courses/{self.course.slug}/forum-topics/{topic_id}/comments/{comment_id}/'
        )
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(CourseDiscussionComment.objects.filter(pk=comment_id).exists())

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
        self.pre_test_lesson = Lesson.objects.create(
            course=self.course,
            section=self.section,
            title='Pre-Test Public',
            type='mid_test',
            order=2,
        )
        self.post_test_lesson = Lesson.objects.create(
            course=self.course,
            section=self.section,
            title='Post-Test Public',
            type='final_test',
            order=3,
        )
        self.pre_test_quiz = Quiz.objects.create(lesson=self.pre_test_lesson, pass_score=70)
        self.post_test_quiz = Quiz.objects.create(lesson=self.post_test_lesson, pass_score=70)
        self.pre_test_question = Question.objects.create(
            quiz=self.pre_test_quiz,
            text='Apa fokus utama ISO 27001?',
            order=1,
        )
        self.pre_test_correct = Alternative.objects.create(
            question=self.pre_test_question,
            text='Keamanan informasi',
            is_correct=True,
            order=1,
        )
        Alternative.objects.create(
            question=self.pre_test_question,
            text='Keselamatan kerja',
            is_correct=False,
            order=2,
        )
        self.post_test_question = Question.objects.create(
            quiz=self.post_test_quiz,
            text='Dokumen apa yang penting untuk audit?',
            order=1,
        )
        self.post_test_correct = Alternative.objects.create(
            question=self.post_test_question,
            text='Checklist audit',
            is_correct=True,
            order=1,
        )
        Alternative.objects.create(
            question=self.post_test_question,
            text='Poster promosi',
            is_correct=False,
            order=2,
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

        public_with_assessment_response = self.client.get('/api/my-courses/?include_public=1')
        self.assertEqual(public_with_assessment_response.status_code, 200)
        self.assertEqual(len(public_with_assessment_response.data), 1)
        self.assertEqual(public_with_assessment_response.data[0]['offer_type'], ORDER_OFFER_PUBLIC)

        self.client.force_authenticate(user=self.elearning_user)
        elearning_response = self.client.get('/api/my-courses/')
        self.assertEqual(elearning_response.status_code, 200)
        self.assertEqual(len(elearning_response.data), 1)

    def test_public_offer_can_access_assessment_lessons_and_submit_feedback(self):
        self.client.force_authenticate(user=self.public_user)

        response = self.client.get(f'/api/courses/{self.course.slug}/')
        self.assertEqual(response.status_code, 200)

        lessons = response.data['sections'][0]['lessons']
        article_payload = next(item for item in lessons if item['id'] == self.lesson.id)
        pre_test_payload = next(item for item in lessons if item['id'] == self.pre_test_lesson.id)
        post_test_payload = next(item for item in lessons if item['id'] == self.post_test_lesson.id)

        self.assertTrue(article_payload['is_locked'])
        self.assertFalse(pre_test_payload['is_locked'])
        self.assertFalse(post_test_payload['is_locked'])
        self.assertIsNotNone(pre_test_payload['quiz_data'])
        self.assertIsNotNone(post_test_payload['quiz_data'])

        pre_attempt_response = self.client.post(
            f'/api/lessons/{self.pre_test_lesson.id}/quiz-attempt/',
            {'answers': {str(self.pre_test_question.id): str(self.pre_test_correct.id)}},
            format='json',
        )
        self.assertEqual(pre_attempt_response.status_code, 200, pre_attempt_response.data)

        post_attempt_response = self.client.post(
            f'/api/lessons/{self.post_test_lesson.id}/quiz-attempt/',
            {'answers': {str(self.post_test_question.id): str(self.post_test_correct.id)}},
            format='json',
        )
        self.assertEqual(post_attempt_response.status_code, 200, post_attempt_response.data)

        feedback_response = self.client.post(
            f'/api/lessons/{self.post_test_lesson.id}/post-test-feedback/',
            {
                'criticism': 'Materi public training perlu ringkasan lebih cepat.',
                'suggestion': 'Tambahkan panduan singkat sebelum assessment dimulai.',
            },
            format='json',
        )
        self.assertEqual(feedback_response.status_code, 201, feedback_response.data)

    def test_public_offer_can_access_and_create_forum_topics(self):
        self.client.force_authenticate(user=self.public_user)

        response = self.client.post(
            f'/api/courses/{self.course.slug}/forum-topics/',
            {
                'title': 'Pertanyaan public training',
                'content': 'Apakah peserta public bisa berdiskusi di sini?',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['title'], 'Pertanyaan public training')


class MyCourseAssessmentScoreTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username='assessment-student',
            email='assessment-student@example.com',
            password='secret123',
        )
        self.instructor_user = User.objects.create_user(
            username='assessment-trainer',
            email='assessment-trainer@example.com',
            password='secret123',
        )
        self.instructor = Instructor.objects.create(
            user=self.instructor_user,
            name='Assessment Trainer',
            title='Lead Trainer',
            bio='Trainer untuk assessment',
        )

        self.course = Course.objects.create(
            title='ISO 27001 Awareness',
            slug='iso-27001-awareness',
            description='Kursus assessment ISO 27001',
            price=Decimal('300000.00'),
            instructor=self.instructor,
            level='Beginner',
            duration='3 Jam',
            elearning_enabled=True,
        )
        self.section = Section.objects.create(course=self.course, title='Modul 1', order=1)
        self.pre_test_lesson = Lesson.objects.create(
            course=self.course,
            section=self.section,
            title='Pre-Test Dasar',
            type='mid_test',
            order=1,
        )
        self.post_test_lesson = Lesson.objects.create(
            course=self.course,
            section=self.section,
            title='Post-Test Dasar',
            type='final_test',
            order=2,
        )
        self.pre_test_quiz = Quiz.objects.create(lesson=self.pre_test_lesson, pass_score=70)
        self.post_test_quiz = Quiz.objects.create(lesson=self.post_test_lesson, pass_score=70)
        Order.objects.create(
            user=self.student,
            course=self.course,
            offer_type=ORDER_OFFER_ELEARNING,
            status='Completed',
            total_amount=Decimal('300000.00'),
        )

        self.exam_fallback_course = Course.objects.create(
            title='ISO 45001 Final Exam',
            slug='iso-45001-final-exam',
            description='Kursus dengan ujian akhir sebagai post-test',
            price=Decimal('350000.00'),
            instructor=self.instructor,
            level='Intermediate',
            duration='4 Jam',
            elearning_enabled=True,
            has_certification_exam=True,
        )
        self.exam_fallback_section = Section.objects.create(course=self.exam_fallback_course, title='Modul Ujian', order=1)
        self.exam_fallback_pre_lesson = Lesson.objects.create(
            course=self.exam_fallback_course,
            section=self.exam_fallback_section,
            title='Pre-Test Ujian',
            type='mid_test',
            order=1,
        )
        self.exam_fallback_pre_quiz = Quiz.objects.create(lesson=self.exam_fallback_pre_lesson, pass_score=70)
        self.final_exam = CertificationExam.objects.create(
            course=self.exam_fallback_course,
            title='Ujian Akhir ISO 45001',
            description='Ujian akhir untuk course',
            exam_mode='QUESTIONS_ONLY',
            passing_percentage=70,
            is_active=True,
            instructor_confirmed=True,
        )
        Order.objects.create(
            user=self.student,
            course=self.exam_fallback_course,
            offer_type=ORDER_OFFER_ELEARNING,
            status='Completed',
            total_amount=Decimal('350000.00'),
        )

        self.client.force_authenticate(user=self.student)

    def test_my_courses_returns_pre_and_post_test_scores_from_lesson_attempts(self):
        UserQuizAttempt.objects.create(user=self.student, quiz=self.pre_test_quiz, score=Decimal('55.00'))
        UserQuizAttempt.objects.create(user=self.student, quiz=self.post_test_quiz, score=Decimal('88.00'))

        response = self.client.get('/api/my-courses/')
        self.assertEqual(response.status_code, 200, response.data)

        target_course = next(item for item in response.data if item['course']['slug'] == self.course.slug)
        self.assertEqual(target_course['pre_test_score'], 55.0)
        self.assertEqual(target_course['post_test_score'], 88.0)

    def test_my_courses_uses_certification_exam_score_as_post_test_fallback(self):
        UserQuizAttempt.objects.create(user=self.student, quiz=self.exam_fallback_pre_quiz, score=Decimal('67.50'))
        CertificationAttempt.objects.create(
            user=self.student,
            exam=self.final_exam,
            status='GRADED',
            score=Decimal('91.00'),
        )

        response = self.client.get('/api/my-courses/')
        self.assertEqual(response.status_code, 200, response.data)

        target_course = next(item for item in response.data if item['course']['slug'] == self.exam_fallback_course.slug)
        self.assertEqual(target_course['pre_test_score'], 67.5)
        self.assertEqual(target_course['post_test_score'], 91.0)


class CertificationAssessmentFlowTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username='assessment-flow-student',
            email='assessment-flow-student@example.com',
            password='secret123',
        )
        self.instructor_user = User.objects.create_user(
            username='assessment-flow-instructor',
            email='assessment-flow-instructor@example.com',
            password='secret123',
        )
        self.instructor = Instructor.objects.create(
            user=self.instructor_user,
            name='Assessment Flow Trainer',
            title='Lead Trainer',
            bio='Trainer assessment',
        )
        self.course = Course.objects.create(
            title='ISO 14001 Lead Implementer',
            slug='iso-14001-lead-implementer',
            description='Assessment flow course',
            price=Decimal('500000.00'),
            instructor=self.instructor,
            level='Advanced',
            duration='8 Jam',
            public_training_enabled=True,
            public_sessions=[
                {
                    'id': 'public-online-assessment',
                    'title': 'Public Assessment',
                    'delivery_mode': 'online',
                    'schedule': '15 Jun 2026',
                    'location': 'Zoom',
                    'duration': '8 Jam',
                    'price': '500000',
                }
            ],
        )
        self.exam = CertificationExam.objects.create(
            course=self.course,
            title='Assessment Akhir ISO 14001',
            description='Assessment final untuk peserta.',
            exam_mode='QUESTIONS_ONLY',
            is_active=True,
            instructor_confirmed=True,
            confirmed_start_at=timezone.now() - timedelta(hours=1),
            confirmed_end_at=timezone.now() + timedelta(hours=2),
        )
        self.question = CertificationQuestion.objects.create(
            exam=self.exam,
            question_type='MC',
            text='Dokumen apa yang paling relevan untuk evaluasi aspek lingkungan?',
            order=1,
            points=10,
        )
        self.correct_alternative = CertificationAlternative.objects.create(
            question=self.question,
            text='Register aspek dan dampak lingkungan',
            is_correct=True,
        )
        CertificationAlternative.objects.create(
            question=self.question,
            text='Poster promosi kantor',
            is_correct=False,
        )
        Order.objects.create(
            user=self.student,
            course=self.course,
            offer_type=ORDER_OFFER_PUBLIC,
            offer_mode='online',
            public_session_id='public-online-assessment',
            status='Completed',
            total_amount=Decimal('500000.00'),
        )
        self.client.force_authenticate(user=self.student)

    def test_public_participant_can_finish_assessment_and_get_downloadable_certificate(self):
        create_response = self.client.post(
            '/api/certification-attempts/',
            {'exam': self.exam.id},
            format='json',
        )
        self.assertEqual(create_response.status_code, 201, create_response.data)
        attempt_id = create_response.data['id']

        submit_response = self.client.post(
            f'/api/certification-attempts/{attempt_id}/submit_exam/',
            {'answers': {str(self.question.id): self.correct_alternative.id}},
            format='json',
        )
        self.assertEqual(submit_response.status_code, 200, submit_response.data)

        certificate = Certificate.objects.get(user=self.student, course=self.course, exam=self.exam)
        self.assertEqual(certificate.approval_status, Certificate.APPROVAL_APPROVED)

        list_response = self.client.get('/api/certificates/')
        self.assertEqual(list_response.status_code, 200, list_response.data)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]['approval_status'], Certificate.APPROVAL_APPROVED)
        self.assertTrue(list_response.data[0]['certificate_url'])


class CertificationAttemptScheduleActionsTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username='schedule-action-student',
            email='schedule-action-student@example.com',
            password='secret123',
        )
        self.instructor_user = User.objects.create_user(
            username='schedule-action-instructor',
            email='schedule-action-instructor@example.com',
            password='secret123',
        )
        self.instructor = Instructor.objects.create(
            user=self.instructor_user,
            name='Schedule Action Trainer',
            title='Trainer',
            bio='Trainer',
        )
        self.course = Course.objects.create(
            title='ISO 45001 Lead Auditor',
            slug='iso-45001-lead-auditor',
            description='Course untuk cancel schedule',
            price=Decimal('450000.00'),
            instructor=self.instructor,
            level='Advanced',
            duration='6 Jam',
            elearning_enabled=True,
        )
        self.exam = CertificationExam.objects.create(
            course=self.course,
            title='Assessment Slot Trainer',
            description='Assessment dengan slot trainer.',
            exam_mode='INTERVIEW_ONLY',
            is_active=True,
            instructor_confirmed=True,
            confirmed_start_at=timezone.now() + timedelta(days=1),
            confirmed_end_at=timezone.now() + timedelta(days=2),
        )
        self.slot = CertificationInstructorSlot.objects.create(
            exam=self.exam,
            instructor=self.instructor,
            date=(timezone.now() + timedelta(days=1)).date(),
            start_time=time(9, 0),
            end_time=time(10, 0),
            is_booked=False,
        )
        Order.objects.create(
            user=self.student,
            course=self.course,
            offer_type=ORDER_OFFER_ELEARNING,
            status='Completed',
            total_amount=Decimal('450000.00'),
        )
        self.client.force_authenticate(user=self.student)

    def test_student_can_cancel_pending_assessment_schedule_and_release_slot(self):
        create_response = self.client.post(
            '/api/certification-attempts/',
            {'exam': self.exam.id, 'interview_slot': self.slot.id},
            format='json',
        )
        self.assertEqual(create_response.status_code, 201, create_response.data)
        attempt_id = create_response.data['id']

        self.slot.refresh_from_db()
        self.assertTrue(self.slot.is_booked)

        cancel_response = self.client.post(f'/api/certification-attempts/{attempt_id}/cancel_schedule/')
        self.assertEqual(cancel_response.status_code, 200, cancel_response.data)
        self.assertEqual(cancel_response.data['status'], 'cancelled')

        self.slot.refresh_from_db()
        self.assertFalse(self.slot.is_booked)
        self.assertFalse(CertificationAttempt.objects.filter(pk=attempt_id).exists())


class PostTestFeedbackApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username='feedback-student',
            email='feedback-student@example.com',
            password='secret123',
            first_name='Bima',
            last_name='Peserta',
        )
        self.instructor_user = User.objects.create_user(
            username='feedback-trainer',
            email='feedback-trainer@example.com',
            password='secret123',
            first_name='Rani',
        )
        self.other_instructor_user = User.objects.create_user(
            username='feedback-other-trainer',
            email='feedback-other-trainer@example.com',
            password='secret123',
        )
        self.admin = User.objects.create_user(
            username='feedback-admin',
            email='feedback-admin@example.com',
            password='secret123',
            is_staff=True,
            is_superuser=True,
        )
        self.instructor = Instructor.objects.create(
            user=self.instructor_user,
            name='Rani Trainer',
            title='Lead Trainer',
            bio='Trainer utama',
            approval_status=Instructor.APPROVAL_APPROVED,
        )
        self.other_instructor = Instructor.objects.create(
            user=self.other_instructor_user,
            name='Trainer Lain',
            title='Trainer',
            bio='Trainer lain',
            approval_status=Instructor.APPROVAL_APPROVED,
        )
        self.course = Course.objects.create(
            title='ISO 22301 Awareness',
            slug='iso-22301-awareness',
            description='Kursus awareness',
            price=Decimal('200000.00'),
            instructor=self.instructor,
            level='Beginner',
            duration='2 Jam',
            elearning_enabled=True,
        )
        self.section = Section.objects.create(course=self.course, title='Modul 1', order=1)
        self.post_test_lesson = Lesson.objects.create(
            course=self.course,
            section=self.section,
            title='Post-Test',
            type='final_test',
            order=1,
        )
        self.quiz = Quiz.objects.create(lesson=self.post_test_lesson, pass_score=70)
        Order.objects.create(
            user=self.student,
            course=self.course,
            offer_type=ORDER_OFFER_ELEARNING,
            status='Completed',
            total_amount=Decimal('200000.00'),
        )

    def test_student_can_submit_and_read_post_test_feedback(self):
        attempt = UserQuizAttempt.objects.create(user=self.student, quiz=self.quiz, score=Decimal('92.00'))
        self.client.force_authenticate(user=self.student)

        response = self.client.post(
            f'/api/lessons/{self.post_test_lesson.id}/post-test-feedback/',
            {
                'criticism': 'Tempo belajar pada modul akhir terasa cepat.',
                'suggestion': 'Tambahkan contoh audit lebih banyak.',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data['has_feedback'])
        self.assertEqual(response.data['quiz_attempt'], attempt.id)

        feedback = CourseFeedback.objects.get(course=self.course, user=self.student)
        self.assertEqual(feedback.criticism, 'Tempo belajar pada modul akhir terasa cepat.')
        self.assertEqual(feedback.suggestion, 'Tambahkan contoh audit lebih banyak.')

        get_response = self.client.get(f'/api/lessons/{self.post_test_lesson.id}/post-test-feedback/')
        self.assertEqual(get_response.status_code, 200, get_response.data)
        self.assertTrue(get_response.data['has_feedback'])
        self.assertEqual(get_response.data['user_name'], 'Bima Peserta')

    def test_student_cannot_submit_feedback_before_finishing_post_test(self):
        self.client.force_authenticate(user=self.student)

        response = self.client.post(
            f'/api/lessons/{self.post_test_lesson.id}/post-test-feedback/',
            {
                'criticism': 'Materi sulit diikuti.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn('Selesaikan post-test terlebih dahulu', response.data['error'])

    def test_related_instructor_and_admin_can_view_course_feedback(self):
        attempt = UserQuizAttempt.objects.create(user=self.student, quiz=self.quiz, score=Decimal('88.00'))
        CourseFeedback.objects.create(
            course=self.course,
            user=self.student,
            lesson=self.post_test_lesson,
            quiz_attempt=attempt,
            criticism='Butuh lebih banyak studi kasus.',
            suggestion='Tambahkan file checklist audit.',
        )

        self.client.force_authenticate(user=self.instructor_user)
        instructor_response = self.client.get(f'/api/courses/{self.course.slug}/feedback/')
        self.assertEqual(instructor_response.status_code, 200, instructor_response.data)
        self.assertEqual(instructor_response.data['count'], 1)
        self.assertEqual(instructor_response.data['results'][0]['user_name'], 'Bima Peserta')

        self.client.force_authenticate(user=self.admin)
        admin_response = self.client.get(f'/api/courses/{self.course.slug}/feedback/')
        self.assertEqual(admin_response.status_code, 200, admin_response.data)
        self.assertEqual(admin_response.data['results'][0]['quiz_score'], 88.0)

    def test_unrelated_instructor_cannot_view_course_feedback(self):
        self.client.force_authenticate(user=self.other_instructor_user)
        response = self.client.get(f'/api/courses/{self.course.slug}/feedback/')
        self.assertEqual(response.status_code, 403, response.data)


class CourseAttendanceApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor_user = User.objects.create_user(
            username='attendance-trainer',
            email='attendance-trainer@example.com',
            password='secret123',
        )
        self.other_instructor_user = User.objects.create_user(
            username='attendance-other',
            email='attendance-other@example.com',
            password='secret123',
        )
        self.admin = User.objects.create_user(
            username='attendance-admin',
            email='attendance-admin@example.com',
            password='secret123',
            is_staff=True,
            is_superuser=True,
        )
        self.instructor = Instructor.objects.create(
            user=self.instructor_user,
            name='Attendance Trainer',
            title='Lead Trainer',
            bio='Trainer presensi',
            approval_status=Instructor.APPROVAL_APPROVED,
        )
        self.other_instructor = Instructor.objects.create(
            user=self.other_instructor_user,
            name='Trainer Lain',
            title='Trainer',
            bio='Trainer lain',
            approval_status=Instructor.APPROVAL_APPROVED,
        )
        self.course = Course.objects.create(
            title='ISO 14001 Attendance',
            slug='iso-14001-attendance',
            description='Course presensi otomatis',
            price=Decimal('200000.00'),
            instructor=self.instructor,
            level='Beginner',
            duration='3 Jam',
            type='course',
            elearning_enabled=True,
        )
        section = Section.objects.create(course=self.course, title='Modul 1', order=1)
        self.pre_test_lesson = Lesson.objects.create(
            course=self.course,
            section=section,
            title='Pre-Test',
            type='mid_test',
            order=1,
        )
        self.post_test_lesson = Lesson.objects.create(
            course=self.course,
            section=section,
            title='Post-Test',
            type='final_test',
            order=2,
        )
        self.pre_quiz = Quiz.objects.create(lesson=self.pre_test_lesson, pass_score=70)
        self.post_quiz = Quiz.objects.create(lesson=self.post_test_lesson, pass_score=70)

        self.present_student = User.objects.create_user(
            username='present-student',
            email='present@example.com',
            password='secret123',
            first_name='Hadir',
            last_name='Lengkap',
        )
        self.absent_student = User.objects.create_user(
            username='absent-student',
            email='absent@example.com',
            password='secret123',
            first_name='Belum',
            last_name='Lengkap',
        )

        Order.objects.create(
            user=self.present_student,
            course=self.course,
            offer_type=ORDER_OFFER_ELEARNING,
            status='Completed',
            total_amount=Decimal('200000.00'),
        )
        Order.objects.create(
            user=self.absent_student,
            course=self.course,
            offer_type=ORDER_OFFER_ELEARNING,
            status='Completed',
            total_amount=Decimal('200000.00'),
        )

        UserQuizAttempt.objects.create(user=self.present_student, quiz=self.pre_quiz, score=Decimal('75.00'))
        UserQuizAttempt.objects.create(user=self.present_student, quiz=self.post_quiz, score=Decimal('88.00'))
        UserQuizAttempt.objects.create(user=self.absent_student, quiz=self.pre_quiz, score=Decimal('62.00'))

    def test_related_instructor_can_view_course_attendance(self):
        self.client.force_authenticate(user=self.instructor_user)
        response = self.client.get(f'/api/courses/{self.course.slug}/attendance/')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(response.data['present_count'], 1)
        self.assertEqual(response.data['absent_count'], 1)
        self.assertTrue(response.data['requirements']['has_pre_test'])
        self.assertTrue(response.data['requirements']['has_post_test'])

        present_row = next(item for item in response.data['results'] if item['user_id'] == self.present_student.id)
        absent_row = next(item for item in response.data['results'] if item['user_id'] == self.absent_student.id)

        self.assertTrue(present_row['pre_test_completed'])
        self.assertTrue(present_row['post_test_completed'])
        self.assertTrue(present_row['is_present'])
        self.assertEqual(present_row['post_test_score'], 88.0)

        self.assertTrue(absent_row['pre_test_completed'])
        self.assertFalse(absent_row['post_test_completed'])
        self.assertFalse(absent_row['is_present'])

    def test_admin_can_view_course_attendance(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/courses/{self.course.slug}/attendance/')
        self.assertEqual(response.status_code, 200, response.data)

    def test_unrelated_instructor_cannot_view_course_attendance(self):
        self.client.force_authenticate(user=self.other_instructor_user)
        response = self.client.get(f'/api/courses/{self.course.slug}/attendance/')
        self.assertEqual(response.status_code, 403, response.data)


class InstructorWithdrawalApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor_user = User.objects.create_user(
            username='finance-trainer',
            email='finance-trainer@example.com',
            password='secret123',
            first_name='Finance',
            last_name='Trainer',
        )
        self.instructor = Instructor.objects.create(
            user=self.instructor_user,
            name='Finance Trainer',
            title='Lead Trainer',
            bio='Instruktur untuk skenario payout',
        )
        self.course = Course.objects.create(
            title='ISO 22301 Internal Audit',
            slug='iso-22301-internal-audit',
            description='Kursus audit kontinuitas bisnis',
            price=Decimal('500000.00'),
            instructor=self.instructor,
            level='Intermediate',
            duration='8 Jam',
        )
        self.student = User.objects.create_user(
            username='finance-student',
            email='finance-student@example.com',
            password='secret123',
        )
        Order.objects.create(
            user=self.student,
            course=self.course,
            status='Completed',
            total_amount=Decimal('500000.00'),
        )

        profile, _ = UserProfile.objects.get_or_create(user=self.instructor_user)
        profile.bank_name = 'Bank Akademiso'
        profile.bank_account_number = '1234567890'
        profile.bank_account_holder = 'Finance Trainer'
        profile.npwp = '09.876.543.2-109.000'
        profile.save()

        self.accountant_user = User.objects.create_user(
            username='akuntan',
            email='akuntan@example.com',
            password='secret123',
            is_staff=True,
        )
        accountant_profile, _ = UserProfile.objects.get_or_create(user=self.accountant_user)
        accountant_profile.staff_role = STAFF_ROLE_ACCOUNTANT
        accountant_profile.save(update_fields=['staff_role'])

    def test_instructor_can_create_withdrawal_request_and_balance_is_reserved(self):
        self.client.force_authenticate(user=self.instructor_user)

        response = self.client.post(
            '/api/instructor/withdrawals/',
            {
                'amount': '200000.00',
                'note': 'Mohon dicairkan minggu ini.',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(InstructorWithdrawalRequest.objects.count(), 1)
        self.assertEqual(response.data['withdrawal']['status'], 'PENDING')
        self.assertAlmostEqual(response.data['finance_summary']['available_balance'], 250000.0, places=2)
        self.assertIn('wa.me', response.data['whatsapp_url'])

    def test_instructor_cannot_request_more_than_available_balance(self):
        self.client.force_authenticate(user=self.instructor_user)

        response = self.client.post(
            '/api/instructor/withdrawals/',
            {
                'amount': '999999.00',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn('melebihi saldo', response.data['error'])

    def test_accountant_can_approve_and_mark_withdrawal_paid(self):
        withdrawal = InstructorWithdrawalRequest.objects.create(
            instructor=self.instructor,
            requested_by=self.instructor_user,
            amount=Decimal('150000.00'),
            note='Siap diproses',
            bank_name_snapshot='Bank Akademiso',
            bank_account_number_snapshot='1234567890',
            bank_account_holder_snapshot='Finance Trainer',
            npwp_snapshot='09.876.543.2-109.000',
        )

        self.client.force_authenticate(user=self.accountant_user)

        approve_response = self.client.patch(
            f'/api/accountant/withdrawals/{withdrawal.id}/',
            {
                'status': 'APPROVED',
                'accountant_notes': 'Dokumen lengkap.',
            },
            format='json',
        )
        self.assertEqual(approve_response.status_code, 200, approve_response.data)
        withdrawal.refresh_from_db()
        self.assertEqual(withdrawal.status, 'APPROVED')
        self.assertEqual(withdrawal.reviewed_by_id, self.accountant_user.id)

        paid_response = self.client.patch(
            f'/api/accountant/withdrawals/{withdrawal.id}/',
            {
                'status': 'PAID',
                'accountant_notes': 'Dana sudah ditransfer.',
            },
            format='json',
        )
        self.assertEqual(paid_response.status_code, 200, paid_response.data)
        withdrawal.refresh_from_db()
        self.assertEqual(withdrawal.status, 'PAID')
        self.assertIsNotNone(withdrawal.paid_at)


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


class CartOfferTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='cart-user',
            email='cart@example.com',
            password='secret123',
        )
        self.instructor_user = User.objects.create_user(
            username='cart-trainer',
            email='cart-trainer@example.com',
            password='secret123',
        )
        self.instructor = Instructor.objects.create(
            user=self.instructor_user,
            name='Cart Trainer',
            title='Lead Trainer',
            bio='Trainer utama',
        )
        self.course = Course.objects.create(
            title='ISO 22301 Awareness',
            slug='iso-22301-awareness',
            description='Kursus ISO 22301',
            price=Decimal('300000.00'),
            instructor=self.instructor,
            level='Beginner',
            duration='3 Jam',
            elearning_enabled=True,
            public_training_enabled=True,
            public_sessions=[
                {
                    'id': 'public-offline-1',
                    'title': 'Public Offline Jakarta',
                    'delivery_mode': 'offline',
                    'schedule': '10 Juni 2026',
                    'location': 'Jakarta',
                    'duration': '1 Hari',
                    'price': '650000',
                }
            ],
        )
        self.client.force_authenticate(user=self.user)

    def test_cart_can_store_elearning_and_public_for_same_course(self):
        elearning_response = self.client.post(
            '/api/cart/add_item/',
            {
                'course_id': self.course.id,
                'offer_type': ORDER_OFFER_ELEARNING,
            },
            format='json',
        )
        self.assertEqual(elearning_response.status_code, 201)

        public_response = self.client.post(
            '/api/cart/add_item/',
            {
                'course_id': self.course.id,
                'offer_type': ORDER_OFFER_PUBLIC,
                'offer_mode': 'offline',
                'public_session_id': 'public-offline-1',
            },
            format='json',
        )
        self.assertEqual(public_response.status_code, 201)
        self.assertEqual(CartItem.objects.count(), 2)

        cart_response = self.client.get('/api/cart/')
        self.assertEqual(cart_response.status_code, 200)
        self.assertEqual(len(cart_response.data['items']), 2)
        offer_types = {item['offer_type'] for item in cart_response.data['items']}
        self.assertEqual(offer_types, {ORDER_OFFER_ELEARNING, ORDER_OFFER_PUBLIC})

    def test_cart_rejects_public_offer_without_valid_session(self):
        response = self.client.post(
            '/api/cart/add_item/',
            {
                'course_id': self.course.id,
                'offer_type': ORDER_OFFER_PUBLIC,
                'offer_mode': 'offline',
                'public_session_id': 'missing-session',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('public_session_id', response.data)

    def test_course_level_public_mode_price_supports_discount_and_fallback_session(self):
        fallback_course = Course.objects.create(
            title='ISO 50001 Public Hybrid',
            slug='iso-50001-public-hybrid',
            description='Kursus ISO 50001',
            price=Decimal('550000.00'),
            instructor=self.instructor,
            level='Intermediate',
            duration='2 Hari',
            elearning_enabled=False,
            public_training_enabled=True,
            public_sessions=[],
            public_online_price=Decimal('725000.00'),
            public_online_discount_price=Decimal('650000.00'),
        )

        total_amount = get_order_total_amount(
            fallback_course,
            offer_type=ORDER_OFFER_PUBLIC,
            offer_mode='online',
            public_session_id='public-online',
        )
        self.assertEqual(total_amount, Decimal('650000.00'))

        response = self.client.post(
            '/api/cart/add_item/',
            {
                'course_id': fallback_course.id,
                'offer_type': ORDER_OFFER_PUBLIC,
                'offer_mode': 'online',
                'public_session_id': 'public-online',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)

        item = CartItem.objects.filter(course=fallback_course).latest('id')
        self.assertEqual(item.offer_type, ORDER_OFFER_PUBLIC)
        self.assertEqual(item.offer_mode, 'online')
        self.assertEqual(item.public_session_id, 'public-online')


class StudentAccessLinkTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin-link',
            email='admin-link@example.com',
            password='secret123',
            is_staff=True,
            is_superuser=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_can_create_and_public_can_claim_link_until_quota_exhausted(self):
        create_response = self.client.post(
            '/api/student-access-links/',
            {
                'name': 'Akses Peserta Inhouse Batch A',
                'description': 'Dipakai untuk peserta inhouse yang belum punya akun.',
                'max_uses': 2,
                'redirect_path': '/dashboard/settings?welcome=1&claimed=1',
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, 201, create_response.data)
        token = create_response.data['token']

        public_client = APIClient()
        preview_response = public_client.get(f'/api/student-access-links/{token}/claim/')
        self.assertEqual(preview_response.status_code, 200)
        self.assertEqual(preview_response.data['remaining_uses'], 2)

        first_claim = public_client.post(f'/api/student-access-links/{token}/claim/', format='json')
        self.assertEqual(first_claim.status_code, 200, first_claim.data)
        self.assertIn('access', first_claim.data)
        self.assertEqual(User.objects.filter(is_staff=False).count(), 1)

        second_claim = public_client.post(f'/api/student-access-links/{token}/claim/', format='json')
        self.assertEqual(second_claim.status_code, 200, second_claim.data)
        self.assertEqual(User.objects.filter(is_staff=False).count(), 2)

        exhausted_claim = public_client.post(f'/api/student-access-links/{token}/claim/', format='json')
        self.assertEqual(exhausted_claim.status_code, 410)

        link = StudentAccessLink.objects.get(token=token)
        self.assertEqual(link.used_count, 2)
        self.assertEqual(StudentAccessLinkClaim.objects.filter(link=link).count(), 2)


class GamificationApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username='gamer-student',
            email='gamer@example.com',
            password='secret123',
        )
        instructor_user = User.objects.create_user(
            username='gamer-instructor',
            email='gamer-instructor@example.com',
            password='secret123',
        )
        instructor = Instructor.objects.create(
            user=instructor_user,
            name='Gamer Trainer',
            title='Lead Trainer',
            bio='Trainer untuk test gamifikasi',
        )
        self.course = Course.objects.create(
            title='ISO 31000 Risk Management',
            slug='iso-31000-risk-management',
            description='Kursus ISO 31000',
            price=Decimal('400000.00'),
            instructor=instructor,
            level='Intermediate',
            duration='5 Jam',
            elearning_enabled=True,
        )
        self.section = Section.objects.create(course=self.course, title='Modul Inti', order=1)
        self.article_lesson = Lesson.objects.create(
            course=self.course,
            section=self.section,
            title='Pendahuluan Risiko',
            type='article',
            content='Materi risiko dasar',
            order=1,
        )
        self.quiz_lesson = Lesson.objects.create(
            course=self.course,
            section=self.section,
            title='Quiz Risiko',
            type='quiz',
            order=2,
        )
        self.quiz = Quiz.objects.create(lesson=self.quiz_lesson, pass_score=70)
        self.question = Question.objects.create(
            quiz=self.quiz,
            text='Apa tujuan ISO 31000?',
            order=1,
        )
        self.correct_alternative = Alternative.objects.create(
            question=self.question,
            text='Mengelola risiko secara sistematis',
            is_correct=True,
            order=1,
        )
        Alternative.objects.create(
            question=self.question,
            text='Menghapus seluruh risiko',
            is_correct=False,
            order=2,
        )
        Order.objects.create(
            user=self.student,
            course=self.course,
            offer_type=ORDER_OFFER_ELEARNING,
            status='Completed',
            total_amount=Decimal('400000.00'),
        )
        self.client.force_authenticate(user=self.student)

    def test_complete_lesson_returns_incremental_gamification_payload(self):
        first_response = self.client.post(f'/api/lessons/{self.article_lesson.id}/complete/')
        self.assertEqual(first_response.status_code, 200, first_response.data)
        self.assertEqual(first_response.data['gamification']['earned_xp'], 20)
        self.assertEqual(first_response.data['gamification']['total_xp'], 20)
        self.assertEqual(len(first_response.data['gamification']['new_badges']), 1)
        self.assertEqual(first_response.data['gamification']['new_badges'][0]['key'], 'first_step')

        second_response = self.client.post(f'/api/lessons/{self.article_lesson.id}/complete/')
        self.assertEqual(second_response.status_code, 200, second_response.data)
        self.assertEqual(second_response.data['gamification']['earned_xp'], 0)
        self.assertEqual(second_response.data['gamification']['total_xp'], 20)

    def test_gamification_activity_and_leaderboard_endpoints(self):
        now = timezone.now()
        UserLessonProgress.objects.create(user=self.student, lesson=self.article_lesson, is_completed=True)
        UserLessonProgress.objects.create(user=self.student, lesson=self.quiz_lesson, is_completed=True)
        attempt = UserQuizAttempt.objects.create(user=self.student, quiz=self.quiz, score=Decimal('100.00'))
        UserQuizAttempt.objects.filter(pk=attempt.pk).update(completed_at=now)
        Certificate.objects.create(
            user=self.student,
            course=self.course,
            exam=None,
            approval_status=Certificate.APPROVAL_APPROVED,
            approved_at=now,
        )

        peer = User.objects.create_user(
            username='peer-student',
            email='peer@example.com',
            password='secret123',
            first_name='Peer',
            last_name='Student',
        )
        Order.objects.create(
            user=peer,
            course=self.course,
            offer_type=ORDER_OFFER_ELEARNING,
            status='Completed',
            total_amount=Decimal('400000.00'),
        )
        UserLessonProgress.objects.create(user=peer, lesson=self.article_lesson, is_completed=True)

        activity_response = self.client.get('/api/gamification/activity/')
        self.assertEqual(activity_response.status_code, 200, activity_response.data)
        activity_types = {item['type'] for item in activity_response.data}
        self.assertTrue({'lesson_completed', 'quiz_passed', 'perfect_quiz', 'course_completed', 'certificate_approved'}.issubset(activity_types))

        leaderboard_response = self.client.get('/api/gamification/leaderboard/')
        self.assertEqual(leaderboard_response.status_code, 200, leaderboard_response.data)
        self.assertGreaterEqual(len(leaderboard_response.data['leaders']), 2)
        self.assertEqual(leaderboard_response.data['leaders'][0]['user_id'], self.student.id)
        self.assertEqual(leaderboard_response.data['leaders'][0]['rank'], 1)
        self.assertTrue(leaderboard_response.data['leaders'][0]['is_current_user'])

    def test_gamification_summary_aggregates_xp_streak_badges_and_certificates(self):
        now = timezone.now()
        progress_one = UserLessonProgress.objects.create(user=self.student, lesson=self.article_lesson, is_completed=True)
        progress_two = UserLessonProgress.objects.create(user=self.student, lesson=self.quiz_lesson, is_completed=True)
        UserLessonProgress.objects.filter(pk=progress_one.pk).update(updated_at=now - timedelta(days=2))
        UserLessonProgress.objects.filter(pk=progress_two.pk).update(updated_at=now - timedelta(days=1))
        attempt = UserQuizAttempt.objects.create(user=self.student, quiz=self.quiz, score=Decimal('100.00'))
        UserQuizAttempt.objects.filter(pk=attempt.pk).update(completed_at=now)
        Certificate.objects.create(
            user=self.student,
            course=self.course,
            exam=None,
            approval_status=Certificate.APPROVAL_APPROVED,
            approved_at=now,
        )

        response = self.client.get('/api/gamification/summary/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total_xp'], 420)
        self.assertEqual(response.data['level']['current'], 3)
        self.assertEqual(response.data['streak']['current'], 3)
        self.assertEqual(response.data['streak']['longest'], 3)
        self.assertEqual(response.data['stats']['completed_lessons'], 2)
        self.assertEqual(response.data['stats']['passed_quizzes'], 1)
        self.assertEqual(response.data['stats']['perfect_quizzes'], 1)
        self.assertEqual(response.data['stats']['completed_courses'], 1)
        self.assertEqual(response.data['stats']['approved_certificates'], 1)

        earned_badges = {
            badge['key']
            for badge in response.data['badges']
            if badge['earned']
        }
        self.assertTrue({'first_step', 'steady_learner', 'quiz_conqueror', 'perfect_score', 'course_finisher', 'certified_ready'}.issubset(earned_badges))
