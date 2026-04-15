from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, InstructorViewSet, CourseViewSet, OrderViewSet,
    RegisterView, MyCoursesView, CartViewSet, UserViewSet, LessonViewSet,
    SectionViewSet, StatsView, AccountantStatsView, InstructorCoursesView, InstructorStudentsView,
    AdminResetPasswordView, AdminEditUserView, AdminImpersonateView, ProfileView,
    MidtransNotificationView, QuizAttemptView, CompleteLessonView, AccessLessonView,
    CertificationExamViewSet, CertificationQuestionViewSet, CertificationAlternativeViewSet, CertificationInstructorSlotViewSet,
    CertificationAttemptViewSet, CertificateViewSet, CertificateTemplateViewSet, InhouseTrainingRequestViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'instructors', InstructorViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'sections', SectionViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'inhouse-requests', InhouseTrainingRequestViewSet, basename='inhouse-request')
router.register(r'certification-exams', CertificationExamViewSet)
router.register(r'certification-questions', CertificationQuestionViewSet)
router.register(r'certification-alternatives', CertificationAlternativeViewSet)
router.register(r'certification-slots', CertificationInstructorSlotViewSet)
router.register(r'certification-attempts', CertificationAttemptViewSet)
router.register(r'certificates', CertificateViewSet)
router.register(r'certificate-templates', CertificateTemplateViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('my-courses/', MyCoursesView.as_view(), name='my-courses'),
    path('stats/', StatsView.as_view(), name='admin-stats'),
    path('accountant/stats/', AccountantStatsView.as_view(), name='accountant-stats'),
    path('instructor/courses/', InstructorCoursesView.as_view(), name='instructor-courses'),
    path('instructor/students/', InstructorStudentsView.as_view(), name='instructor-students'),
    # Admin user actions
    path('users/<int:pk>/reset-password/', AdminResetPasswordView.as_view(), name='admin-reset-password'),
    path('users/<int:pk>/edit/', AdminEditUserView.as_view(), name='admin-edit-user'),
    path('users/<int:pk>/impersonate/', AdminImpersonateView.as_view(), name='admin-impersonate'),
    path('profile/', ProfileView.as_view(), name='user-profile'),
    path('orders/notification/', MidtransNotificationView.as_view(), name='midtrans-notification'),
    path('lessons/<int:lesson_id>/quiz-attempt/', QuizAttemptView.as_view(), name='quiz-attempt'),
    path('lessons/<int:lesson_id>/complete/', CompleteLessonView.as_view(), name='lesson-complete'),
    path('lessons/<int:lesson_id>/access/', AccessLessonView.as_view(), name='lesson-access'),
]
