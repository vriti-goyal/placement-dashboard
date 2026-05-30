import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { body, subject, apiKey } = await req.json();
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is required' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Extract the following details from this placement email and return ONLY a valid JSON object matching this interface:
{
  "company": string | null,
  "role": string | null,
  "cgCutoff": string | null,
  "branches": string[] | null,
  "stipend": string | null,
  "backlogs": string | null,
  "deadline": string | null
}
If a field is not found, use null.
Email Subject: ${subject}
Email Body:
${body}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    let text = response.text || '';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('AI parsing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
