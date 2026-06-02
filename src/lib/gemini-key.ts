import crypto from 'crypto';
import { adminDb } from './firebase-admin';

const ALGORITHM = 'aes-256-gcm';

export async function getDecryptedGeminiKey(userId: string): Promise<string | null> {
  try {
    const doc = await adminDb.collection('users').doc(userId).collection('geminiKey').doc('key').get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data || !data.encryptedKey || !data.iv || !data.authTag) {
      return null;
    }

    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret || secret.length !== 64) {
      throw new Error("ENCRYPTION_SECRET is not set or invalid (must be 32-byte hex)");
    }

    const keyBuffer = Buffer.from(secret, 'hex');
    const ivBuffer = Buffer.from(data.iv, 'hex');
    const authTagBuffer = Buffer.from(data.authTag, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    let decrypted = decipher.update(data.encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error decrypting Gemini API key:', error);
    return null;
  }
}
