import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

superusers = User.objects.filter(is_superuser=True)
if superusers.exists():
    print("Superusers found:")
    for user in superusers:
        print(f"- Username: {user.username}, Email: {user.email}")
else:
    print("No superusers found.")
