import requests
import json

def test_send_email():
    url = "http://localhost:8000/api/v1/send-test-email"
    payload = {
        "email": "sygalin.test@gmail.com"
    }
    headers = {
        "Content-Type": "application/json"
    }

    print(f"Testing endpoint: {url}")
    try:
        response = requests.post(url, data=json.dumps(payload), headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_send_email()
