# PaisaTrack

A personal finance tracker with an INR-first, multi-currency interface. Track transactions, accounts and transfers, budgets, savings goals, recurring payments, net worth and reports.

**Stack:** React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Firebase Authentication · Cloud Firestore · Chart.js

## Quick start

**Requirements:** Node.js 20.19+ (22 LTS recommended) and npm.

```bash
git clone https://github.com/<your-username>/<your-repository>.git
cd <your-repository>
npm install
```

Create your local environment file:

```bash
# Windows PowerShell
Copy-Item .env.example .env
# macOS / Linux
cp .env.example .env
```

Fill in the Firebase web-app settings in `.env` (see [Firebase setup](#firebase-setup)), then run:

```bash
npm run dev
```

Open http://localhost:3000.

## Firebase setup

This application uses Firebase Authentication and Cloud Firestore. The repository includes the original Firebase *web app configuration* to preserve the existing project setup. Firebase web config values (including the API key) are identifiers used by browser applications, not admin credentials. However:

- **Never commit** Firebase service-account JSON files, Admin SDK private keys, OAuth client secrets, or real `.env` files.
- Configure API-key restrictions in Google Cloud Console where appropriate.
- Enable the sign-in providers used by the app in Firebase Console → Authentication → Sign-in method.
- Create/verify the Firestore database referenced by `VITE_FIREBASE_FIRESTORE_DATABASE_ID`.
- Review and deploy `firestore.rules` to the correct Firebase project before using real data. Do not deploy rules blindly to a production project.
- Add your deployed website's domain under Firebase Authentication → Settings → Authorized domains.
- For a separate Firebase project, copy `.env.example` to `.env` and fill in all values from Firebase Console → Project settings → General → Your apps → Web app. Environment variables override the bundled fallback configuration.

The `.firebaserc` file is intentionally not included, so Firebase CLI commands cannot accidentally target the original author's project. Select your own project explicitly when using Firebase CLI.

## Useful commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Run the TypeScript check |
| `npm run lint` | Alias for the TypeScript check |
| `npm test` | Run unit tests |

## Deploying

Run `npm run build`, then deploy the generated `dist/` directory to your preferred static host (for example, Firebase Hosting, Vercel or Netlify). Set the same `VITE_FIREBASE_*` environment variables in the hosting provider's project settings.

## Data and security

User data is stored under user-scoped Firestore paths. The included `firestore.rules` is intended to restrict access to the signed-in owner. Review it against your app's data model and test it with the Firebase Emulator Suite before production deployment.

Money parsing and ledger helpers have unit tests. Monetary amounts are stored to two decimal places.

## Project documentation

- [Local setup and troubleshooting](LOCAL_SETUP.md)
- [Change log](docs/CHANGES.md)
- [Original project documentation](docs/ORIGINAL_README.md)

## License

See [LICENSE](LICENSE).
