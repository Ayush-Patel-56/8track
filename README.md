# 8Track ♾️

8Track is a premium, unified academic management **Progressive Web App (PWA)** designed specifically for college students. It combines predictive attendance tracking, advanced schedule management, Google Calendar synchronization, and offline capabilities into a sleek, glassmorphic interface.

## ✨ Key Features

-   **📈 Predictive Attendance**: Intelligent engine that calculates if you're "Safe to Miss" or need "Recovery" to maintain a 75% threshold.
-   **🗓️ Dynamic Timetable**: A weekly schedule that auto-resets every Saturday for the upcoming week, allowing for proactive planning.
-   **🔄 Google Calendar Sync**: One-click synchronization of your academic timetable with Google Calendar as high-visibility events.
-   **🌐 Offline First**: Powered by **Dexie.js (IndexedDB)** and a custom Sync Queue to allow marking attendance and managing tasks without an internet connection.
-   **🔐 Enterprise-Grade Auth**: Secure Access/Refresh token architecture with `httpOnly` cookies, OTP verification, and Google OAuth integration.
-   **🔔 Smart Notifications**: Real-time in-app alerts and Web Push notifications for attendance status changes and upcoming deadlines.
-   **📊 Academic Analytics**: Beautifully rendered charts for attendance streaks and performance history using Recharts.
-   **📄 Document Generation**: Export attendance summaries and schedules to professional PDFs using jsPDF.

## 🚀 Tech Stack

### Frontend (Client)
-   **Framework**: React 19 + Vite
-   **Styling**: Tailwind CSS v4 (Glassmorphism design)
-   **UI Components**: Radix UI + Custom design system
-   **State Management**: Zustand (Global) + TanStack Query v5 (Server)
-   **Storage**: Dexie.js (IndexedDB for offline cache)
-   **Utilities**: Axios, Lucide React, Recharts, jsPDF, date-fns

### Backend (Server)
-   **Runtime**: Node.js + Express 5
-   **Database**: MongoDB + Mongoose
-   **Security**: JWT (Access/Refresh), bcryptjs, Helmet, CORS, Express Rate Limit
-   **Integrations**: Google Calendar API (googleapis), Nodemailer (SMTP/OTP)
-   **Communication**: Web Push (VAPID)
-   **Validation**: Zod (Schema validation)
-   **Caching**: Node-cache (In-memory server-side caching)

## 📁 Project Structure

```text
8-Track/
├── frontend/                # React PWA codebase
│   ├── src/
│   │   ├── components/      # Layouts, Common UI, and Dashboard widgets
│   │   ├── pages/           # Route-level views (Dashboard, Subjects, Focus, etc.)
│   │   ├── store/           # Zustand stores (Auth, etc.)
│   │   ├── lib/             # API client, Offline DB, and Utility functions
│   │   └── assets/          # Static assets and icons
│   └── public/              # PWA manifest and service workers
├── backend/                 # Express API codebase
│   ├── src/
│   │   ├── controllers/     # Business logic (Auth, Attendance, Schedule, etc.)
│   │   ├── models/          # Mongoose Schemas (User, Subject, Attendance, etc.)
│   │   ├── routes/          # API Route definitions
│   │   ├── middleware/      # Auth guards, Error handling, and Caching
│   │   └── utils/           # Prediction engine, Email service, etc.
│   └── vercel.json          # Serverless deployment config
└── GOOGLE_SETUP.md          # Guide for Google OAuth & Calendar integration
```

## 🔒 Authentication & Security

The application implements a robust security model:
1.  **Dual Token Flow**: Short-lived **Access Token** (in memory) and long-lived **Refresh Token** (`httpOnly` cookie).
2.  **OTP Verification**: Mandatory email verification for new account registrations.
3.  **Google OAuth 2.0**: Seamless login and calendar permissions management.
4.  **XSS Protection**: Tokens are never stored in `localStorage`, making the app resistant to cross-site scripting.
5.  **CSRF Mitigations**: `SameSite=Strict` and `Secure` cookie attributes.

## 🛠️ Local Development Setup

### 1. Prerequisites
-   Node.js (v18+)
-   MongoDB Atlas account
-   Google Cloud Project (for Calendar/Login)
-   SMTP Server (e.g., Gmail App Password)

### 2. Environment Variables
Create a `.env` file in the `backend/` directory using `.env.example` as a template:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
FRONTEND_URL=http://localhost:5173
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
SMTP_USER=your_email
SMTP_PASS=your_app_password
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
```

### 3. Installation & Execution
```bash
# Install dependencies for both parts
cd backend && npm install
cd ../frontend && npm install

# Run Backend (Terminal 1)
cd backend
npm run dev

# Run Frontend (Terminal 2)
cd frontend
npm run dev
```

The app will be accessible at `http://localhost:5173`.

## 📈 Attendance Prediction Engine

The core logic uses two primary metrics to keep you on track:
-   **Safe to Miss**: `Math.floor((Attended - 0.75 * Total) / 0.75)`
-   **Recovery Needed**: `Math.ceil((0.75 * Total - Attended) / 0.25)`

Status is visually indicated as:
-   🟢 **Safe**: >= 75%
-   🟡 **Warning**: 70% - 74.9%
-   🔴 **Danger**: < 70%

## 🗺️ Roadmap & Current Status
-   [x] Phase 1: Auth & OTP Verification
-   [x] Phase 2: Subject & Schedule Management
-   [x] Phase 3: Attendance Tracking & Prediction
-   [x] Phase 4: Google Calendar Integration
-   [x] Phase 5: Focus Mode & Task Management
-   [/] Phase 6: Full PWA Service Worker (Offline Support)
-   [ ] Phase 7: Analytics Dashboard v2

---
Developed with ❤️ by the 8Track Team.
