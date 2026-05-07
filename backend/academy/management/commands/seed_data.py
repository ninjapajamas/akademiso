from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from academy.models import (
    AFFILIATE_STATUS_APPROVED,
    Category,
    Course,
    Instructor,
    InstructorWithdrawalRequest,
    Lesson,
    Order,
    Project,
    ProjectAssignment,
    ReferralCode,
    Section,
    UserProfile,
    WITHDRAWAL_STATUS_PENDING,
    STAFF_ROLE_ACCOUNTANT,
    STAFF_ROLE_ADMIN,
    STAFF_ROLE_PROJECT_MANAGER,
)


DEMO_ACCOUNTS = [
    {
        "username": "admin",
        "email": "admin@example.com",
        "password": "admin12345",
        "first_name": "Admin",
        "last_name": "Akademiso",
        "is_staff": True,
        "is_superuser": True,
        "staff_role": STAFF_ROLE_ADMIN,
        "phone": "081200000001",
        "company": "Akademiso",
        "position": "Administrator Sistem",
    },
    {
        "username": "akuntan.demo",
        "email": "akuntan.demo@example.com",
        "password": "Demo12345!",
        "first_name": "Akun",
        "last_name": "Akuntan",
        "is_staff": True,
        "is_superuser": False,
        "staff_role": STAFF_ROLE_ACCOUNTANT,
        "phone": "081200000002",
        "company": "Akademiso",
        "position": "Akuntan",
    },
    {
        "username": "pm.demo",
        "email": "pm.demo@example.com",
        "password": "Demo12345!",
        "first_name": "Project",
        "last_name": "Manager",
        "is_staff": True,
        "is_superuser": False,
        "staff_role": STAFF_ROLE_PROJECT_MANAGER,
        "phone": "081200000003",
        "company": "Akademiso",
        "position": "Project Manager",
    },
    {
        "username": "instruktur.demo",
        "email": "instruktur.demo@example.com",
        "password": "Demo12345!",
        "first_name": "Dina",
        "last_name": "Instruktur",
        "is_staff": False,
        "is_superuser": False,
        "staff_role": None,
        "phone": "081200000004",
        "company": "Akademiso Trainer Network",
        "position": "Lead Instructor ISO 9001",
        "bio": "Instruktur demo untuk pengujian lokal.",
        "npwp": "12.345.678.9-012.345",
        "nik": "3174000000000004",
        "bank_name": "BCA",
        "bank_account_number": "1234567890",
        "bank_account_holder": "Dina Instruktur",
    },
    {
        "username": "peserta.demo",
        "email": "peserta.demo@example.com",
        "password": "Demo12345!",
        "first_name": "Budi",
        "last_name": "Peserta",
        "is_staff": False,
        "is_superuser": False,
        "staff_role": None,
        "phone": "081200000005",
        "company": "PT Demo Peserta",
        "position": "Staff QA",
        "bio": "Peserta demo untuk mencoba alur belajar.",
    },
    {
        "username": "affiliator.demo",
        "email": "affiliator.demo@example.com",
        "password": "Demo12345!",
        "first_name": "Sari",
        "last_name": "Affiliator",
        "is_staff": False,
        "is_superuser": False,
        "staff_role": None,
        "phone": "081200000006",
        "company": "Komunitas ISO Demo",
        "position": "Affiliator",
        "bio": "Akun demo affiliator.",
        "affiliate_status": AFFILIATE_STATUS_APPROVED,
    },
]


