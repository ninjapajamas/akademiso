import os

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update a superuser from environment variables."

    def handle(self, *args, **options):
        username = os.getenv("DJANGO_SUPERUSER_USERNAME", "admin").strip()
        email = os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@example.com").strip()
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD", "admin12345").strip()
        first_name = os.getenv("DJANGO_SUPERUSER_FIRST_NAME", "Admin").strip()
        last_name = os.getenv("DJANGO_SUPERUSER_LAST_NAME", "Akademiso").strip()

        if not username or not password:
            self.stdout.write(
                self.style.WARNING(
                    "Superuser skipped because DJANGO_SUPERUSER_USERNAME or DJANGO_SUPERUSER_PASSWORD is empty."
                )
            )
            return

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )

        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"Superuser {username!r} {action} successfully."))
