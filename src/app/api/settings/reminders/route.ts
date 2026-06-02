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

    const { phone, callMeBotKey, enabled } = await req.json();

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret || secret.length !== 64) {
      console.error("ENCRYPTION_SECRET is not set or invalid length");
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const keyBuffer = Buffer.from(secret, 'hex');
    const iv = crypto.randomBytes(12);
    
    // Encrypt the CallMeBot API Key
    let encryptedKey = null;
    let authTagString = null;
    let ivString = null;

    if (callMeBotKey && callMeBotKey.trim() !== '') {
      const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
      let enc = cipher.update(callMeBotKey, 'utf8', 'hex');
      enc += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      encryptedKey = enc;
      authTagString = authTag.toString('hex');
      ivString = iv.toString('hex');
    }

    const updateData: any = {
      phone,
      enabled: !!enabled,
      updatedAt: new Date().toISOString()
    };

    if (encryptedKey) {
      updateData.encryptedCallMeBotKey = encryptedKey;
      updateData.iv = ivString;
      updateData.authTag = authTagString;
    }

    await adminDb.collection('users').doc(token.sub).collection('reminderSettings').doc('settings').set(updateData, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving reminder settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = await adminDb.collection('users').doc(token.sub).collection('reminderSettings').doc('settings').get();
    
    if (!doc.exists) {
      return NextResponse.json({ phone: '', enabled: false, hasKey: false });
    }

    const data = doc.data();
    if (!data) {
      return NextResponse.json({ phone: '', enabled: false, hasKey: false });
    }

    return NextResponse.json({
      phone: data.phone || '',
      enabled: data.enabled || false,
      hasKey: !!(data.encryptedCallMeBotKey && data.iv && data.authTag)
    });
  } catch (error) {
    console.error('Error fetching reminder settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
