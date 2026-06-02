import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

const ALGORITHM = 'aes-256-gcm';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret || secret.length !== 64) {
      console.error("ENCRYPTION_SECRET is not set or invalid length");
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    const keyBuffer = Buffer.from(secret, 'hex');

    // Fetch users with reminders enabled
    const snapshot = await adminDb.collectionGroup('reminderSettings')
      .where('enabled', '==', true)
      .get();

    let sentCount = 0;
    let failedCount = 0;

    // Calculate "tomorrow" date components
    const now = new Date();
    // Use UTC for cron job context? Vercel runs cron in UTC. 
    // IST is UTC+5:30. At 7:00 AM UTC, it is 12:30 PM IST.
    // "tomorrow" in IST would be the next day.
    const targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
    const targetDay = targetDate.getDate();
    const targetMonth = targetDate.getMonth() + 1;
    const targetYear = targetDate.getFullYear();

    for (const doc of snapshot.docs) {
      const settings = doc.data();
      const userId = doc.ref.parent.parent?.id;

      if (!userId || !settings.phone || !settings.encryptedCallMeBotKey || !settings.iv || !settings.authTag) {
        continue;
      }

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
        console.error(`Failed to decrypt key for user ${userId}`, err);
        failedCount++;
        continue;
      }

      // Fetch tagged companies
      const taggedSnapshot = await adminDb.collection('users').doc(userId).collection('taggedCompanies').get();

      for (const taggedDoc of taggedSnapshot.docs) {
        const jobData = taggedDoc.data();
        if (!jobData.deadline) continue;

        // Parse deadline
        const parts = jobData.deadline.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (!parts) continue;

        let [, dayStr, monthStr, yearStr] = parts;
        if (yearStr.length === 2) yearStr = `20${yearStr}`;

        const day = parseInt(dayStr, 10);
        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);

        // Check if deadline is exactly tomorrow
        if (day === targetDay && month === targetMonth && year === targetYear) {
          const statusStr = jobData.status ? jobData.status.toUpperCase() : 'UNKNOWN';
          const message = `⏰ TNP Reminder: ${jobData.company || 'Unknown Company'} - ${jobData.role || 'Unknown Role'} deadline is TOMORROW. Status: ${statusStr}. Don't miss it!`;
          const encodedMessage = encodeURIComponent(message);

          try {
            const url = `https://api.callmebot.com/whatsapp.php?phone=${settings.phone}&text=${encodedMessage}&apikey=${decryptedKey}`;
            const res = await fetch(url);
            if (res.ok) {
              sentCount++;
            } else {
              console.error(`Failed to send message to user ${userId}, status: ${res.status}`);
              failedCount++;
            }
          } catch (error) {
            console.error(`Error sending message to user ${userId}`, error);
            failedCount++;
          }
        }
      }
    }

    return NextResponse.json({ sent: sentCount, failed: failedCount });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
