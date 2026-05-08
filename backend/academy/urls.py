from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, InstructorViewSet, ProjectViewSet, CourseViewSet, OrderViewSet,
    ReferralCodeViewSet,
    RegisterView, GoogleAuthView, MyCoursesView, CartViewSet, UserViewSet, LessonViewSet,
    SectionViewSet, StatsView, AccountantStatsView, ProjectManagerStatsView, InstructorCoursesView, InstructorStudentsView,
    AdminResetPasswordView, AdminEditUserView, AdminImpersonateView, ProfileView,
    MidtransNotificationView, QuizAttemptView, PostTestFeedbackView, CourseFeedbackListView, CompleteLessonView, AccessLessonView,
    GamificationSummaryView, GamificationLeaderboardView, GamificationActivityView,
    CertificationExamViewSet, CertificationQuestionViewSet, CertificationAlternativeViewSet, CertificationInstructorSlotViewSet,
    CertificationAttemptViewSet, CertificateViewSet, CertificateTemplateViewSet, InhouseTrainingRequestViewSet,
    CourseDiscussionTopicListCreateView, CourseDiscussionCommentCreateView, CourseDiscussionCommentDetailView,
    StudentAccessLinkViewSet, StudentAccessLinkClaimView, InstructorWithdrawalRequestListCreateView,
    AffiliateApplicationListView, AffiliateApplicationReviewView,
    AccountantWithdrawalRequestListView, AccountantWithdrawalRequestDetailView
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'instructors', InstructorViewSet)
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'courses', CourseViewSet)
router.register(r'sections', SectionViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'referrals', ReferralCodeViewSet, basename='referral')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'inhouse-requests', InhouseTrainingRequestViewSet, basename='inhouse-request')
router.register(r'certification-exams', CertificationExamViewSet)
router.register(r'certification-questions', CertificationQuestionViewSet)
router.register(r'certification-alternatives', CertificationAlternativeViewSet)
router.register(r'certification-slots', CertificationInstructorSlotViewSet)
router.register(r'certification-attempts', CertificationAttemptViewSet)
router.register(r'certificates', CertificateViewSet)
router.register(r'certificate-templates', CertificateTemplateViewSet)
router.register(r'student-access-links', StudentAccessLinkViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('auth/google/', GoogleAuthView.as_view(), name='auth_google'),
    path('my-courses/', MyCoursesView.as_view(), name='my-courses'),
    path('gamification/summary/', GamificationSummaryView.as_view(), name='gamification-summary'),
    path('gamification/leaderboard/', GamificationLeaderboardView.as_view(), name='gamification-leaderboard'),
    path('gamification/activity/', GamificationActivityView.as_view(), name='gamification-activity'),
    path('stats/', StatsView.as_view(), name='admin-stats'),
    path('accountant/stats/', AccountantStatsView.as_view(), name='accountant-stats'),
    path('project-manager/stats/', ProjectManagerStatsView.as_view(), name='project-manager-stats'),
    path('accountant/withdrawals/', AccountantWithdrawalRequestListView.as_view(), name='accountant-withdrawals'),
    path('accountant/withdrawals/<int:withdrawal_id>/', AccountantWithdrawalRequestDetailView.as_view(), name='accountant-withdrawal-detail'),
    path('affiliate-applications/', AffiliateApplicationListView.as_view(), name='affiliate-applications'),
    path('affiliate-applications/<int:user_id>/', AffiliateApplicationReviewView.as_view(), name='affiliate-application-review'),
    path('instructor/courses/', InstructorCoursesView.as_view(), name='instructor-courses'),
    path('instructor/students/', InstructorStudentsView.as_view(), name='instructor-students'),
    path('instructor/withdrawals/', InstructorWithdrawalRequestListCreateView.as_view(), name='instructor-withdrawals'),
    # Admin user actions
    path('users/<int:pk>/reset-password/', AdminResetPasswordView.as_view(), name='admin-reset-password'),
    path('users/<int:pk>/edit/', AdminEditUserView.as_view(), name='admin-edit-user'),
    path('users/<int:pk>/impersonate/', AdminImpersonateView.as_view(), name='admin-impersonate'),
    path('profile/', ProfileView.as_view(), name='user-profile'),
    path('orders/notification/', MidtransNotificationView.as_view(), name='midtrans-notification'),
    path('lessons/<int:lesson_id>/quiz-attempt/', QuizAttemptView.as_view(), name='quiz-attempt'),
    path('lessons/<int:lesson_id>/post-test-feedback/', PostTestFeedbackView.as_view(), name='post-test-feedback'),
    path('lessons/<int:lesson_id>/complete/', CompleteLessonView.as_view(), name='lesson-complete'),
    path('lessons/<int:lesson_id>/access/', AccessLessonView.as_view(), name='lesson-access'),
    path('courses/<slug:course_slug>/feedback/', CourseFeedbackListView.as_view(), name='course-feedback-list'),
    path('courses/<slug:course_slug>/forum-topics/', CourseDiscussionTopicListCreateView.as_view(), name='course-forum-topics'),
    path('courses/<slug:course_slug>/forum-topics/<int:topic_id>/comments/', CourseDiscussionCommentCreateView.as_view(), name='course-forum-comments'),
    path('courses/<slug:course_slug>/forum-topics/<int:topic_id>/comments/<int:comment_id>/', CourseDiscussionCommentDetailView.as_view(), name='course-forum-comment-detail'),
    path('student-access-links/<str:token>/claim/', StudentAccessLinkClaimView.as_view(), name='student-access-link-claim'),
]
