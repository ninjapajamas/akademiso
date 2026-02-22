from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, InstructorViewSet, CourseViewSet, OrderViewSet,
    RegisterView, MyCoursesView, CartViewSet, UserViewSet, LessonViewSet,
    SectionViewSet, StatsView, InstructorCoursesView, InstructorStudentsView
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

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('my-courses/', MyCoursesView.as_view(), name='my-courses'),
    path('stats/', StatsView.as_view(), name='admin-stats'),
    path('instructor/courses/', InstructorCoursesView.as_view(), name='instructor-courses'),
    path('instructor/students/', InstructorStudentsView.as_view(), name='instructor-students'),
]
