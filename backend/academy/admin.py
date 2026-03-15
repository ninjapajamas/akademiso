from django.contrib import admin
from .models import Category, Instructor, Course, Lesson, Order

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
    list_display = ('name', 'title')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'course', 'status', 'total_amount', 'created_at')
    list_filter = ('status', 'created_at')

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