class Command(BaseCommand):
    help = "Seed demo data for all major roles and sample learning flows."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete seeded demo data first, then recreate it.",
        )

    def _ensure_user(self, account):
        user, _ = User.objects.get_or_create(
            username=account["username"],
            defaults={
                "email": account["email"],
                "first_name": account["first_name"],
                "last_name": account["last_name"],
                "is_staff": account["is_staff"],
                "is_superuser": account["is_superuser"],
                "is_active": True,
            },
        )
        user.email = account["email"]
        user.first_name = account["first_name"]
        user.last_name = account["last_name"]
        user.is_staff = account["is_staff"]
        user.is_superuser = account["is_superuser"]
        user.is_active = True
        user.set_password(account["password"])
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.phone = account.get("phone")
        profile.company = account.get("company")
        profile.position = account.get("position")
        profile.bio = account.get("bio")
        profile.npwp = account.get("npwp")
        profile.nik = account.get("nik")
        profile.bank_name = account.get("bank_name")
        profile.bank_account_number = account.get("bank_account_number")
        profile.bank_account_holder = account.get("bank_account_holder")
        profile.staff_role = account.get("staff_role")
        if account.get("affiliate_status"):
            now = timezone.now()
            profile.affiliate_status = account["affiliate_status"]
            profile.affiliate_requested_at = now
            profile.affiliate_reviewed_at = now
            profile.affiliate_review_notes = "Disetujui untuk data demo."
        profile.save()
        return user, profile

    def _reset_demo_data(self):
        demo_usernames = [account["username"] for account in DEMO_ACCOUNTS]
        demo_slugs = ["pelatihan-internal-audit-iso-9001-demo"]
        demo_category_slugs = ["iso-9001-demo"]
        demo_codes = ["AFFDEMO10"]
        demo_project_titles = ["Implementasi ISO 9001 Demo"]

        ProjectAssignment.objects.filter(project__title__in=demo_project_titles).delete()
        Project.objects.filter(title__in=demo_project_titles).delete()
        InstructorWithdrawalRequest.objects.filter(requested_by__username__in=demo_usernames).delete()
        Order.objects.filter(user__username__in=demo_usernames).delete()
        ReferralCode.objects.filter(code__in=demo_codes).delete()
        Lesson.objects.filter(course__slug__in=demo_slugs).delete()
        Section.objects.filter(course__slug__in=demo_slugs).delete()
        Course.objects.filter(slug__in=demo_slugs).delete()
        Instructor.objects.filter(user__username__in=demo_usernames).delete()
        Category.objects.filter(slug__in=demo_category_slugs).delete()
        User.objects.filter(username__in=[u for u in demo_usernames if u != "admin"]).delete()

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Resetting existing demo data...")
            self._reset_demo_data()
            self.stdout.write(self.style.SUCCESS("Existing demo data removed."))

        users = {}
        profiles = {}
        for account in DEMO_ACCOUNTS:
            user, profile = self._ensure_user(account)
            users[account["username"]] = user
            profiles[account["username"]] = profile

        now = timezone.now()

        instructor_user = users["instruktur.demo"]
        admin_user = users["admin"]
        pm_user = users["pm.demo"]
        affiliate_user = users["affiliator.demo"]
        student_user = users["peserta.demo"]

        instructor, _ = Instructor.objects.get_or_create(
            user=instructor_user,
            defaults={
                "name": "Dina Instruktur",
                "title": "Lead Instructor ISO 9001",
                "bio": "Berpengalaman membimbing implementasi sistem manajemen mutu.",
                "expertise_areas": ["ISO 9001", "Audit Internal", "Quality Management"],
                "approval_status": "APPROVED",
                "approved_by": admin_user,
                "approved_at": now,
            },
        )
        instructor.name = "Dina Instruktur"
        instructor.title = "Lead Instructor ISO 9001"
        instructor.bio = "Berpengalaman membimbing implementasi sistem manajemen mutu."
        instructor.expertise_areas = ["ISO 9001", "Audit Internal", "Quality Management"]
        instructor.approval_status = "APPROVED"
        instructor.approved_by = admin_user
        instructor.approved_at = now
        instructor.save()

        category, _ = Category.objects.get_or_create(
            slug="iso-9001-demo",
            defaults={"name": "ISO 9001 Demo", "icon": "shield-check"},
        )
        category.name = "ISO 9001 Demo"
        category.icon = "shield-check"
        category.save()

        course, _ = Course.objects.get_or_create(
            slug="pelatihan-internal-audit-iso-9001-demo",
            defaults={
                "title": "Pelatihan Internal Audit ISO 9001 Demo",
                "description": "Course demo untuk kebutuhan pengujian lokal Akademiso.",
                "price": Decimal("1500000.00"),
                "discount_price": Decimal("1250000.00"),
                "instructor": instructor,
                "category": category,
                "duration": "2 Hari",
            },
        )
        course.title = "Pelatihan Internal Audit ISO 9001 Demo"
        course.type = "course"
        course.description = "Course demo untuk kebutuhan pengujian lokal Akademiso."
        course.detail_sections = [
            {
                "title": "Tentang Pelatihan",
                "content": "Pelatihan ini membantu peserta memahami teknik audit internal ISO 9001.",
            },
            {
                "title": "Manfaat",
                "content": "Peserta memahami perencanaan audit, pelaksanaan audit, dan tindak lanjut temuan.",
            },
        ]
        course.rundown_items = [
            "08:30 - 09:00 | Registrasi dan pembukaan",
            "09:00 - 12:00 | Prinsip audit ISO 9001",
            "",
            "13:00 - 15:00 | Simulasi audit dan pelaporan",
        ]
        course.public_training_enabled = True
        course.public_training_intro = "Sesi public training demo untuk pengujian alur pendaftaran."
        course.public_sessions = [
            {
                "id": "demo-public-online-1",
                "label": "Batch Demo Online",
                "schedule": "20 Mei 2026 09:00 WIB",
                "delivery_mode": "online",
                "location": "Zoom Meeting",
            }
        ]
        course.public_online_price = Decimal("1400000.00")
        course.public_online_discount_price = Decimal("1150000.00")
        course.public_offline_price = Decimal("1600000.00")
        course.public_offline_discount_price = Decimal("1350000.00")
        course.inhouse_training_enabled = True
        course.inhouse_training_intro = "Tersedia juga format in-house untuk kebutuhan perusahaan."
        course.inhouse_training_benefits = ["Materi bisa dikustom", "Cocok untuk tim perusahaan"]
        course.elearning_enabled = True
        course.elearning_intro = "Akses materi mandiri tersedia setelah pembayaran berhasil."
        course.price = Decimal("1500000.00")
        course.discount_price = Decimal("1250000.00")
        course.instructor = instructor
        course.category = category
        course.level = "Intermediate"
        course.duration = "2 Hari"
        course.delivery_mode = "online"
        course.scheduled_at = now + timezone.timedelta(days=14)
        course.scheduled_end_at = now + timezone.timedelta(days=15)
        course.location = "Zoom Meeting"
        course.zoom_link = "https://zoom.us/j/1234567890"
        course.is_free = False
        course.is_active = True
        course.is_featured = True
        course.has_certification_exam = True
        course.rating = Decimal("4.80")
        course.enrolled_count = 1
        course.save()

        section, _ = Section.objects.get_or_create(
            course=course,
            order=1,
            defaults={"title": "Pendahuluan"},
        )
        section.title = "Pendahuluan"
        section.save()

        lesson, _ = Lesson.objects.get_or_create(
            course=course,
            order=1,
            defaults={"title": "Pengenalan Audit Internal", "type": "article"},
        )
        lesson.section = section
        lesson.title = "Pengenalan Audit Internal"
        lesson.type = "article"
        lesson.content = "<p>Materi demo pengantar audit internal ISO 9001.</p>"
        lesson.duration = "15 menit"
        lesson.save()

        referral_code, _ = ReferralCode.objects.get_or_create(
            code="AFFDEMO10",
            defaults={
                "label": "Referral Demo 10%",
                "description": "Kode referral demo untuk pengujian lokal.",
                "discount_type": "percent",
                "discount_value": Decimal("10.00"),
                "is_active": True,
                "owner": affiliate_user,
                "created_by": admin_user,
                "affiliate_commission_rate": Decimal("0.2000"),
            },
        )
        referral_code.label = "Referral Demo 10%"
        referral_code.description = "Kode referral demo untuk pengujian lokal."
        referral_code.discount_type = "percent"
        referral_code.discount_value = Decimal("10.00")
        referral_code.is_active = True
        referral_code.owner = affiliate_user
        referral_code.created_by = admin_user
        referral_code.affiliate_commission_rate = Decimal("0.2000")
        referral_code.save()

        order, _ = Order.objects.get_or_create(
            user=student_user,
            course=course,
            defaults={
                "offer_type": "elearning",
                "original_amount": Decimal("1250000.00"),
                "referral_code": referral_code,
                "referral_code_snapshot": "AFFDEMO10",
                "referral_discount_amount": Decimal("125000.00"),
                "status": "Completed",
                "total_amount": Decimal("1125000.00"),
                "affiliate_user": affiliate_user,
                "affiliate_commission_rate": Decimal("0.2000"),
            },
        )
        order.offer_type = "elearning"
        order.offer_mode = ""
        order.public_session_id = ""
        order.original_amount = Decimal("1250000.00")
        order.referral_code = referral_code
        order.referral_code_snapshot = "AFFDEMO10"
        order.referral_discount_amount = Decimal("125000.00")
        order.status = "Completed"
        order.total_amount = Decimal("1125000.00")
        order.affiliate_user = affiliate_user
        order.affiliate_commission_rate = Decimal("0.2000")
        order.save()

        project, _ = Project.objects.get_or_create(
            title="Implementasi ISO 9001 Demo",
            defaults={
                "client_name": "PT Klien Demo",
                "description": "Proyek demo implementasi sistem manajemen mutu.",
                "deliverables": "Gap analysis, pelatihan, simulasi audit",
                "status": "active",
                "priority": "high",
                "start_date": now.date(),
                "due_date": (now + timezone.timedelta(days=30)).date(),
                "related_course": course,
                "created_by": pm_user,
            },
        )
        project.client_name = "PT Klien Demo"
        project.description = "Proyek demo implementasi sistem manajemen mutu."
        project.deliverables = "Gap analysis, pelatihan, simulasi audit"
        project.status = "active"
        project.priority = "high"
        project.start_date = now.date()
        project.due_date = (now + timezone.timedelta(days=30)).date()
        project.related_course = course
        project.created_by = pm_user
        project.save()

        assignment, _ = ProjectAssignment.objects.get_or_create(
            project=project,
            instructor=instructor,
            defaults={
                "assigned_by": pm_user,
                "status": "in_progress",
                "role_label": "Instruktur Utama",
                "notes": "Menangani sesi pelatihan dan review dokumen.",
            },
        )
        assignment.assigned_by = pm_user
        assignment.status = "in_progress"
        assignment.role_label = "Instruktur Utama"
        assignment.notes = "Menangani sesi pelatihan dan review dokumen."
        assignment.save()

        withdrawal, _ = InstructorWithdrawalRequest.objects.get_or_create(
            instructor=instructor,
            requested_by=instructor_user,
            amount=Decimal("250000.00"),
            defaults={
                "note": "Permintaan pencairan demo lokal.",
                "status": WITHDRAWAL_STATUS_PENDING,
                "npwp_snapshot": profiles["instruktur.demo"].npwp,
                "bank_name_snapshot": profiles["instruktur.demo"].bank_name,
                "bank_account_number_snapshot": profiles["instruktur.demo"].bank_account_number,
                "bank_account_holder_snapshot": profiles["instruktur.demo"].bank_account_holder,
            },
        )
        withdrawal.note = "Permintaan pencairan demo lokal."
        withdrawal.status = WITHDRAWAL_STATUS_PENDING
        withdrawal.npwp_snapshot = profiles["instruktur.demo"].npwp
        withdrawal.bank_name_snapshot = profiles["instruktur.demo"].bank_name
        withdrawal.bank_account_number_snapshot = profiles["instruktur.demo"].bank_account_number
        withdrawal.bank_account_holder_snapshot = profiles["instruktur.demo"].bank_account_holder
        withdrawal.save()

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
        self.stdout.write("Test accounts:")
        for account in DEMO_ACCOUNTS:
            self.stdout.write(f"  - {account['username']} / {account['password']}")
        self.stdout.write("Demo course slug: pelatihan-internal-audit-iso-9001-demo")
        self.stdout.write("Demo referral code: AFFDEMO10")
