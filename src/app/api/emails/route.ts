import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { getToken } from 'next-auth/jwt';

// In-memory cache: userId -> { data, timestamp }
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const decodeBase64Url = (data: string) => {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
};

export async function GET(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!session || !token || !token.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (token.error === "RefreshAccessTokenError") {
      return NextResponse.json({ error: 'Token expired and refresh failed' }, { status: 401 });
    }

    const senderEmail = process.env.TNP_SENDER_EMAIL || '';
    if (!senderEmail) {
      return NextResponse.json({ error: 'TNP_SENDER_EMAIL not configured' }, { status: 500 });
    }

    const userEmail = session.user?.email || 'default';
    const cacheKey = `emails_${userEmail}`;

    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Check cache
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
        return NextResponse.json(cached.data);
      }
    }

    // Fetch thread list
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=from:${senderEmail}&maxResults=50`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token.accessToken}` }
    });

    if (!listRes.ok) {
      if (listRes.status === 401) {
         return NextResponse.json({ error: 'Unauthorized (Token expired)' }, { status: 401 });
      }
      if (listRes.status === 429) {
         return NextResponse.json({ error: 'Gmail API rate limit exceeded. Please try again in a minute.' }, { status: 429 });
      }
      throw new Error(`Failed to fetch thread list: ${listRes.statusText}`);
    }

    const listData = await listRes.json();
    if (!listData.threads || listData.threads.length === 0) {
      const result = { emails: [] };
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    // Fetch full threads
    const emails = await Promise.all(
      listData.threads.map(async (thread: any) => {
        const threadRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.id}?format=full`, {
          headers: { Authorization: `Bearer ${token.accessToken}` }
        });
        if (!threadRes.ok) return null;
        const threadData = await threadRes.json();
        
        if (!threadData.messages || threadData.messages.length === 0) return null;

        const parsedMessages = threadData.messages.map((msgData: any) => {
          // Parse headers
          const headers = msgData.payload?.headers || [];
          const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
          const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');
          
          let body = '';
          let htmlBody = '';

          const extractBody = (part: any): {text: string, html: string} => {
            if (!part) return {text: '', html: ''};
            let text = '';
            let html = '';

            const traverse = (p: any) => {
              if (p.mimeType === 'text/plain' && p.body?.data) {
                text = decodeBase64Url(p.body.data);
              } else if (p.mimeType === 'text/html' && p.body?.data) {
                html = decodeBase64Url(p.body.data);
              }
              if (p.parts) {
                p.parts.forEach(traverse);
              }
            };

            traverse(part);
            return {text, html};
          };

          if (msgData.payload?.body?.data) {
              // single part email
              const data = decodeBase64Url(msgData.payload.body.data);
              if (msgData.payload.mimeType === 'text/html') {
                 htmlBody = data;
                 body = data.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ').trim();
              } else {
                 body = data;
              }
          } else {
             const extracted = extractBody(msgData.payload);
             htmlBody = extracted.html;
             body = extracted.text;
             if (!body && extracted.html) {
               body = extracted.html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ').trim();
             }
          }

          return {
            messageId: msgData.id,
            subject: subjectHeader ? subjectHeader.value : 'No Subject',
            date: dateHeader ? dateHeader.value : '',
            snippet: msgData.snippet || '',
            body: body,
            htmlBody: htmlBody || null
          };
        });

        return {
          id: threadData.id,
          subject: parsedMessages[0].subject,
          date: parsedMessages[0].date,
          messages: parsedMessages
        };
      })
    );

    const validEmails = emails.filter(Boolean);
    const result = { emails: validEmails };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error fetching emails:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
