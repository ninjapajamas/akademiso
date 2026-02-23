from rest_framework import viewsets, generics
from .models import Category, Instructor, Course, Order, Lesson, Section, UserProfile
from .serializers import (
    CategorySerializer, InstructorSerializer, CourseSerializer, OrderSerializer, 
    RegisterSerializer, LessonSerializer, SectionSerializer, ProfileSerializer
)
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser, BasePermission, SAFE_METHODS
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db.models import Sum, Count
from rest_framework_simplejwt.tokens import RefreshToken


class IsInstructorOrAdmin(BasePermission):
    """
    Permission to allow instructors to edit their own courses/sections/lessons.
    Admins (is_staff) have full access.
    Non-staff can only GET if it's safe (SAFE_METHODS).
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user.is_staff:
            return True
        
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True

        # Check if the user is the instructor of the course
        instructor = _get_instructor_for_user(request.user)
        if not instructor:
            return False
            
        if isinstance(obj, Course):
            return obj.instructor == instructor
        if isinstance(obj, Section):
            return obj.course.instructor == instructor
        if isinstance(obj, Lesson):
            return obj.course.instructor == instructor
            
        return False


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAdminUser]

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def get_serializer_class(self):
        from .serializers import UserSerializer
        return UserSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class InstructorViewSet(viewsets.ModelViewSet):
    queryset = Instructor.objects.all()
    serializer_class = InstructorSerializer


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        queryset = Lesson.objects.all()
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        
        # If not admin, filter by instructor's courses
        if not self.request.user.is_staff and self.request.user.is_authenticated:
            instructor = _get_instructor_for_user(self.request.user)
            if instructor:
                queryset = queryset.filter(course__instructor=instructor)
            else:
                queryset = queryset.none()
        return queryset


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        queryset = Section.objects.all()
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
            
        # If not admin, filter by instructor's courses
        if not self.request.user.is_staff and self.request.user.is_authenticated:
            instructor = _get_instructor_for_user(self.request.user)
            if instructor:
                queryset = queryset.filter(course__instructor=instructor)
            else:
                queryset = queryset.none()
        return queryset


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    lookup_field = 'slug'
    permission_classes = [IsInstructorOrAdmin]

    def get_queryset(self):
        queryset = Course.objects.all()
        # If not admin, filter by instructor's courses for non-GET methods
        # or if they are in the instructor portal context
        if not self.request.user.is_staff and self.request.user.is_authenticated:
            instructor = _get_instructor_for_user(self.request.user)
            if instructor:
                # If they are requesting specific course or management list
                # actually for public GET we want all, but for edit/list in portal we want filtered.
                # Common pattern: filter only if it's the instructor portal requesting.
                # For now, let's allow all GET (public) and filter other actions.
                if self.request.method not in SAFE_METHODS:
                    queryset = queryset.filter(instructor=instructor)
            else:
                if self.request.method not in SAFE_METHODS:
                    queryset = queryset.none()
        return queryset

    def perform_create(self, serializer):
        # Auto-assign instructor if not admin and user is instructor
        if not self.request.user.is_staff:
            instructor = _get_instructor_for_user(self.request.user)
            if instructor:
                serializer.save(instructor=instructor)
                return
        serializer.save()


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related('user', 'course').order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(user=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MyCoursesView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        from .serializers import MyCourseSerializer
        return MyCourseSerializer


# ── Admin Stats ─────────────────────────────────────────────────────────────
class StatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_users    = User.objects.filter(is_staff=False).count()
        total_courses  = Course.objects.count()
        total_instructors = Instructor.objects.count()
        total_orders   = Order.objects.count()
        completed_orders = Order.objects.filter(status='Completed').count()
        pending_orders = Order.objects.filter(status='Pending').count()
        revenue        = Order.objects.filter(status='Completed').aggregate(
                            total=Sum('total_amount'))['total'] or 0

        # Recent orders
        recent_orders = Order.objects.select_related('user', 'course').order_by('-created_at')[:5]
        recent = [
            {
                'id': o.id,
                'user': o.user.username,
                'course': o.course.title,
                'amount': str(o.total_amount),
                'status': o.status,
                'created_at': o.created_at.strftime('%d %b %Y'),
            }
            for o in recent_orders
        ]

        return Response({
            'total_users': total_users,
            'total_courses': total_courses,
            'total_instructors': total_instructors,
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'pending_orders': pending_orders,
            'revenue': float(revenue),
            'recent_orders': recent,
        })


# ── Instructor Portal ────────────────────────────────────────────────────────
def _get_instructor_for_user(user):
    """Get Instructor object for the logged-in user. Uses FK link first, then name matching."""
    # Priority 1: direct FK link (OneToOne)
    if hasattr(user, 'instructor_profile') and user.instructor_profile:
        return user.instructor_profile
    # Priority 2: match by full name
    full_name = f"{user.first_name} {user.last_name}".strip()
    if full_name:
        qs = Instructor.objects.filter(name__iexact=full_name)
        if qs.exists():
            return qs.first()
    # Priority 3: partial match on username
    qs = Instructor.objects.filter(name__icontains=user.username)
    if qs.exists():
        return qs.first()
    return None


class InstructorCoursesView(APIView):
    """Returns courses for the currently-logged-in instructor."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        instructor = _get_instructor_for_user(request.user)
        if not instructor:
            return Response({'courses': [], 'instructor': None, 'total_students': 0, 'total_courses': 0})

        courses = Course.objects.filter(instructor=instructor).order_by('-created_at')
        serializer = CourseSerializer(courses, many=True)

        total_students = Order.objects.filter(
            course__instructor=instructor
        ).values('user').distinct().count()

        return Response({
            'instructor': InstructorSerializer(instructor).data,
            'courses': serializer.data,
            'total_students': total_students,
            'total_courses': courses.count(),
        })


