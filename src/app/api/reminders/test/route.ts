import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

const ALGORITHM = 'aes-256-gcm';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = await adminDb.collection('users').doc(token.sub).collection('reminderSettings').doc('settings').get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Reminder settings not found' }, { status: 404 });
    }

    const settings = doc.data();

    if (!settings || !settings.phone || !settings.encryptedCallMeBotKey || !settings.iv || !settings.authTag) {
      return NextResponse.json({ error: 'Incomplete WhatsApp settings' }, { status: 400 });
    }

    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret || secret.length !== 64) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    const keyBuffer = Buffer.from(secret, 'hex');

    // Decrypt key
    let decryptedKey = null;
    try {
      const ivBuffer = Buffer.from(settings.iv, 'hex');
      const authTagBuffer = Buffer.from(settings.authTag, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
      decipher.setAuthTag(authTagBuffer);
      decryptedKey = decipher.update(settings.encryptedCallMeBotKey, 'hex', 'utf8');
      decryptedKey += decipher.final('utf8');
    } catch (err) {
      console.error(`Failed to decrypt key for user ${token.sub}`, err);
      return NextResponse.json({ error: 'Failed to decrypt API Key' }, { status: 500 });
    }

    const message = "✅ TNP Reminders are working! You'll be reminded 1 day before each deadline.";
    const encodedMessage = encodeURIComponent(message);

    const url = `https://api.callmebot.com/whatsapp.php?phone=${settings.phone}&text=${encodedMessage}&apikey=${decryptedKey}`;
    const res = await fetch(url);
    
    if (res.ok) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: `CallMeBot returned status ${res.status}` }, { status: res.status });
    }

  } catch (error) {
    console.error('Error sending test message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
