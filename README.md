# 🎓 PeerBridge — Mobile Application

> **Student-to-Student Learning & Peer Collaboration Mobile Platform**  
> Built with **React Native (Expo)**, **Node.js + Express (TypeScript)**, and **MongoDB Atlas**.

---

## 📱 Mobile Visual Aesthetic & Screens (Inspired by TeachNest UI)
The app implements the modern **Emerald Green (`#00C48C` / `#10B981`)** design language:
1. **My Courses / Purchases Dashboard**: "15 Courses You Purchasing", course progress indicators, enrolled course cards with 5-star ratings.
2. **Mentors Discovery Grid**: 2-column portrait grid of peer tutors (e.g., Kawsar Ahmed, Mahbuba, Priya) with star ratings, courses count, and enrolled student counts.
3. **Course & Mentorship Detail Modal**: Large hero preview player, "BEST SELLING" badge, 63 lessons counter, related lessons list, and sticky bottom **ORDER NOW** CTA.
4. **Chat & Live Mentorship**: Real-time communication with voice note audio waves (`0:37` waveform player), online status dot, calling actions, and message timestamps.
5. **Interactive Practice Quiz & AI Study Assistant**: Numbered question bubbles `(1) (2) (3) (4) [5] (6) (7)`, countdown timer (`01:47`), multiple-choice cards (A, B, C, D), automatic scoring, and +10 Learning Credits reward.
6. **Student Projects & Credit Wallet**: Segmented tabs (`Lesson`, `Project`, `Q+A`), project cards with author badges and star counts (`★ 577`), and credit transaction history ledger.

---

## 🔐 Authentication Flows (Integrated & Verified)
1. **Google One-Tap Sign-In (OAuth 2.0)**:
   - Configured with `GOOGLE_CLIENT_ID: 362181837457-i3tj8e66mm4mpraqc7l761q948jmvkb6.apps.googleusercontent.com`.
   - Single-tap authentication linking verified Google profile, name, and avatar.
2. **Email + 6-Digit OTP Passwordless Verification (SMTP)**:
   - Live Gmail SMTP configuration via `devops@kaizeninfinities.com`.
   - Sends beautiful HTML branded email with 6-digit OTP (valid for 10 minutes with MongoDB TTL auto-cleanup).
   - Instant OTP verification with auto-account creation and +50 Welcome Learning Credits.
3. **Role-Aware Password Login**:
   - Traditional credentials login with Bcrypt hashing and JWT tokens.
- **MongoDB Cluster URI**: Configured in `backend/.env`.
- **Database Name**: `agri` / `peerbridge` with atomic transactions.
- **REST Endpoints**:
  - `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
  - `GET /api/v1/tutors`, `GET /api/v1/tutors/:id`, `GET /api/v1/tutors/recommended`
  - `POST /api/v1/sessions/book`, `GET /api/v1/sessions/my`, `POST /api/v1/sessions/:id/complete`
  - `GET /api/v1/chat/:userId`, `POST /api/v1/chat/send`
  - `GET /api/v1/credits/wallet`
  - `GET /api/v1/quizzes`, `GET /api/v1/quizzes/:id`, `POST /api/v1/quizzes/:id/submit`
- **Socket.IO Real-Time Gateway**: Live message exchange and room broadcasts.

---

## 🚀 How to Run the Project

### 1. Start the Backend Server
```bash
cd backend
npm run seed     # Seeds demo mentors (Kawsar, Mahbuba), quizzes & sessions
npm run dev      # Starts API server on http://localhost:5000
```
Health Check: `http://localhost:5000/api/v1/health`

### 2. Start the Mobile App
```bash
cd mobile
npm start
```

### 3. Run on Android Phone or Emulator
- **Physical Phone**: Install the **Expo Go** app from Google Play Store on your Android device. Scan the QR code shown in your terminal.
  > *Note: For physical phones, update `API_URL` in `mobile/src/services/api.ts` to your PC's local Wi-Fi IP address (e.g., `http://192.168.1.100:5000/api/v1`).*
- **Android Emulator**: Press `a` in the terminal to launch on the Android emulator. (Emulator automatically connects via `http://10.0.2.2:5000/api/v1`).

### 4. Build Installable Android APK (EAS Build)
```bash
cd mobile
npm install -g eas-cli
eas build:configure
eas build -p android --profile preview
```
This produces a downloadable, standalone `.apk` that can be directly installed on any Android phone.

---

## 🔑 Demo Accounts
| Role | Email | Password | Credits |
| :--- | :--- | :--- | :--- |
| **Student** | `student@peerbridge.edu` | `peerbridge123` | 85 Credits |
| **Mentor (UI/UX)** | `kawsar@peerbridge.edu` | `peerbridge123` | 140 Credits |
| **Mentor (Biomedical)**| `mahbuba@peerbridge.edu` | `peerbridge123` | 95 Credits |
