import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Test API Key Endpoint
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { provider, api_key, base_url, model } = await request.json();

    if (!api_key) {
      return NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 });
    }

    let success = false;
    let message = '';

    if (provider === 'anthropic') {
      // Anthropic uses different auth header
      const response = await fetch(`${base_url}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': api_key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: 'Hi, reply with just "OK"' }],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        success = true;
        message = `Connected to Anthropic — model: ${model}`;
      } else {
        const err = await response.text();
        throw new Error(`${response.status}: ${err.substring(0, 200)}`);
      }
    } else if (provider === 'google') {
      // Google AI Studio (Gemini)
      const base = base_url || 'https://generativelanguage.googleapis.com';
      const testModel = model || 'gemini-2.0-flash';
      const response = await fetch(
        `${base}/v1beta/models/${testModel}:generateContent?key=${api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Hi, reply with just "OK"' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        }
      );
      if (response.ok) {
        success = true;
        message = `Connected to Google AI Studio — model: ${testModel}`;
      } else {
        const err = await response.text();
        throw new Error(`${response.status}: ${err.substring(0, 200)}`);
      }
    } else {
      // OpenAI-compatible (OpenAI, OpenRouter, LiteLLM)
      const response = await fetch(`${base_url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi, reply with just "OK"' }],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        success = true;
        message = `Connected to ${provider} — model: ${model}`;
      } else {
        const err = await response.text();
        throw new Error(`${response.status}: ${err.substring(0, 200)}`);
      }
    }

    return NextResponse.json({ success, message });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 200 });
  }
}
