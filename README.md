# 🎬 Movie Frnds

**Stop scrolling. Start watching.**

Movie Frnds is a real-time, two-player movie-matching web application that helps friends decide what to watch together. Create a room, invite a friend, swipe through movies, and discover mutual matches through a smooth, mobile-first experience.

Built with React, TypeScript, Firebase, and Framer Motion, Movie Frnds combines real-time synchronization with an Apple-inspired frosted-glass interface to make movie night decisions effortless.

## ✨ Features

- **👥 Two-Player Movie Matching** — Create a room and invite one friend to decide what to watch together.
- **⚡ Real-Time Synchronization** — Synchronize room activity and movie swipes using Firebase Cloud Firestore.
- **🎞️ Tinder-Style Movie Swiping** — Explore interactive movie cards with smooth drag gestures, rotation, and responsive swipe feedback.
- **💚 Mutual Match Celebration** — Celebrate when both players like the same movie, complete with animated effects.
- **🍿 Host-Controlled Fallback** — Reveal a top pick when the players cannot find a mutual match.
- **🔄 Continuous Rounds** — Fetch additional movies and continue playing without unnecessarily resetting the room.
- **📺 Streaming Availability** — View streaming provider information for matched movies where supported by the integration.
- **🍎 Apple-Inspired Interface** — Frosted-glass surfaces, subtle borders, soft gradients, and Cupertino-inspired interface elements.
- **📱 Mobile-First Experience** — Responsive layouts, touch gestures, safe-area spacing, and native sharing support on compatible devices.
- **🎨 Smooth Animations** — Framer Motion powers interactive card transitions and swipe feedback.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type safety |
| Vite | Development server and build tooling |
| Tailwind CSS v4 | Styling and responsive layouts |
| Framer Motion | Animations and swipe gestures |
| Lucide React | Icons |
| Firebase Anonymous Authentication | Player authentication |
| Cloud Firestore | Real-time room and swipe synchronization |
| TMDB API | Movie discovery and metadata |
| JustWatch integration | Streaming availability, where supported |
| canvas-confetti | Match celebration effects |

## 👥 Multiplayer Rooms

Movie Frnds currently supports **a maximum of two players per room**. The lobby enforces this limit, keeping the matching experience focused on decisions between friends.

The multiplayer workflow includes:

1. Create a room.
2. Share the room with a friend.
3. Join the same room.
4. Swipe through the available movies independently.
5. Discover mutual matches in real time.
6. Reveal a top pick if no mutual match is found.
7. Start another round and discover more movies.

Room access and permitted actions should be enforced through appropriately configured Firebase security rules, not just client-side checks.

## 🎛️ Movie Filtering Architecture

The room creation service supports configuration options for:

- **Genres** — Filter movie selections using genre IDs.
- **Streaming Providers** — Specify preferred provider IDs.
- **Region** — Configure the region used for movie and streaming availability.

These settings are supported internally by the room creation service. Currently, the landing page creates rooms using default settings rather than exposing a user-facing filter selection screen.

User-configurable filters may be added in a future update.

## 🚀 Getting Started

Follow these instructions to run Movie Frnds locally.

### Prerequisites

- [Node.js](https://nodejs.org/) — version 18 or later recommended
- npm or pnpm
- A [TMDB account](https://www.themoviedb.org/) and API key
- A [Firebase project](https://console.firebase.google.com/)

### 1. Clone the repository

```bash
git clone https://github.com/nagamanikanta5455/movie-frnds.git
cd movie-frnds
```

### 2. Install dependencies

Using npm:

```bash
npm install
```

Or, using pnpm:

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key_here
```

Replace the placeholder with your TMDB API key.

**Security note:** Vite exposes variables prefixed with `VITE_` to client-side code. Never store private server credentials or secrets in these variables.

### 4. Configure Firebase

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Create a Firebase project or select an existing one.
3. Register a web application.
4. Enable **Anonymous Authentication**.
5. Create a **Cloud Firestore** database.
6. Configure your Firebase project settings in `src/lib/firebase.ts`.

Example configuration:

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

Replace the placeholders with the configuration values provided by Firebase. Keep the configuration consistent with your project's existing environment setup.

### 5. Configure Firestore security rules

Before making the application publicly accessible, configure Firestore rules that enforce room membership, permitted operations, host permissions, and valid data changes.

**Do not deploy permissive rules that allow every authenticated user to modify every room.** Firebase Anonymous Authentication establishes a user identity but does not automatically authorize access to a specific room.

The correct rules depend on the application's actual Firestore schema and write operations. Test them with the [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite) before production deployment.

### 6. Start the development server

```bash
npm run dev
```

Open the local URL printed in your terminal, usually:

```text
http://localhost:5173
```

### 7. Test on a mobile device

To make the development server accessible on your local network:

```bash
npm run dev -- --host
```

Open the network URL displayed by Vite on a compatible device connected to the same network.

## 📁 Project Structure

The project is organized by application features and shared responsibilities.

```text
src/
├── components/          # Shared UI and design system components
├── features/
│   ├── auth/            # Anonymous authentication
│   ├── match/           # Match celebration and fallback screens
│   ├── room/            # Room creation, lobby, and synchronization
│   ├── swipe/           # Movie cards and swipe interactions
│   └── tmdb/            # Movie and streaming data integrations
├── lib/                 # Firebase initialization and shared utilities
├── types/               # TypeScript interfaces and application types
├── App.tsx              # Application routing and composition
└── main.tsx             # Application entry point
```

## 📦 Production Build

Build the optimized production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run these commands from the project root. Verify that the production build completes successfully before deployment.

## 🔐 Security & Configuration

Movie Frnds uses Firebase Authentication and Cloud Firestore for multiplayer functionality.

Before deploying publicly:

- Enforce least-privilege Firestore security rules.
- Validate room membership and host permissions.
- Validate incoming data and permitted state transitions.
- Prevent unauthorized room modifications.
- Avoid exposing private credentials in client-side environment variables.
- Handle API failures, invalid room IDs, and disconnected users gracefully.
- Test concurrent updates and duplicate swipe submissions.
- Review third-party API terms and attribution requirements.

Firebase client configuration is not a substitute for proper database security rules.

## 🧪 Testing

Test the core user journey before releasing a new version:

- Room creation and joining.
- Two-player room limit enforcement.
- Real-time swipe synchronization.
- Mutual-match detection.
- Host-controlled top-pick fallback.
- Starting subsequent rounds.
- Refreshing or reconnecting during a session.
- Handling failed movie API requests.
- Firestore authorization and invalid updates.
- Responsive layouts on mobile and desktop.

Automated tests for matching logic, state transitions, and Firestore security rules are recommended for improving reliability.

## 🗺️ Roadmap

Potential future improvements include:

- User-facing genre and streaming-provider filters.
- Regional movie discovery preferences.
- Improved room recovery and reconnection.
- Saved movie lists and watch history.
- Enhanced recommendation quality.
- Expanded accessibility support.
- Automated multiplayer and security testing.
- Production monitoring and performance optimization.

These are potential improvements, not claims that the features are already implemented.

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Test your changes locally.
5. Open a pull request describing the improvements.

For larger changes, consider opening an issue first to discuss the proposed implementation.

## 📄 License

This project is intended to be distributed under the MIT License. See the repository's [`LICENSE`](LICENSE) file for the applicable terms.

If the license file does not exist yet, add a valid MIT License file before describing the repository as MIT-licensed.

---

**Made for better movie nights. 🎬🍿**
