from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, InstructorViewSet, CourseViewSet, OrderViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'instructors', InstructorViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'orders', OrderViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
