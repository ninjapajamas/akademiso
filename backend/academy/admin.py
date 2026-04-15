from django.contrib import admin
from .models import Category, Instructor, Course, Lesson, Order, InhouseTrainingRequest

class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'instructor', 'category', 'price', 'level', 'is_active', 'is_featured')
    list_filter = ('category', 'level', 'is_active', 'is_featured')
    search_fields = ('title', 'description')
    inlines = [LessonInline]
    prepopulated_fields = {'slug': ('title',)}

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Instructor)
class InstructorAdmin(admin.ModelAdmin):
    list_display = ('name', 'title', 'approval_status', 'approved_by', 'approved_at')
    list_filter = ('approval_status',)
    search_fields = ('name', 'title', 'user__email', 'user__username')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'course', 'status', 'total_amount', 'created_at')
    list_filter = ('status', 'created_at')


@admin.register(InhouseTrainingRequest)
class InhouseTrainingRequestAdmin(admin.ModelAdmin):
    list_display = ('course', 'company_name', 'contact_name', 'preferred_mode', 'participants_count', 'status', 'created_at')
    list_filter = ('status', 'preferred_mode', 'created_at')
    search_fields = ('course__title', 'company_name', 'contact_name', 'email', 'phone')

from .models import Cart, CartItem

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'updated_at', 'total_items')
    inlines = [CartItemInline]

    def total_items(self, obj):
        return obj.items.count()
