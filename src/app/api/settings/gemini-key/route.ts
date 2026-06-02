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

    const { key } = await req.json();

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Invalid key provided' }, { status: 400 });
    }

    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret || secret.length !== 64) {
      console.error("ENCRYPTION_SECRET is not set or invalid length");
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const keyBuffer = Buffer.from(secret, 'hex');
    const iv = crypto.randomBytes(12);
    
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    
    let encryptedKey = cipher.update(key, 'utf8', 'hex');
    encryptedKey += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    await adminDb.collection('users').doc(token.sub).collection('geminiKey').doc('key').set({
      encryptedKey,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving Gemini API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = await adminDb.collection('users').doc(token.sub).collection('geminiKey').doc('key').get();
    
    if (!doc.exists) {
      return NextResponse.json({ maskedKey: null });
    }

    const data = doc.data();
    if (!data || !data.encryptedKey || !data.iv || !data.authTag) {
      return NextResponse.json({ maskedKey: null });
    }

    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret || secret.length !== 64) {
      console.error("ENCRYPTION_SECRET is not set or invalid length");
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const keyBuffer = Buffer.from(secret, 'hex');
    const ivBuffer = Buffer.from(data.iv, 'hex');
    const authTagBuffer = Buffer.from(data.authTag, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    let decrypted = decipher.update(data.encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const maskedKey = decrypted.length > 4 
      ? `sk-...${decrypted.slice(-4)}` 
      : 'sk-...xxxx';

    return NextResponse.json({ maskedKey });
  } catch (error) {
    console.error('Error fetching Gemini API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await adminDb.collection('users').doc(token.sub).collection('geminiKey').doc('key').delete();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Gemini API key:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
