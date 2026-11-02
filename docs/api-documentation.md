# 📘 PeerBridge — Complete API Documentation

Base URL: `http://localhost:5000/api/v1` (or local Wi-Fi IP for physical Android testing: `http://192.168.x.x:5000/api/v1`)

---

## 1. Authentication Endpoints

### `POST /auth/register`
Creates a new student or peer tutor account.
- **Request Body**:
```json
{
  "name": "Gokul",
  "email": "student@peerbridge.edu",
  "password": "peerbridge123",
  "role": "student", // 'student' | 'tutor' | 'both'
  "college": "Kongu Engineering College",
  "department": "Computer Science & Engineering"
}
```
- **Response `201`**:
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "token": "JWT_ACCESS_TOKEN",
    "user": {
      "id": "6718...",
      "name": "Gokul",
      "email": "student@peerbridge.edu",
      "learningCredits": 50
    }
  }
}
```

### `POST /auth/login`
Authenticates a user and returns an access token.
- **Request Body**:
```json
{
  "email": "student@peerbridge.edu",
  "password": "peerbridge123"
}
```

### `GET /auth/me`
Fetches current logged in user profile (Requires `Authorization: Bearer <token>`).

---

## 2. Tutor & Peer Discovery

### `GET /tutors`
Query parameters:
- `subject`: (optional) e.g. `UI/UX Design`, `Programming`, `Mathematics`
- `search`: (optional) keywords to search in name, skills, bio
- `sortBy`: `rating` | `students` | `rate`

### `GET /tutors/:id`
Retrieves detailed profile, courses, and stats for a tutor.

### `GET /tutors/recommended`
Returns top compatibility matches for the current student.

---

## 3. Session Booking Lifecycle

### `POST /sessions/book`
(Requires Auth) Books a 1-on-1 peer session. Deducts credit fee atomically.
```json
{
  "tutorId": "6718...",
  "subject": "UI/UX Design",
  "topic": "Mobile App Wireframing",
  "scheduledDate": "2026-10-25T14:30:00.000Z",
  "durationMins": 45,
  "creditCost": 20,
  "notes": "Need feedback on onboarding flow"
}
```

### `GET /sessions/my`
Retrieves all sessions where user is student or tutor.

### `POST /sessions/:id/complete`
Marks session completed, submits star rating (1–5) and review, and automatically transfers earned credits to the tutor.
```json
{
  "rating": 5,
  "reviewText": "Awesome mentor! Fixed my design doubts in 20 minutes."
}
```

---

## 4. Real-time Messages & Chat

### `GET /chat/:userId`
Retrieves chat message history between current user and peer. Supports text, audio voice note duration, and timestamps.

### `POST /chat/send`
Sends message (text or audio duration):
```json
{
  "receiverId": "6718...",
  "content": "Audio explanation for question 3",
  "type": "audio",
  "audioDuration": "0:37",
  "sessionId": "6718..."
}
```

---

## 5. Learning Credit Wallet

### `GET /credits/wallet`
Returns credit balance and ledger transactions history (earned, spent, bonuses).

---

## 6. Practice Quizzes & AI Study Assistant

### `GET /quizzes`
Returns available quizzes.

### `GET /quizzes/:id`
Returns quiz questions matching mockup layout.

### `POST /quizzes/:id/submit`
Grades submission and awards +10 bonus credits if score >= 70%.
