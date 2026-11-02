# PaisaTrack - Local Setup (Windows / PowerShell / VS Code)

PaisaTrack is a **Vite + React 19 + TypeScript** app (npm scripts: `dev`, `build`, `preview`, `lint`, `test`).
It uses **Firebase Authentication** and **Cloud Firestore** (a *named* database created by Google AI Studio).
Nothing here deploys anything online; it runs on your PC at http://localhost:3000.

## 1. Requirements

- **Node.js 22 LTS** recommended (minimum **20.19**; `package.json` declares `engines.node >= 20.19.0`).
  Check with: `node -v` and `npm -v`. Download from https://nodejs.org (choose LTS).
- **Visual Studio Code** (optional) and an internet connection (Firebase + exchange rates are online services).

## 2. Open the project

```powershell
cd "C:\path\to\PaisaTrack-Final"
code .
```

## 3. Install dependencies

```powershell
npm install
```

If PowerShell says *"running scripts is disabled on this system"*, run once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

(or use `npm.cmd install` / `npm.cmd run dev` instead of `npm`).

## 4. Configure Firebase (`.env`)

The project already contains the Firebase web config of the original app in
`firebase-applet-config.json` (project `peta-poet-b5v9p`), so **the app works without a `.env`**.
To override it (for example with your own Firebase project), create `.env`:

```powershell
Copy-Item .env.example .env
notepad .env
```

Fill in these values (all optional; empty = use `firebase-applet-config.json`):

| Variable | Where to find it |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console > Project settings > General > Your apps > Web app > SDK setup |
| `VITE_FIREBASE_AUTH_DOMAIN` | same place (`<project-id>.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | same place |
| `VITE_FIREBASE_APP_ID` | same place |
| `VITE_FIREBASE_STORAGE_BUCKET` | same place |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | same place |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | Firebase Console > Firestore Database > the database id (this app uses a **named** database, not `(default)`) |

These are public identifiers, not secrets. **Never** put a service-account JSON/private key in this project.
Restart `npm run dev` after editing `.env`.

### Firebase Console checklist (one time)

1. **Authentication > Sign-in method**: enable **Email/Password** (and **Google** if you use Google sign-in).
2. **Authentication > Settings > Authorized domains**: `localhost` must be listed (it is by default).
3. **Firestore rules**: the rules in `firestore.rules` must be published to the database named above.
   Without them every read/write is rejected and the app shows a red "could not be loaded" banner.
   To publish them from this folder (requires a Firebase login with access to the project):

   ```powershell
   npx firebase-tools login
   npx firebase-tools deploy --only firestore --project peta-poet-b5v9p
   ```

   (`firebase.json` points at the named database. Alternatively paste `firestore.rules` into
   Console > Firestore > Rules for that database and press **Publish**.)

## 5. Start the development server

```powershell
npm run dev
```

Open **http://localhost:3000** in your browser. Stop the server with **Ctrl + C** in the terminal.

## 6. Build / preview / checks

```powershell
npm run build      # production build into dist\
npm run preview    # serve the production build at http://localhost:4173
npm run lint       # TypeScript type-check (tsc --noEmit)
npm test           # unit tests for money parsing and balance logic
npm run clean      # delete dist\
```

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `npm` not recognised | Reinstall Node.js LTS, reopen PowerShell/VS Code |
| Script execution disabled | See step 3 (`Set-ExecutionPolicy ...` or `npm.cmd`) |
| `Port 3000 is already in use` | `netstat -ano \| findstr :3000` then `taskkill /PID <pid> /F`, or `npm run dev -- --port 3001` |
| Red banner "Firestore denied access ..." | Publish `firestore.rules` to the database named in your config (step 4.3); make sure you are signed in |
| `auth/unauthorized-domain` | Add `localhost` to Firebase Authentication > Authorized domains |
| `auth/operation-not-allowed` | Enable the sign-in provider in Firebase Authentication |
| `auth/popup-blocked` (Google sign-in) | Allow pop-ups for localhost:3000 |
| Blank page after editing `.env` | Stop and restart `npm run dev` (Vite reads `.env` only at start) |
| Dependency / peer errors on install | Delete `node_modules` and `package-lock.json`, run `npm install` again; make sure Node >= 20.19 |
| Exchange rates not updating | They come from open.er-api.com; offline use falls back to cached rates |

## 8. Manual test checklist (needs your Firebase login)

Run these in the browser; each one needs a real Firebase account, so they were **not** run by the author of this package:

1. Register a new user, log out, log in.
2. Record Income of 2,000 (type `2000` or `2,000`) - it must save with no "valid amount" error.
3. Record Expense of 500. Both appear in Transactions (counter "2 of 2 records").
4. Refresh the page (F5): both still there. Log out and in: both still there.
5. Edit a transaction (amount/account): account balance changes by the difference only.
6. Delete a transaction: balance returns; the record disappears.
7. Dashboard: income 2,000, expense 500, savings 1,500 (for the selected period).
8. Create a budget, a savings goal, add a contribution (account balance drops by the contribution).
9. Create a recurring payment and press "Log": exactly one transaction; pressing again for the same due date is blocked.
10. Create a second bank account; transfer between accounts (balances move; income/expense totals unchanged).
11. Reports: totals match the ledger for the chosen date range; export works.
12. Create a second user and confirm they cannot see the first user's data.
13. Resize the browser to phone width and check layouts.
