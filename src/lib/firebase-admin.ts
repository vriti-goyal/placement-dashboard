import * as admin from 'firebase-admin';

// Check if we have the service account key configured
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!admin.apps.length) {
  try {
    let credential;

    if (serviceAccountKey) {
      // Parse the JSON string from the environment variable
      const serviceAccount = JSON.parse(serviceAccountKey);
      credential = admin.credential.cert(serviceAccount);
    } else {
      // Fallback for default credentials if running in GCP, or will fail if local
      credential = admin.credential.applicationDefault();
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is missing. Falling back to applicationDefault credentials.");
    }

    admin.initializeApp({
      credential,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
