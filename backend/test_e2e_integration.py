"""
End-to-End Live API QA Integration Test
======================================
Tests the full lifecycle of the marketplace against the live running server.
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def log_test(step_num, title):
    print(f"\n[{step_num:02d}] 🧪 Testing: {title}...")

def assert_status(response, expected_status, step_name):
    if response.status_code != expected_status:
        print(f"   ❌ FAILED {step_name}: Expected {expected_status}, got {response.status_code}")
        print(f"   Response Body: {response.text}")
        raise AssertionError(f"Step {step_name} failed with status {response.status_code}")
    else:
        print(f"   ✅ PASSED: Status {response.status_code}")

def run_qa():
    print("=" * 70)
    print(" 🚀 STARTING FULL-STACK END-TO-END QA INTEGRATION SUITE ")
    print("=" * 70)

    # 1. Health Check
    log_test(1, "API Health Check Endpoint")
    res = requests.get(f"{BASE_URL}/api/health/")
    assert_status(res, 200, "Health check")
    data = res.json()
    assert data["status"] == "healthy"
    print(f"   Service info: {data['service']} v{data['version']}")

    # 2. Public Catalog List
    log_test(2, "Public Sessions Catalog")
    res = requests.get(f"{BASE_URL}/api/sessions/?upcoming=true")
    assert_status(res, 200, "Public catalog")
    sessions = res.json()
    print(f"   Retrieved {len(sessions)} active upcoming sessions from catalog.")

    # 3. Creator Demo Login
    log_test(3, "Creator Demo Authentication (Elena)")
    res = requests.post(f"{BASE_URL}/api/auth/demo/", json={
        "role": "CREATOR",
        "email": "creator.elena@ahoum.com",
        "name": "Elena Rostova"
    })
    assert_status(res, 200, "Creator auth")
    creator_tokens = res.json()["tokens"]
    creator_headers = {"Authorization": f"Bearer {creator_tokens['access']}"}
    print(f"   Issued JWT access token for Creator Elena.")

    # 4. Creator Publishes a 2-Seat Workshop
    log_test(4, "Creator Publishes New Session (Capacity=2)")
    session_payload = {
        "title": "QA Test Workshop: Real-Time High Concurrency Architecture",
        "description": "End-to-end QA validation workshop with 2 available seats.",
        "start_time": "2026-09-01T14:00:00Z",
        "end_time": "2026-09-01T16:00:00Z",
        "capacity": 2,
        "price": "49.00",
        "status": "ACTIVE"
    }
    res = requests.post(f"{BASE_URL}/api/sessions/", json=session_payload, headers=creator_headers)
    assert_status(res, 201, "Create session")
    new_session = res.json()
    session_id = new_session["id"]
    print(f"   Created Session #{session_id}: '{new_session['title']}' with Capacity {new_session['capacity']}")

    # 5. User 1 Demo Login (Alex)
    log_test(5, "User 1 Authentication (Alex)")
    res = requests.post(f"{BASE_URL}/api/auth/demo/", json={"role": "USER", "email": "user.alex@ahoum.com"})
    assert_status(res, 200, "User 1 auth")
    user1_tokens = res.json()["tokens"]
    user1_headers = {"Authorization": f"Bearer {user1_tokens['access']}"}

    # 6. User 1 Books Seat 1
    log_test(6, "User 1 Books Seat 1 of 2")
    res = requests.post(f"{BASE_URL}/api/sessions/{session_id}/book/", headers=user1_headers)
    assert_status(res, 201, "User 1 booking")
    user1_booking_id = res.json()["id"]
    print(f"   Booking confirmed! Booking ID: #{user1_booking_id}")

    # Verify remaining seats = 1
    res = requests.get(f"{BASE_URL}/api/sessions/{session_id}/")
    assert_status(res, 200, "Get session details")
    session_state = res.json()
    assert session_state["remaining_seats"] == 1, f"Expected 1 remaining, got {session_state['remaining_seats']}"
    print(f"   Live inventory verified: {session_state['remaining_seats']} of {session_state['capacity']} remaining.")

    # 7. User 2 Demo Login (Jordan)
    log_test(7, "User 2 Authentication (Jordan)")
    res = requests.post(f"{BASE_URL}/api/auth/demo/", json={"role": "USER", "email": "user.jordan@ahoum.com"})
    assert_status(res, 200, "User 2 auth")
    user2_tokens = res.json()["tokens"]
    user2_headers = {"Authorization": f"Bearer {user2_tokens['access']}"}

    # 8. User 2 Books Seat 2 (Session Becomes Sold Out)
    log_test(8, "User 2 Books Seat 2 of 2 (Session becomes Sold Out)")
    res = requests.post(f"{BASE_URL}/api/sessions/{session_id}/book/", headers=user2_headers)
    assert_status(res, 201, "User 2 booking")

    res = requests.get(f"{BASE_URL}/api/sessions/{session_id}/")
    session_state = res.json()
    assert session_state["remaining_seats"] == 0
    assert session_state["is_sold_out"] is True
    print(f"   Session is now officially SOLD OUT (Remaining: {session_state['remaining_seats']}).")

    # 9. User 3 Demo Login (Priya) & Attempt Oversubscription
    log_test(9, "User 3 (Priya) Attempts to Book Sold-Out Session (Oversubscription Prevention)")
    res = requests.post(f"{BASE_URL}/api/auth/demo/", json={"role": "USER", "email": "user.priya@ahoum.com"})
    assert_status(res, 200, "User 3 auth")
    user3_tokens = res.json()["tokens"]
    user3_headers = {"Authorization": f"Bearer {user3_tokens['access']}"}

    res = requests.post(f"{BASE_URL}/api/sessions/{session_id}/book/", headers=user3_headers)
    assert_status(res, 400, "Oversubscription rejection")
    print(f"   Rejected gracefully with 400 error: {res.json()['error']}")

    # 10. User 1 Cancels Booking -> Seat is Restored
    log_test(10, "User 1 Cancels Booking (Seat Capacity Restoration)")
    res = requests.post(f"{BASE_URL}/api/bookings/{user1_booking_id}/cancel/", headers=user1_headers)
    assert_status(res, 200, "Cancel booking")

    res = requests.get(f"{BASE_URL}/api/sessions/{session_id}/")
    session_state = res.json()
    assert session_state["remaining_seats"] == 1
    assert session_state["is_sold_out"] is False
    print(f"   Seat restored successfully! Remaining seats: {session_state['remaining_seats']}")

    # 11. User 3 Now Successfully Books Released Seat
    log_test(11, "User 3 Books Newly Released Seat")
    res = requests.post(f"{BASE_URL}/api/sessions/{session_id}/book/", headers=user3_headers)
    assert_status(res, 201, "User 3 booking released seat")
    print(f"   User 3 successfully booked the released seat!")

    # 12. Creator Inspects Live Attendee Roster
    log_test(12, "Creator Inspects Live Attendee Roster")
    res = requests.get(f"{BASE_URL}/api/sessions/{session_id}/", headers=creator_headers)
    assert_status(res, 200, "Creator view session")
    session_data = res.json()
    attendees = session_data.get("attendees", [])
    print(f"   Creator sees {len(attendees)} confirmed attendees in roster:")
    for att in attendees:
        print(f"    • {att['user']['email']} (Booked at: {att['created_at']})")
    assert len(attendees) == 2, f"Expected 2 attendees, got {len(attendees)}"

    # 13. Authorization Test: Standard User Attempts Creator Endpoint
    log_test(13, "Standard User Attempts Creator-Only POST /api/sessions/")
    res = requests.post(f"{BASE_URL}/api/sessions/", json=session_payload, headers=user1_headers)
    assert_status(res, 403, "User forbidden from creating session")
    print(f"   Protected successfully with 403 Forbidden: {res.json()['detail']}")

    # 14. Authorization Test: Unauthenticated Request
    log_test(14, "Unauthenticated Request to /api/auth/profile/")
    res = requests.get(f"{BASE_URL}/api/auth/profile/")
    assert_status(res, 401, "Unauthenticated rejected")
    print(f"   Protected successfully with 401 Unauthorized: {res.json()['detail']}")

    # 15. User Checks "My Bookings"
    log_test(15, "User 3 Views My Bookings")
    res = requests.get(f"{BASE_URL}/api/bookings/my-bookings/", headers=user3_headers)
    assert_status(res, 200, "My bookings")
    my_bookings = res.json()
    assert len(my_bookings) >= 1
    print(f"   User 3 has {len(my_bookings)} active booking reference(s).")

    print("\n" + "=" * 70)
    print(" 🎉 ALL 15 END-TO-END QA INTEGRATION CHECKS PASSED PERFECTLY! ")
    print("=" * 70)

if __name__ == '__main__':
    run_qa()
