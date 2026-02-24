import os
import django
import midtransclient

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
from academy.models import Order

def sync_order(order_id):
    try:
        order = Order.objects.get(id=order_id)
        print(f"Syncing Order {order.id} - Midtrans ID: {order.midtrans_id}")
        
        snap = midtransclient.Snap(
            is_production=settings.MIDTRANS_IS_PRODUCTION,
            server_key=settings.MIDTRANS_SERVER_KEY
        )
        
        status_response = snap.transactions.status(order.midtrans_id)
        transaction_status = status_response.get('transaction_status')
        fraud_status = status_response.get('fraud_status')
        
        print(f"Midtrans Status: {transaction_status}, Fraud: {fraud_status}")
        
        old_status = order.status
        new_status = old_status
        
        if transaction_status == 'capture':
            if fraud_status == 'challenge':
                new_status = 'Pending'
            elif fraud_status == 'accept':
                new_status = 'Completed'
        elif transaction_status == 'settlement':
            new_status = 'Completed'
        elif transaction_status in ['cancel', 'expire']:
            new_status = 'Cancelled'
        elif transaction_status == 'deny':
            new_status = 'Failed'
        elif transaction_status == 'pending':
            new_status = 'Pending'
            
        if old_status != new_status:
            print(f"Updating Order {order.id} status: {old_status} -> {new_status}")
            order.status = new_status
            order.save()
            
            if old_status == 'Pending' and new_status == 'Completed':
                course = order.course
                course.enrolled_count += 1
                course.save()
                print(f"Course '{course.title}' enrollment incremented to {course.enrolled_count}")
        else:
            print("Status already in sync or no change needed.")
            
    except Order.DoesNotExist:
        print(f"Error: Order {order_id} not found")
    except Exception as e:
        print(f"Error syncing order {order_id}: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        sync_order(int(sys.argv[1]))
    else:
        print("Usage: python sync_order.py <order_id>")
