from django.contrib import admin
from .models import (
    Category, Instructor, Course, Lesson, Order, InhouseTrainingRequest, Certificate, CertificateTemplate,
    CourseDiscussionTopic, CourseDiscussionComment
)

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
    list_display = ('name', 'title', 'has_signature', 'approval_status', 'approved_by', 'approved_at')
    list_filter = ('approval_status',)
    search_fields = ('name', 'title', 'user__email', 'user__username')

    def has_signature(self, obj):
        return bool(obj.signature_image)
    has_signature.boolean = True

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'course', 'status', 'total_amount', 'created_at')
    list_filter = ('status', 'created_at')


@admin.register(CertificateTemplate)
class CertificateTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'course', 'is_active', 'updated_at')
    list_filter = ('is_active', 'course')
    search_fields = ('name', 'course__title', 'signer_name')


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'course', 'exam', 'template', 'approval_status', 'approved_at')
    list_filter = ('approval_status', 'course', 'template')
    search_fields = ('user__username', 'user__email', 'course__title', 'exam__title')


@admin.register(InhouseTrainingRequest)
class InhouseTrainingRequestAdmin(admin.ModelAdmin):
    list_display = ('course', 'company_name', 'contact_name', 'preferred_mode', 'participants_count', 'status', 'created_at')
    list_filter = ('status', 'preferred_mode', 'created_at')
    search_fields = ('course__title', 'company_name', 'contact_name', 'email', 'phone')


class CourseDiscussionCommentInline(admin.TabularInline):
    model = CourseDiscussionComment
    extra = 0
    readonly_fields = ('user', 'created_at', 'updated_at')


@admin.register(CourseDiscussionTopic)
class CourseDiscussionTopicAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'user', 'updated_at', 'created_at')
    list_filter = ('course', 'created_at', 'updated_at')
    search_fields = ('title', 'content', 'course__title', 'user__username', 'user__email')
    inlines = [CourseDiscussionCommentInline]

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
