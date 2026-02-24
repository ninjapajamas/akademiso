import os
import django
import midtransclient

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
from academy.models import Order

try:
    order_id = 49
    o = Order.objects.get(id=order_id)
    print(f"Checking Order {o.id} - Midtrans ID: {o.midtrans_id}")
    
    snap = midtransclient.Snap(
        is_production=settings.MIDTRANS_IS_PRODUCTION,
        server_key=settings.MIDTRANS_SERVER_KEY
    )
    
    status = snap.transactions.status(o.midtrans_id)
    print(f"Midtrans Response: {status}")
    print(f"Transaction Status: {status.get('transaction_status')}")
    print(f"Fraud Status: {status.get('fraud_status')}")
    print(f"Current Order Status in DB: {o.status}")
    
except Exception as e:
    print(f"Error: {e}")
