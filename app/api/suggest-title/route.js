import { NextResponse } from 'next/server';

/**
 * Server-side route to suggest an item title using Gemini.
 * GEMINI_API_KEY is kept strictly on the server (never exposed to client).
 * If Gemini fails or key is not provided, returns a clear error message
 * allowing manual title entry and posting to proceed cleanly.
 */
export async function POST(request) {
  try {
    const { description } = await request.json();

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please enter a description first so Gemini can suggest a title.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API key is not configured on the server. You can enter a title manually.',
      });
    }

    // Call Gemini REST API from the server
    const prompt = `You are helping a student create a concise title for a classroom lost and found board item.
Based on the following description, return ONLY a short, clear title (between 3 to 7 words). Do not include quotes, markdown, or extra explanations.

Description: "${description.trim()}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 30,
          },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini API returned error:', response.status, errBody);
      return NextResponse.json({
        success: false,
        error: 'Gemini title suggestion is temporarily unavailable. You can type a title manually.',
      });
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText || !candidateText.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Could not generate a title from Gemini. You can type a title manually.',
      });
    }

    // Clean up title (remove wrapping quotes, newlines)
    const suggestedTitle = candidateText
      .trim()
      .replace(/^["'`*]+|["'`*]+$/g, '')
      .replace(/\r?\n/g, ' ')
      .trim();

    return NextResponse.json({
      success: true,
      suggestedTitle,
    });
  } catch (error) {
    console.error('Gemini call failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Gemini suggestion failed. You can type a title manually.',
    });
  }
}
