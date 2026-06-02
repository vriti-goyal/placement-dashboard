This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Google OAuth Setup

To enable authentication for this dashboard, you need to configure a Google Cloud project and generate OAuth credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "Placement Dashboard").
3. Navigate to **APIs & Services** > **OAuth consent screen**.
   - Choose "External" (or "Internal" if you have a Google Workspace).
   - Fill out the required app information.
   - Click "Add or Remove Scopes" and manually add the following:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
     - `https://www.googleapis.com/auth/gmail.readonly` (Crucial for fetching emails later).
   - Add your email address to "Test users" if your app is in "Testing" mode.
4. Navigate to **APIs & Services** > **Credentials**.
   - Click "Create Credentials" > "OAuth client ID".
   - Application type: "Web application".
   - Name: (e.g., "Next.js App").
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**.
6. Open `.env.local` and paste them into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
7. Generate a secure string for `NEXTAUTH_SECRET` (e.g., `openssl rand -base64 32`) and paste it into `.env.local`.

## Firebase Setup

This dashboard uses Firebase Firestore as its database. To configure it:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (e.g., "TNP Dashboard DB").
3. In Project Settings > General, register a new Web App.
4. Copy the Firebase config object and populate the following in your `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
5. Enable **Firestore Database** in the Firebase console and start in test mode (or configure appropriate security rules).
6. Go to Project Settings > Service Accounts.
7. Click **Generate new private key** and download the JSON file.
8. Stringify the JSON file contents and paste it into `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`. You can do this in a Node REPL:
   `JSON.stringify(require('./path/to/service-account.json'))`

## API Key Encryption

The application uses AES-256-GCM encryption to securely store Gemini API keys.
Generate a 32-byte hex string and add it to your `.env.local`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set the output as `ENCRYPTION_SECRET` in `.env.local`.
