# 🎓 PeerBridge — Comprehensive Project Documentation & Technical Report

> **A Next-Generation Student-to-Student Collaborative Learning & Peer Mentorship Ecosystem**  
> *Developed for Academic Project Submission & Technical Reference*

---

## 📑 Table of Contents
1. [Executive Summary & Abstract](#1-executive-summary--abstract)
2. [Problem Statement & Proposed Solution](#2-problem-statement--proposed-solution)
3. [System Architecture & Technology Stack](#3-system-architecture--technology-stack)
4. [Core Functional Modules](#4-core-functional-modules)
   - [Module 1: Authentication & Role-Based Identity](#module-1-authentication--role-based-identity)
   - [Module 2: Peer Doubt Feed & Collaborative Q&A Forum](#module-2-peer-doubt-feed--collaborative-qa-forum)
   - [Module 3: Volunteer Resolution & Mentorship Handshake](#module-3-volunteer-resolution--mentorship-handshake)
   - [Module 4: 1-on-1 Peer Mentorship & Session Booking](#module-4-1-on-1-peer-mentorship--session-booking)
   - [Module 5: Real-Time Messaging & Voice Notes Gateway](#module-5-real-time-messaging--voice-notes-gateway)
   - [Module 6: Ephemeral Stories & Campus Micro-Learning](#module-6-ephemeral-stories--campus-micro-learning)
   - [Module 7: Interactive Practice Quizzes & Exam Prep](#module-7-interactive-practice-quizzes--exam-prep)
   - [Module 8: Credit Wallet & Gamified Economy](#module-8-credit-wallet--gamified-economy)
   - [Module 9: Social Graph & Notification System](#module-9-social-graph--notification-system)
5. [Database Schema & Entity-Relationship Data Models](#5-database-schema--entity-relationship-data-models)
6. [RESTful API Specifications & WebSocket Protocol](#6-restful-api-specifications--websocket-protocol)
7. [Mobile App User Interface & Navigation Flow](#7-mobile-app-user-interface--navigation-flow)
8. [Security, Performance & Architectural Decisions](#8-security-performance--architectural-decisions)
9. [Step-by-Step Installation & Deployment Manual](#9-step-by-step-installation--deployment-manual)
10. [College Viva & Presentation Defense Guide (Q&A)](#10-college-viva--presentation-defense-guide-qa)

---

## 1. Executive Summary & Abstract

**PeerBridge** is a decentralized, student-centric academic collaboration platform engineered to break down silos in higher education institutions. While modern college students face heightened academic challenges—complex syllabi, coding assignments, exam pressures, and project deadlines—they often hesitate to consult professors or struggle to find timely peer assistance.

PeerBridge solves this by bridging the gap between students seeking help and knowledgeable peers willing to mentor. Built using a modern cross-platform mobile stack (**React Native with Expo**) and a highly scalable backend micro-monolith (**Node.js, Express, TypeScript, Socket.IO, MongoDB Atlas**), PeerBridge integrates:
1. **Doubt Resolution Forum** with code snippets, video/image attachments, and peer volunteer handshakes.
2. **1-on-1 Scheduled Peer Mentorship** with automated credit escrow and rating reviews.
3. **Real-time Chat** supporting audio waveforms and multimedia file transfers.
4. **24-Hour Campus Ephemeral Stories** for rapid knowledge sharing and project updates.
5. **Interactive Timed Quizzes** that test concept mastery and reward students with virtual learning credits.
6. **A Gamified Learning Credit Economy**, incentivizing senior students and tutors to mentor without real-money paywalls.

---

## 2. Problem Statement & Proposed Solution

### The Academic Bottleneck (Problem)
- **Hesitation & Hierarchy**: Students often feel intimidated to approach professors with basic or conceptual doubts during office hours.
- **Disorganized Channels**: WhatsApp and Telegram groups are noisy, lack searchability, lack code highlighting, and offer no accountability or structured scheduling.
- **Zero Incentive for Tutors**: Senior students or top performers who spend time explaining concepts receive no recognition, credit, or structured schedule.
- **Isolation During Exam Preparation**: Late-night study sessions lack an instant support mechanism when students get stuck on critical problems.

### The PeerBridge Paradigm (Solution)
- **Structured Knowledge Exchange**: Categorized doubt feeds by subject (Data Structures, UI/UX, AI, Mathematics, etc.) with syntax-highlighted code and video attachments.
- **Volunteer Handshake Protocol**: Tutors can offer volunteer help on open doubts. The student reviews the helper's profile and initiates a private resolution session.
- **Gamified Virtual Credit System**: Every student receives **+50 free Welcome Credits**. Booking a 1-on-1 session costs ~15–20 credits. Tutors earn credits upon successful completion, and students can replenish credits by passing quizzes or helping others.
- **Campus Social Learning**: 24-hour stories, user follow systems, and peer project showcases create an encouraging collegiate learning culture.

---

## 3. System Architecture & Technology Stack

```
 ┌───────────────────────────────────────────────────────────────┐
 │               PeerBridge Cross-Platform Client                │
 │          React Native (Expo SDK 57) • TypeScript              │
 └───────────────────────────────┬───────────────────────────────┘
                                 │
                 REST API (HTTPS)│   Socket.IO (WSS)
                 JSON Payloads   │   Real-Time Bi-Directional
                                 ▼
 ┌───────────────────────────────────────────────────────────────┐
 │                     Node.js / Express API                     │
 │          (TypeScript Server running on Port 5000)             │
 │                                                               │
 │   ├── Rate Limiting (express-rate-limit)                      │
 │   ├── Auth Middleware (JWT & Refresh Token Rotation)          │
 │   ├── Socket.IO Gateway (Chat, Notifications, Live State)     │
 │   └── Zod / Schema Validation Layer                           │
 └──────┬──────────────────┬─────────────────────┬───────────────┘
        │                  │                     │
        ▼                  ▼                     ▼
┌───────────────┐  ┌───────────────┐     ┌───────────────┐
│ MongoDB Atlas │  │ Cloudinary CDN│     │ Gmail SMTP    │
│ Mongoose ODM  │  │ Media Storage │     │ Nodemailer    │
│ (Cloud DB)    │  │ (Images/Videos)     │ (OTP Emails)  │
└───────────────┘  └───────────────┘     └───────────────┘
```

### Detailed Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Mobile App (Frontend)** | React Native (Expo) | `SDK 57 / 0.86.3` | Native iOS, Android & Web cross-platform execution |
| **Language (Full-Stack)** | TypeScript | `v5.7 / v6.0` | End-to-end type safety, reliable refactoring |
| **Mobile State & Cache** | `@react-native-async-storage` | `2.2.0` | Offline-first persistent auth tokens and cached profile |
| **Icons & Aesthetics** | `@expo/vector-icons` (Ionicons) | `15.1.1` | TeachNest Emerald Green (`#00C48C`) modern design |
| **Backend Runtime** | Node.js + Express | `Express 4.21` | High-throughput asynchronous REST server |
| **Real-Time Engine** | Socket.IO | `4.8.1` | Sub-millisecond latency for chat, presence, & alerts |
| **Database** | MongoDB Atlas (Mongoose) | `Mongoose 8.9` | Schema-flexible document database with atomic updates |
| **Email Service** | Nodemailer (Live SMTP) | `10.2.1` | Branded HTML verification emails with 6-digit OTP |
| **Third-Party Auth** | Google OAuth 2.0 | `google-auth-library` | One-Tap zero-friction college account verification |
| **Media Hosting** | Cloudinary SDK | `2.11.0` | Secure cloud storage for doubt images, videos & stories |
| **Security & Crypto** | BcryptJS + JSONWebToken | `Bcrypt 2.4 / JWT 9.0` | 10-salt hashing and cryptographically signed session tokens |

---

## 4. Core Functional Modules

### Module 1: Authentication & Role-Based Identity
- **Dual Authentication Strategies**:
  1. **Google OAuth 2.0 One-Tap**: Instant authorization using university Google accounts.
  2. **Email + 6-Digit Passwordless OTP**: Sends a branded HTML email via SMTP. OTP is valid for 10 minutes with MongoDB TTL automatic expiration.
  3. **Credential Login**: Traditional email/password with Bcrypt hashing (cost factor 10).
- **Dual-Token Session Lifecycle**: Access Token (short-lived) + Refresh Token with database session tracking (`RefreshTokenSession`), supporting safe device logout and token rotation.
- **Welcome Incentive**: Brand-new registered users are immediately granted **+50 Learning Credits**.
- **User Persona & Profile**: Supports roles (`student`, `tutor`, `both`, `admin`) and academic classifications (`department`, `yearOfStudy`, `skills`, `canExplainSubjects`, `education`, `experience`, `projects`).

---

### Module 2: Peer Doubt Feed & Collaborative Q&A Forum
- **Feed Browsing & Filtering**: Filter doubts by subjects (`Computer Science`, `UI/UX`, `Mathematics`, `Electronics`), status (`OPEN`, `IN_PROGRESS`, `RESOLVED`), or text search.
- **Rich Media Posting**:
  - Code Snippets with programming language tags (e.g., Python, C++, TypeScript).
  - Multi-image swipeable carousel.
  - Video preview clips with duration indicators.
- **Peer Voting & Verification**:
  - Upvote count on questions to bubble critical assignment problems to the top.
  - Answers can be marked as `Accepted Answer` by the doubt creator, closing the doubt.
  - Helpful upvoting on individual answers.

---

### Module 3: Volunteer Resolution & Mentorship Handshake
- **Peer Volunteering**: When a qualified student spots an open doubt they know how to solve, they click **"Volunteer to Help"** and submit a brief introductory message.
- **Owner Review & Acceptance**: The doubt author receives a notification, inspects the volunteer's rating and subjects, and can click **Accept Volunteer**.
- **Automated Chat Bridge**: Upon acceptance, the system automatically spawns a dedicated real-time chat room between the two students, pre-populated with the doubt context.

---

### Module 4: 1-on-1 Peer Mentorship & Session Booking
- **Tutor Discovery Directory**: Two-column portrait cards with verified mentor badges, subject tags, hourly credit rates, overall star ratings (1–5), and total students tutored.
- **Booking Flow**:
  1. Student selects a tutor, subject, topic, and scheduled date/time.
  2. The system checks student wallet balance.
  3. Required credits (e.g., 20 credits) are escrowed.
  4. Both parties receive confirmation with video meeting room link (`meet.peerbridge.edu/...`).
- **Session Completion & Mutual Rating**:
  - Once completed, student submits a rating and review text.
  - Escrowed credits are automatically transferred to the tutor's wallet balance.

---

### Module 5: Real-Time Messaging & Voice Notes Gateway
- **Socket.IO Real-time Channels**: Private peer-to-peer rooms keyed by conversation hashes.
- **Message Types**:
  - Standard text chat.
  - Voice notes with interactive waveform scrubber player (`0:37`).
  - Image and file attachments.
- **Delivery & Presence**: Online status green indicators, typing indicators, read receipts (`isRead: true`), and unread badge counters.

---

### Module 6: Ephemeral Stories & Campus Micro-Learning
- **24-Hour Stories Carousel**: Prominently displayed at the top of the mobile home screen.
- **Story Creation**:
  - Image stories uploaded via camera/gallery to Cloudinary.
  - Dynamic colored text stories with customized gradient backgrounds.
  - Captions and tags.
- **Automatic Cleanup**: Powered by MongoDB TTL index (`expiresAt: 24 hours`), automatically removing expired stories from the database without cron jobs.
- **Interactive Engagement**: In-story likes, view counts, and quick reply direct messages.

---

### Module 7: Interactive Practice Quizzes & Exam Prep
- **Subject-Wise Question Banks**: Curated quizzes across core engineering disciplines.
- **Quiz Experience**:
  - Countdown timer header (e.g., `01:47 remaining`).
  - Visual numbered bubble pagination: `(1) (2) (3) [4] (5)`.
  - Instant multiple-choice options with color feedback.
- **Automatic Scoring & Rewards**:
  - Calculates percentage accuracy.
  - Displays answer explanations for incorrect choices.
  - Passing score immediately awards **+10 Learning Credits** to the student's wallet.

---

### Module 8: Credit Wallet & Gamified Economy
- **Why Virtual Credits?** Eliminates college payment friction, transaction fees, and legal student monetization barriers while driving high engagement.
- **Ledger-Grade Audit Trail**: Every credit movement creates an immutable `CreditTransaction` record with previous and new balances.
- **Economic Mechanics**:
  - `bonus`: +50 on account creation, +10 on passing quizzes.
  - `spent`: -15 to -25 when booking a peer tutor.
  - `earned`: +15 to +25 when tutor conducts and completes a session.
  - `refund`: Automated refund if a booking is cancelled before commencement.

---

### Module 9: Social Graph & Notification System
- **Follow / Unfollow Engine**: Follow peer mentors, batchmates, and campus study circles.
- **Follow Request Approval**: Private profiles require confirmation before granting access to personal study stories.
- **In-App Notification Center**:
  - Push banner alerts for new incoming messages.
  - Dedicated notification bell listing follow requests, volunteer proposals, answer upvotes, and credit bonuses.

---

## 5. Database Schema & Entity-Relationship Data Models

### 1. `User` Schema (`User.ts`)
```typescript
{
  name: String (Required),
  email: String (Required, Unique, Lowercase),
  password: String (Bcrypt Hash),
  role: 'student' | 'tutor' | 'both' | 'admin',
  userType: 'student' | 'professional' | 'mentor' | 'alumni',
  headline: String,
  status: 'active' | 'pending' | 'suspended',
  isEmailVerified: Boolean,
  avatar: String (URL),
  college: String,
  department: String,
  yearOfStudy: Number,
  semester: Number,
  studentId: String,
  bio: String,
  education: [{ institution, degree, fieldOfStudy, startYear, endYear, grade }],
  experience: [{ title, company, location, startDate, endDate, description }],
  projects: [{ title, tag, description, link, stars, collaborators, image }],
  subjects: [String],
  skills: [String],
  learningInterests: [String],
  canExplainSubjects: [String],
  hourlyRateCredits: Number (Default: 15),
  learningCredits: Number (Default: 50),
  rating: Number (Default: 5.0),
  reviewCount: Number (Default: 0),
  coursesCount: Number (Default: 0),
  studentsCount: Number (Default: 0)
}
```

### 2. `Doubt` Schema (`Doubt.ts`)
```typescript
{
  title: String (Max 200),
  subject: String (Indexed),
  topic: String,
  question: String,
  codeSnippet: String,
  codeLanguage: String,
  attachments: [String],
  videoUrl: String,
  videoDuration: Number,
  videoThumbnail: String,
  tags: [String],
  author: ObjectId -> User (Indexed),
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
  volunteerCount: Number (Default: 0),
  answerCount: Number (Default: 0),
  upvotes: [ObjectId -> User],
  upvoteCount: Number (Default: 0),
  acceptedAnswerId: ObjectId -> Answer,
  viewsCount: Number (Default: 0),
  resolvedAt: Date
}
```

### 3. `VolunteerRequest` Schema (`VolunteerRequest.ts`)
```typescript
{
  doubtId: ObjectId -> Doubt (Indexed),
  volunteerId: ObjectId -> User (Indexed),
  ownerId: ObjectId -> User (Indexed),
  introMessage: String,
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN',
  respondedAt: Date
}
// Unique compound index: { doubtId: 1, volunteerId: 1 } prevents duplicate offers.
```

### 4. `Session` Schema (`Session.ts`)
```typescript
{
  studentId: ObjectId -> User (Required),
  tutorId: ObjectId -> User (Required),
  subject: String,
  topic: String,
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
  scheduledDate: Date,
  durationMins: Number (Default: 45),
  creditCost: Number (Default: 15),
  meetingLink: String,
  notes: String,
  rating: Number (1-5),
  reviewText: String
}
```

### 5. `Message` Schema (`Message.ts`)
```typescript
{
  sessionId: ObjectId -> Session (Optional),
  senderId: ObjectId -> User (Required),
  receiverId: ObjectId -> User (Required),
  content: String (Required),
  type: 'text' | 'audio' | 'image' | 'video' | 'file',
  mediaUrl: String,
  mediaDuration: Number,
  audioDuration: String,
  isRead: Boolean (Default: false)
}
```

### 6. `Story` Schema (`Story.ts`)
```typescript
{
  user: ObjectId -> User (Required),
  mediaUrl: String,
  mediaType: 'image' | 'text',
  caption: String,
  background: String,
  likes: [ObjectId -> User],
  comments: [{ user: ObjectId -> User, text: String, createdAt: Date }],
  views: [ObjectId -> User],
  expiresAt: Date (TTL Index: auto-deletes 24 hrs after creation)
}
```

### 7. `CreditTransaction` Schema (`CreditTransaction.ts`)
```typescript
{
  userId: ObjectId -> User (Required),
  amount: Number (Required),
  type: 'earned' | 'spent' | 'bonus' | 'refund',
  description: String,
  sessionId: ObjectId -> Session,
  balanceAfter: Number (Required)
}
```

---

## 6. RESTful API Specifications & WebSocket Protocol

Base URL: `http://localhost:5000/api/v1` (or device LAN IP `http://192.168.x.x:5000/api/v1`)

### Key API Endpoints Catalog

| Module | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/register` | Register new user (+50 credits) | No |
| **Auth** | `POST` | `/auth/login` | Email/password JWT login | No |
| **Auth** | `POST` | `/auth/google` | Google OAuth token verification | No |
| **Auth** | `POST` | `/auth/send-otp` | Generate & send 6-digit SMTP OTP | No |
| **Auth** | `POST` | `/auth/verify-otp` | Validate OTP & create/verify account | No |
| **Auth** | `GET` | `/auth/me` | Fetch authenticated user profile | Bearer Token |
| **Doubts** | `GET` | `/doubts` | Paginated feed with subject/tag filters | No / Optional |
| **Doubts** | `POST` | `/doubts` | Publish new doubt with images/snippets | Bearer Token |
| **Doubts** | `GET` | `/doubts/:id` | Get full doubt details with answers | No / Optional |
| **Doubts** | `POST` | `/doubts/:id/upvote` | Toggle helpful upvote on doubt | Bearer Token |
| **Volunteers** | `POST` | `/volunteers/:doubtId`| Submit offer to help on doubt | Bearer Token |
| **Volunteers** | `PATCH`| `/volunteers/:id` | Accept / decline volunteer offer | Bearer Token |
| **Answers** | `POST` | `/answers` | Submit detailed answer to a doubt | Bearer Token |
| **Answers** | `PATCH`| `/answers/:id/accept` | Doubt author accepts best answer | Bearer Token |
| **Tutors** | `GET` | `/tutors` | Browse & search verified mentors | No / Optional |
| **Tutors** | `GET` | `/tutors/recommended`| Recommended tutors for student | Bearer Token |
| **Sessions** | `POST` | `/sessions/book` | Book 1-on-1 session (Escrows credits) | Bearer Token |
| **Sessions** | `GET` | `/sessions/my` | View my scheduled & completed sessions | Bearer Token |
| **Sessions** | `POST` | `/sessions/:id/complete`| Mark completed, review & transfer credits | Bearer Token |
| **Chat** | `GET` | `/chat/:userId` | Retrieve message history with user | Bearer Token |
| **Chat** | `POST` | `/chat/send` | Send text / audio message | Bearer Token |
| **Stories** | `GET` | `/stories` | Active stories from peers | Bearer Token |
| **Stories** | `POST` | `/stories` | Upload 24-hr story (Image/Text) | Bearer Token |
| **Quizzes** | `GET` | `/quizzes` | List available subject quizzes | No / Optional |
| **Quizzes** | `POST` | `/quizzes/:id/submit`| Submit score & claim credit reward | Bearer Token |
| **Credits** | `GET` | `/credits/wallet` | Check balance & transaction history | Bearer Token |
| **Social** | `POST` | `/follow/:userId` | Follow or send follow request | Bearer Token |
| **Upload** | `POST` | `/upload` | Upload images/attachments to Cloudinary| Bearer Token |

### WebSocket Gateway Protocol (`socket.ts`)
```typescript
// Client Connection
const socket = io('http://localhost:5000', { auth: { token: 'JWT_TOKEN' } });

// Event Emitted to Join User's Private Notification & Chat Room
socket.emit('join_user', { userId });

// Real-time Chat Transmission
socket.emit('send_message', {
  senderId,
  receiverId,
  content,
  type: 'text' | 'audio'
});

// Real-time Message Listener
socket.on('receive_message', (message) => {
  // Update state, play tone, increment badge
});

// Real-time Notification Event
socket.on('notification', (payload) => {
  // Triggers Top In-App Floating Notification Banner
});
```

---

## 7. Mobile App User Interface & Navigation Flow

### Design System: TeachNest Theme
- **Primary Brand Color**: Emerald Teal Green (`#00C48C` / `#10B981`)
- **Accent Dark**: Deep Slate Charcoal (`#1E293B`)
- **Background**: Clean Pearl White / Card Grey (`#F8FAFC` / `#FFFFFF`)
- **Font & Iconography**: Rounded modern typography with Ionicons.

### Tab Navigation Structure
1. **Home Tab (`HomeScreen.tsx`)**:
   - Top Header: Campus title, Search shortcut, Notification bell with unread badge count, User avatar.
   - 24-Hour Stories Bar: User's own "Add Story" bubble + circular gradient peer stories.
   - My Courses / Ongoing Sessions: Progress indicators and upcoming appointments.
   - Recommended Mentors Grid: High-rated peer tutors with instant book buttons.
2. **Doubts Tab (`DoubtsFeedScreen.tsx`)**:
   - Filter chips: `All`, `Open`, `My Subjects`, `Computer Science`, `Mathematics`.
   - Doubt cards showing author avatar, college badge, question body, syntax code block, and volunteer counts.
3. **Add Button (Center Floating `+` Modal)**:
   - Quick launcher: "Ask a Doubt" or "Share a Story".
4. **Chat Tab (`ChatScreen.tsx`)**:
   - Active peer conversations, unread indicators, real-time typing indicators, and voice note waveforms.
5. **Profile / Wallet Tab (`ProjectsProfileScreen.tsx`)**:
   - Credit Wallet balance card with "Add Credits / Earn More".
   - Segmented views: `My Projects`, `Enrolled Lessons`, `Q&A History`.
   - Comprehensive profile edit (Skills, Bio, Education, GitHub links).

---

## 8. Security, Performance & Architectural Decisions

1. **Password Security**:
   - Bcrypt with 10 salt rounds ensures brute-force resistance.
   - Passwords are automatically excluded from Mongoose query outputs by default.
2. **Authentication Rate Limiting**:
   - Express rate-limiter prevents brute-force login or OTP enumeration attacks on `/auth` routes.
3. **TTL (Time-To-Live) Database Indexes**:
   - Stories automatically self-destruct after 24 hours (`expiresAt` TTL).
   - OTP codes self-destruct after 10 minutes, preventing database bloat and replay attacks.
4. **Credit Integrity & Atomic Transactions**:
   - Credit transfers are performed with atomic MongoDB balance deductions and increments, preventing double-spending vulnerabilities.
5. **Optimized Cross-Platform Network Routing**:
   - Local Wi-Fi dynamic IP resolution enables live real-device testing via the Expo Go app.

---

## 9. Step-by-Step Installation & Deployment Manual

### Prerequisites
- Node.js (v18 or higher recommended)
- Git
- Expo CLI (`npm install -g expo-cli`)
- Physical Smartphone with **Expo Go** app installed (or Android Studio Emulator)

---

### Step 1: Clone Repository
```bash
git clone <repo-url> PeerBridge
cd PeerBridge
```

---

### Step 2: Backend Configuration & Startup
```bash
cd backend
npm install
```

Create or verify `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/peerbridge?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key_peerbridge_2026
JWT_REFRESH_SECRET=super_secret_refresh_key_peerbridge_2026
GOOGLE_CLIENT_ID=362181837457-i3tj8e66mm4mpraqc7l761q948jmvkb6.apps.googleusercontent.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=586
SMTP_USER=devops@kaizeninfinities.com
SMTP_PASS=your_app_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Initialize sample data and start server:
```bash
# Seed initial mentors, subjects, quizzes & sample doubts
npm run db:init

# Start the dev server with hot reload
npm run dev
```
*Backend will be live at: `http://localhost:5000` (Health Check: `http://localhost:5000/api/v1/health`)*

---

### Step 3: Mobile App Configuration & Startup
```bash
cd ../mobile
npm install
```

Update `mobile/src/services/api.ts` with your machine's Wi-Fi IP address (e.g., `http://192.168.1.15:5000/api/v1`) so your physical mobile device can connect.

Start the Expo Development Server:
```bash
npx expo start
```
- Press `a` to run in Android Emulator, or
- Scan the displayed QR Code using the **Expo Go** app on your physical Android device!

---

## 10. College Viva & Presentation Defense Guide (Q&A)

### Q1: What makes PeerBridge different from Chegg, Brainly, or Stack Overflow?
**Answer**:
> *"Chegg and Brainly rely on static, text-based, subscription-gated solutions, while Stack Overflow has strict moderation that is unwelcoming to beginners. PeerBridge is built specifically for college campuses. It combines structured doubt resolution with real-time 1-on-1 peer mentoring, ephemeral learning stories, and a gamified internal credit economy that eliminates payment friction while actively incentivizing top students to mentor juniors."*

---

### Q2: Why did you choose React Native + Expo instead of Flutter or native Kotlin/Swift?
**Answer**:
> *"React Native with Expo provides single-codebase cross-platform deployment across iOS and Android with near-native 60 FPS performance. It enables instant updates and rapid prototyping using TypeScript, allowing seamless code sharing of models, types, and validation schemas between the mobile frontend and the Node.js backend."*

---

### Q3: How do you handle real-time communication and avoid server overload?
**Answer**:
> *"We utilize Socket.IO with WebSocket as the primary transport protocol, falling back to HTTP long-polling only if firewalls restrict sockets. Events are compartmentalized into targeted user and room channels (`socket.join('room')`), ensuring messages and notifications are broadcast strictly to relevant participants rather than flooding the entire server."*

---

### Q4: How does the virtual credit economy prevent fraud or double-spending?
**Answer**:
> *"Credit transactions are executed atomically on MongoDB using atomic increments (`$inc`). When a student books a session, the credits are escrowed. The tutor does not receive payment until the session is completed and marked with student review. Every single change is stored in an immutable `CreditTransaction` audit log, making balance tampering impossible."*

---

### Q5: What happens when an ephemeral story expires? Does it slow down the database?
**Answer**:
> *"We use MongoDB's native Time-To-Live (TTL) index on the `expiresAt` field. The MongoDB background daemon automatically purges documents whose expiration timestamp has elapsed. This operates at the storage engine level without requiring custom cron jobs or background server polling."*

---

## 🏁 Conclusion

PeerBridge is a production-grade, full-stack educational network designed to transform how students collaborate, learn, and grow. By integrating modern social media UX paradigms with high-utility academic tools and a gamified incentive structure, it delivers an engaging, scalable, and impactful solution for modern educational institutions.

---
*Created for PeerBridge Academic Project Portfolio & Evaluation.*

