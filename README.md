# 🎮 SOS Multiplayer Game

A real-time, browser-based **SOS** multiplayer game built with **React + Vite** and **Firebase Realtime Database**. Two players on different devices play on a shared 6×6 board — no backend server required.

---

## ✨ Features

- 🎯 **6×6 SOS board** — place S or O, form SOS sequences in any direction
- ⚡ **Real-time sync** via Firebase Realtime Database (no polling)
- 🔗 **Room codes + shareable invite links** — no registration required
- 👤 **Nickname-only** — no login or account needed
- 🔄 **Reconnect support** — refresh the browser and rejoin seamlessly
- 🏆 **Score tracking** — extra turn when you score an SOS
- 📱 **Mobile-friendly** — responsive glassmorphism UI with smooth animations
- 🔒 **Firebase security rules** — validated server-side, not just client-side

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd sos-multiplayer-game
npm install
```

### 2. Configure Firebase

Copy the environment example:

```bash
cp .env.example .env
```

Then edit `.env` with your Firebase project credentials (see [Firebase Setup](#-firebase-setup) below).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in two different browser tabs/windows to test.

---

## 🔥 Firebase Setup

### Step 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Click **Add project** → give it a name (e.g. `sos-game`) → Continue
3. Disable Google Analytics (optional) → **Create project**

### Step 2 — Enable Realtime Database

1. In your project sidebar, click **Build → Realtime Database**
2. Click **Create Database**
3. Choose a region (e.g. `us-central1`)
4. Start in **test mode** (you'll apply proper rules next)

### Step 3 — Register a Web App

1. Click the gear icon ⚙️ → **Project settings**
2. Scroll to **Your apps** → click the `</>` (Web) icon
3. Give the app a nickname → **Register app**
4. Copy the `firebaseConfig` values shown

### Step 4 — Fill in `.env`

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...:web:abc...
```

> ⚠️ **Never commit `.env` to Git.** It is already in `.gitignore`.

### Step 5 — Apply Security Rules

In the Firebase Console → **Realtime Database → Rules tab**, paste the contents of `firebase-rules.json`:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": "!data.exists()",
        "players": {
          "$playerId": {
            ".read": true,
            ".write": "auth == null || $playerId == auth.uid || data.exists()"
          }
        },
        "status": {
          ".validate": "newData.val() === 'waiting' || newData.val() === 'playing' || newData.val() === 'finished'"
        },
        ".write": "!data.child('status').exists() || data.child('status').val() !== 'finished' || newData.child('status').val() === 'playing'"
      }
    }
  }
}
```

Click **Publish**.

---

## 🎯 How to Play

| Action | Effect |
|--------|--------|
| Select **S** or **O** | Choose the letter to place |
| Click an empty cell | Place your letter |
| Complete **S–O–S** | Score +1 point **and** get an extra turn |
| Multiple SOS in one move | Score for each sequence |
| Board is full | Game ends; most points wins |

**Directions checked:** Horizontal → Vertical → Diagonal (both) = 4 directions × 3 offsets = checks all possible SOS windows containing your move.

---

## 📐 Architecture

```
src/
├── firebase.js          # Firebase init + config validation
├── firebaseService.js   # Database read/write operations + runTransaction
├── gameLogic.js         # Pure game logic (SOS detection, scoring)
├── App.jsx              # Router + Firebase banner
├── index.css            # Global design system (CSS variables + animations)
├── components/
│   ├── Board.jsx        # 6×6 grid with SOS highlighting
│   ├── Scoreboard.jsx   # Player scores + turn indicator
│   ├── LetterPicker.jsx # S/O selector buttons
│   ├── InviteLink.jsx   # Copyable invite URL
│   ├── EndGameOverlay.jsx  # Win/Draw/Lose modal
│   ├── Toast.jsx        # Scored notification popup
│   └── FirebaseSetupBanner.jsx
└── pages/
    ├── HomePage.jsx     # Create/Join room forms
    └── GamePage.jsx     # Live game with Firebase subscription
```

### Data model (Firebase)

```
rooms/
  {ROOM_CODE}/
    roomCode: string
    status: 'waiting' | 'playing' | 'finished'
    currentTurn: playerId
    playerOrder: [p1Id, p2Id]
    board: string[]           # flat array of 36 cells ('', 'S', 'O')
    winner: playerId | null
    draw: boolean
    lastMoveAt: timestamp
    players/
      {playerId}/
        id: string
        nickname: string
        score: number
        connected: boolean
        joinedAt: timestamp
```

### Concurrency safety

Moves use **`runTransaction()`** to atomically:
1. Verify it is the correct player's turn
2. Verify the cell is empty  
3. Apply the letter, compute new SOS sequences, update the score, and flip the turn

This prevents race conditions if two clients send conflicting writes simultaneously.

---

## 🌐 Deploying to Vercel

### Option A — Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked for the build command use `npm run build` and output directory `dist`.

### Option B — Vercel Dashboard

1. Push your code to GitHub
2. Go to [https://vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Under **Environment Variables**, add all `VITE_FIREBASE_*` keys from your `.env`
5. Click **Deploy**

The included `vercel.json` ensures all routes redirect to `index.html` (required for React Router).

---

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at [http://localhost:5173](http://localhost:5173) |
| `npm run build` | Build for production → `dist/` |
| `npm run preview` | Preview production build locally |

---

## 📄 License

MIT — do whatever you want with it.
