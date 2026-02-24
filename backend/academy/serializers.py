from rest_framework import serializers
from .models import Category, Instructor, Course, Lesson, Order, Cart, CartItem, Section, UserProfile
from django.contrib.auth.models import User
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['is_instructor'] = hasattr(user, 'instructor_profile')
        token['username'] = user.username
        return token

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(write_only=True, required=True)
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class InstructorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instructor
        fields = '__all__'

class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['id', 'course', 'section', 'title', 'type', 'content', 'video_url', 'image', 'duration', 'order']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = request.user if request else None
        
        # Check enrollment
        is_enrolled = False
        if user and user.is_authenticated:
            if user.is_staff:
                is_enrolled = True
            else:
                is_enrolled = Order.objects.filter(user=user, course=instance.course, status='Completed').exists()
        
        # If not enrolled, hide sensitive content
        if not is_enrolled:
            data['content'] = "Konten ini hanya tersedia untuk peserta yang sudah terdaftar."
            data['video_url'] = None
            data['is_locked'] = True
        else:
            data['is_locked'] = False
            
        return data

class SectionSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'course', 'title', 'order', 'lessons']

class CourseSerializer(serializers.ModelSerializer):
    instructor = InstructorSerializer(read_only=True)
    instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=Instructor.objects.all(), source='instructor', write_only=True
    )
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, allow_null=True
    )
    sections = SectionSerializer(many=True, read_only=True)
    is_enrolled = serializers.SerializerMethodField()
    
    def get_is_enrolled(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        return Order.objects.filter(user=user, course=obj, status='Completed').exists()
    
    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'type', 'description', 'price', 'discount_price', 
            'instructor', 'instructor_id', 'category', 'category_id', 'level', 
            'duration', 'scheduled_at', 'location', 'thumbnail', 'is_featured', 
            'created_at', 'rating', 'enrolled_count', 'sections', 'is_enrolled'
        ]

class OrderSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = Order
        fields = ['id', 'user', 'course', 'total_amount', 'status', 'snap_token', 'midtrans_id', 'created_at']

class MyCourseSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'course', 'status', 'created_at']

class CartItemSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source='course', write_only=True
    )

    class Meta:
        model = CartItem
        fields = ['id', 'course', 'course_id', 'added_at']

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_price', 'created_at', 'updated_at']

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('avatar', 'phone', 'company', 'position', 'bio')

class ProfileSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    is_instructor = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile', 'is_staff', 'is_instructor')
        read_only_fields = ('id', 'username', 'email', 'is_staff', 'is_instructor')

    def get_is_instructor(self, obj):
        return hasattr(obj, 'instructor_profile')

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        
        # Update User fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()
        
        # Update UserProfile fields
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        
        # Sync to Instructor model if exists
        if hasattr(instance, 'instructor_profile'):
            instr = instance.instructor_profile
            instr.name = f"{instance.first_name} {instance.last_name}".strip()
            if 'bio' in profile_data:
                instr.bio = profile_data['bio']
            if 'avatar' in profile_data:
                instr.photo = profile_data['avatar']
            instr.save()
            
        return instance
