from rest_framework import viewsets, generics
from .models import Category, Instructor, Course, Order, Lesson
from .serializers import CategorySerializer, InstructorSerializer, CourseSerializer, OrderSerializer, RegisterSerializer, LessonSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth.models import User

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdminUser]

    def list(self, request, *args, **kwargs):
        try:
            print(f"UserViewSet list called by: {request.user}")
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error in UserViewSet: {e}")
            return Response({'error': str(e)}, status=500)

    
    def get_serializer_class(self):
        from .serializers import UserSerializer
        return UserSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    # Allow read for all, write for admin only could be better, but for now keep open or restricted?
    # Keeping it simple for the user request context, maybe restrict write to admin later.

class InstructorViewSet(viewsets.ModelViewSet):
    queryset = Instructor.objects.all()
    serializer_class = InstructorSerializer

class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer

    def get_queryset(self):
        queryset = Lesson.objects.all()
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class MyCoursesView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user, status='Completed').order_by('-created_at')

    def get_serializer_class(self):
        from .serializers import MyCourseSerializer
        return MyCourseSerializer

from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import Cart, CartItem

class CartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        cart, created = Cart.objects.get_or_create(user=request.user)
        from .serializers import CartSerializer
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        try:
            print(f"Request data: {request.data}") # Debug log
            if not request.user.is_authenticated:
                return Response({'error': 'User not authenticated'}, status=401)

            cart, _ = Cart.objects.get_or_create(user=request.user)
            course_id = request.data.get('course_id')
            
            if not course_id:
                return Response({'error': 'course_id required'}, status=400)
            
            course = get_object_or_404(Course, id=course_id)
            item, created = CartItem.objects.get_or_create(cart=cart, course=course)
            
            if not created:
                return Response({'message': 'Item already in cart'}, status=200)

            return Response({'message': 'Item added to cart'}, status=201)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e), 'trace': traceback.format_exc()}, status=500)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        course_id = request.data.get('course_id')
        
        if not course_id:
             return Response({'error': 'course_id required'}, status=400)

        # Remove item if exists
        CartItem.objects.filter(cart=cart, course_id=course_id).delete()
        return Response({'message': 'Item removed from cart'}, status=200)
