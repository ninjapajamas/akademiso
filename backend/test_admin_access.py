import requests

def test_admin_access():
    base_url = 'http://localhost:8000'
    
    # 1. Login
    print("Logging in as 'rifqi'...")
    try:
        res = requests.post(f"{base_url}/api/token/", json={'username': 'rifqi', 'password': 'password123'}) # Assuming default password or I need to reset it
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    if res.status_code != 200:
        print(f"Login failed: {res.status_code} {res.text}")
        # Try creating a temp superuser if password fails? 
        # Or just use the 'admin' user if 'rifqi' fails.
        return

    tokens = res.json()
    access_token = tokens['access']
    print("Login successful. Token obtained.")

    # 2. Access Users Endpoint
    print("Accessing /api/users/...")
    headers = {'Authorization': f"Bearer {access_token}"}
    res = requests.get(f"{base_url}/api/users/", headers=headers)

    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        print("Success! Data:", res.json()[:2] if isinstance(res.json(), list) else res.json())
    else:
        print("Failed:", res.text)

if __name__ == '__main__':
    test_admin_access()
