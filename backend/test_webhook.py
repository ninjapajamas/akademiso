import requests
import json

url = "http://localhost:8000/api/orders/notification/"
data = {
    "order_id": "ORDER-48-1771949481",
    "transaction_status": "settlement",
    "fraud_status": "accept",
    "gross_amount": "1800000.00",
    "payment_type": "credit_card",
    "transaction_id": "dummy-transaction-id",
    "status_code": "200",
}

print(f"Sending mock notification to {url}...")
try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