class InstructorStudentsView(APIView):
    """Returns enrolled students for the logged-in instructor's courses."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        instructor = _get_instructor_for_user(request.user)
        if not instructor:
            return Response([])
        instructor = instructor  # already resolved
        orders = Order.objects.filter(
            course__instructor=instructor
        ).select_related('user', 'course').order_by('-created_at')

        data = [
            {
                'id': o.id,
                'user_id': o.user.id,
                'username': o.user.username,
                'full_name': f"{o.user.first_name} {o.user.last_name}".strip() or o.user.username,
                'email': o.user.email,
                'course': o.course.title,
                'course_slug': o.course.slug,
                'status': o.status,
                'enrolled_at': o.created_at.strftime('%d %b %Y'),
            }
            for o in orders
        ]
        return Response(data)


# ── Admin User Actions ───────────────────────────────────────────────────────
class AdminResetPasswordView(APIView):
    """
    Admin resets a user's password.
    POST /api/users/{id}/reset-password/
    Body: { "new_password": "..." }
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        new_password = request.data.get('new_password', '').strip()
        if len(new_password) < 6:
            return Response({'error': 'Password harus minimal 6 karakter.'}, status=400)
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User tidak ditemukan.'}, status=404)

        # Prevent non-superuser from resetting superuser password
        if user.is_superuser and not request.user.is_superuser:
            return Response({'error': 'Tidak diizinkan mengubah password superuser.'}, status=403)

        user.set_password(new_password)
        user.save()
        return Response({'message': f'Password {user.username} berhasil direset.'})


class AdminEditUserView(APIView):
    """
    Admin edits user data (name, email, is_staff, is_active).
    PATCH /api/users/{id}/edit/
    Body: { "first_name": "..", "last_name": "..", "email": "..", "is_staff": bool, "is_active": bool }
    """
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User tidak ditemukan.'}, status=404)

        # Protect superusers from being edited by non-superusers
        if user.is_superuser and not request.user.is_superuser:
            return Response({'error': 'Tidak diizinkan mengedit akun superuser.'}, status=403)

        allowed_fields = ['first_name', 'last_name', 'email', 'is_staff', 'is_active']
        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])

        # Validate email uniqueness
        email = request.data.get('email')
        if email and User.objects.filter(email=email).exclude(pk=pk).exists():
            return Response({'error': 'Email sudah digunakan user lain.'}, status=400)

        user.save()
        from .serializers import UserSerializer
        return Response(UserSerializer(user).data)


class AdminImpersonateView(APIView):
    """
    Admin generates a JWT token pair for another user (login-as / hijack).
    POST /api/users/{id}/impersonate/
    Returns: { "access": "...", "refresh": "...", "username": "...", "warning": "..." }
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User tidak ditemukan.'}, status=404)

        # Only superuser can impersonate another staff/superuser
        if (target_user.is_staff or target_user.is_superuser) and not request.user.is_superuser:
            return Response({'error': 'Hanya superuser yang bisa melakukan impersonasi ke akun staff.'}, status=403)

        # Prevent self-impersonation (pointless)
        if target_user.pk == request.user.pk:
            return Response({'error': 'Tidak bisa melakukan impersonasi ke akun sendiri.'}, status=400)

        # Generate token using CustomTokenObtainPairSerializer logic
        from .serializers import CustomTokenObtainPairSerializer
        refresh = CustomTokenObtainPairSerializer.get_token(target_user)
        access = refresh.access_token

        return Response({
            'access': str(access),
            'refresh': str(refresh),
            'username': target_user.username,
            'user_id': target_user.pk,
            'is_staff': target_user.is_staff,
            'is_superuser': target_user.is_superuser,
            'warning': f'Anda sedang login sebagai {target_user.username}. Gunakan dengan bijak.',
        })


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
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        course_id = request.data.get('course_id')

        if not course_id:
            return Response({'error': 'course_id required'}, status=400)

        CartItem.objects.filter(cart=cart, course_id=course_id).delete()
        return Response({'message': 'Item removed from cart'}, status=200)

from rest_framework.parsers import MultiPartParser, FormParser
import json

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        # Ensure profile exists
        UserProfile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        # Extract data and files
        data = request.data.copy()
        
        # Prepare nested profile data
        profile_data = {}
        
        # 1. Handle if 'profile' is sent as JSON string
        if 'profile' in data and isinstance(data['profile'], str):
            try:
                profile_data = json.loads(data['profile'])
            except:
                pass
        elif 'profile' in data and isinstance(data['profile'], dict):
            profile_data = data['profile']

        # 2. Extract flat profile fields from main data
        profile_fields = ['phone', 'company', 'position', 'bio']
        for field in profile_fields:
            if field in data:
                profile_data[field] = data.get(field)
        
        # 3. Add avatar from FILES
        if 'avatar' in request.FILES:
            profile_data['avatar'] = request.FILES['avatar']
            
        # Create a clean dict for serializer
        serializer_data = {
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name'),
            'profile': profile_data
        }
        
        # Remove None values to allow partial update
        serializer_data = {k: v for k, v in serializer_data.items() if v is not None}

        serializer = ProfileSerializer(request.user, data=serializer_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
