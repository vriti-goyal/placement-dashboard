# Vercel Deployment Checklist

Follow these steps to deploy **tnpDash** to Vercel and ensure all Google OAuth and API integrations work seamlessly in production.

## 1. Prepare Environment Variables
Before deploying, gather all required environment variables from your `.env.local` file:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `GEMINI_API_KEY`
- `TNP_SENDER_EMAIL`

## 2. Deploy to Vercel
1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... > Project**.
3. Import your repository.
4. Expand the **Environment Variables** section.
5. Add all the environment variables listed in step 1.
6. Add one additional variable:
   - `NEXTAUTH_URL` = `https://<your-vercel-domain>.vercel.app` (You can find or set your domain in Vercel settings after the first deployment, so you may need to redeploy once you know the exact URL).
7. Click **Deploy**.

## 3. Update Google Cloud OAuth Consent Screen & Credentials
Once you have your production URL (e.g., `https://tnpdash-xyz.vercel.app`), you must authorize it in Google Cloud.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services > Credentials**.
3. Under **OAuth 2.0 Client IDs**, click your Web client (e.g., "Web client 1").
4. Under **Authorized JavaScript origins**, click **ADD URI** and add your production URL:
   - `https://tnpdash-xyz.vercel.app`
5. Under **Authorized redirect URIs**, click **ADD URI** and add the NextAuth callback URL:
   - `https://tnpdash-xyz.vercel.app/api/auth/callback/google`
6. Click **Save**.

> [!WARNING]
> It may take 5-10 minutes for Google to propagate these changes. If you get a `redirect_uri_mismatch` error immediately after saving, wait a few minutes and try again.

## 4. Final Testing
1. Visit your deployed Vercel app.
2. Click **Sign in with Google**.
3. Ensure the dashboard loads without errors.
4. If you see "Unauthorized (Token expired)" or "Rate limit exceeded" errors immediately, verify that `NEXTAUTH_SECRET` is set correctly and that your `NEXTAUTH_URL` exactly matches the domain you are visiting.
