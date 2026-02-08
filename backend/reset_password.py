import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    user = User.objects.get(username='admin')
    user.set_password('admin123')
    user.save()
    print("Password for 'admin' has been reset to 'admin123'.")
except User.DoesNotExist:
    print("User 'admin' not found.")
