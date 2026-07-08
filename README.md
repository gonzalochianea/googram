<div align="center">
  <img src="./public/Googram%20logo.png" alt="Googram Logo" width="80" />
  <h1>Googram</h1>
  <p><strong>A Modern, Fast, and Scalable Social Media Web Application</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
    <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS" />
  </p>
</div>

---

## 🚀 About The Project

**Googram** is a fully functional, real-time social networking application built from scratch to demonstrate advanced front-end architecture and BaaS (Backend-as-a-Service) integration. Designed with a premium **Glassmorphism** UI, it offers a seamless and responsive user experience comparable to top-tier social platforms.

This project was developed with a strong focus on **clean code principles, custom React Hooks for state management, and real-time database synchronization**.

### 🌟 Key Features

* **🔐 Robust Authentication:**
  * Secure Email/Password registration and login.
  * Username-based login support.
  * Real-time Email Verification flow (blocks access until verified).
  * Password recovery system.
* **📱 Core Social Mechanics:**
  * **Global Feed & Explore:** Infinite scrolling feed with dynamic content loading.
  * **Interactive Posts:** Upload photos, add captions, like, and comment in real-time.
  * **Ephemeral Stories:** 24-hour disappearing stories with a dedicated full-screen viewer. Users can like and reply directly to stories.
* **👥 Dynamic User Connections:**
  * Follow/Unfollow system.
  * Private Accounts capability (Follow Requests: Accept/Reject).
  * Algorithmic "Who to follow" suggestions based on user graphs.
* **💬 Real-Time Messaging (Chat):**
  * Instant direct messaging between users.
  * Message editing, deletion, and "mark as read" functionalities.
  * Clear chat history capabilities.
* **🔔 Smart Notifications:**
  * Real-time alerts for likes, comments, follows, and follow requests.
  * Automatic filtering to prevent self-notification spam.
* **🎨 Premium UI/UX:**
  * Custom **Dark/Light Mode** with persistent local storage.
  * Animated Liquid Backgrounds and Glassmorphism modals.
  * Fully responsive design for mobile and desktop.

---

## 🏗️ Architecture & Technical Decisions

Googram moves away from bloated state management libraries (like Redux) in favor of **Custom React Hooks** that directly interface with Firebase's real-time listeners. This keeps the component tree shallow and highly performant.

### Custom Hooks (Business Logic Layer)
The logic is cleanly separated from the UI components into specialized hooks:

* `useAuth`: Manages global user session and routing guards.
* `usePosts`: Handles infinite scrolling, randomized explore feeds, and user-specific post fetching. Also encapsulates complex mutations (likes/comments).
* `useMessages`: Establishes WebSockets (`onSnapshot`) for real-time 1-on-1 chat routing and unread badges.
* `useNotifications`: Listens for incoming interactions and handles the logic for following back or accepting requests.
* `useStories`: Filters ephemeral content strictly checking timestamps (`< 24h`).
* `useProfile`: Manages the complex state of user relationships (Following, Follower, Pending).

### Backend (Firebase & ImgBB)
* **Firestore Database:** NoSQL document structure carefully designed to avoid heavy joins. Uses sub-collections for high-volume data (like `savedPosts`) and root collections for global queries.
* **Firebase Auth:** Handles security, session persistence, and email workflows.
* **ImgBB API:** Used as a lightweight CDN for image hosting, drastically reducing cloud storage costs.

---

## 💻 Code Quality & Best Practices

* **JSDoc Documentation:** Every hook and utility function is meticulously documented detailing parameters, return types, and context of usage.
* **Error Boundaries:** React Error Boundaries are implemented at the root level to prevent complete app crashes and provide graceful fallbacks.
* **Optimized Rendering:** Strict control over `useEffect` dependencies to prevent memory leaks with Firebase snapshot listeners.
* **Clean Architecture:** Strict separation between Layout components (`Sidebar`, `MainLayout`), Page components (`Home`, `Profile`), and UI elements (`Post`, `UploadModal`).

---

## 🛠️ Installation & Setup

If you want to run this project locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/googram.git
   cd googram
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase and ImgBB credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_IMGBB_API_KEY=your_imgbb_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

---

## 📸 Sneak Peek

*(Note to recruiter: This section will contain UI screenshots of the application).*

| Feed & Dark Mode | Profile & Stories | Real-time Chat |
| :---: | :---: | :---: |
| UI Showcase | UI Showcase | UI Showcase |

---
<div align="center">
  <i>Developed by Gonzalo Chianea</i>
</div>