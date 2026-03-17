import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Test API Key Endpoint
// ============================================================

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const body = await request.json();
    const { provider, api_key, base_url, model, vertex_project, vertex_location, vertex_credentials } = body;

    console.log(`\n🔑 [TEST-KEY] Request`, {
      provider,
      model,
      baseUrl: base_url,
      keyPrefix: api_key ? api_key.slice(0, 8) + '...' : 'NONE',
      hasCredentials: !!vertex_credentials,
    });

    if (!api_key && !(provider === 'vertexai' && vertex_credentials)) {
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
    } else if (provider === 'vertexai') {
      // Google Vertex AI — supports: Service Account Credentials, Google API Key (AIza*), OAuth2 Bearer token

      const testModel = model || 'gemini-2.0-flash';
      const loc = vertex_location || 'us-central1';

      // Build URL
      let testUrl: string;
      if (base_url && base_url.includes('aiplatform.googleapis.com')) {
        testUrl = `${base_url.replace(/\/$/, '')}/publishers/google/models/${testModel}:generateContent`;
      } else if (vertex_project) {
        testUrl = `https://${loc}-aiplatform.googleapis.com/v1/projects/${vertex_project}/locations/${loc}/publishers/google/models/${testModel}:generateContent`;
      } else {
        throw new Error('Vertex AI: Please provide either a Vertex Project ID or a full Base URL');
      }

      // Resolve auth
      let authHeaders: Record<string, string> = {};
      let authType = 'unknown';

      if (vertex_credentials && vertex_credentials.trim().startsWith('{')) {
        // Service account credentials → JWT → OAuth2 token
        authType = 'Service Account';
        const creds = JSON.parse(vertex_credentials);
        const { client_email, private_key, token_uri } = creds;
        if (!client_email || !private_key) throw new Error('Invalid credentials: missing client_email or private_key');

        // JWT signing using Web Crypto
        const b64url = (d: ArrayBuffer | Uint8Array | string): string => {
          let bytes: Uint8Array;
          if (typeof d === 'string') bytes = new TextEncoder().encode(d);
          else if (d instanceof ArrayBuffer) bytes = new Uint8Array(d);
          else bytes = d;
          let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
          return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };

        const pemBody = private_key.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, '');
        const binaryDer = Uint8Array.from(atob(pemBody), (c: string) => c.charCodeAt(0));
        const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryDer.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);

        const now = Math.floor(Date.now() / 1000);
        const hdrB64 = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
        const payB64 = b64url(JSON.stringify({ iss: client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
        const sigInput = `${hdrB64}.${payB64}`;
        const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(sigInput));
        const jwt = `${sigInput}.${b64url(sig)}`;

        const tokenResp = await fetch(token_uri || 'https://oauth2.googleapis.com/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });
        if (!tokenResp.ok) {
          const tokenErr = await tokenResp.text();
          throw new Error(`Token exchange failed: ${tokenResp.status} - ${tokenErr.substring(0, 200)}`);
        }
        const tokenData = await tokenResp.json();
        authHeaders = { 'Authorization': `Bearer ${tokenData.access_token}` };
        console.log(`[TEST-KEY] Vertex AI: using service account credentials (${client_email})`);
      } else if (api_key && api_key.startsWith('AIza')) {
        authType = 'API Key';
        authHeaders = { 'x-goog-api-key': api_key };
      } else if (api_key) {
        authType = 'Bearer Token';
        authHeaders = { 'Authorization': `Bearer ${api_key}` };
      } else {
        throw new Error('Vertex AI: Please provide either Credentials, API Key, or Bearer Token');
      }

      const response = await fetch(testUrl, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hi, reply with just "OK"' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      if (response.ok) {
        success = true;
        message = `Connected to Vertex AI (${authType}) — project: ${vertex_project || 'custom URL'}, model: ${testModel}`;
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

    console.log(`\n✅ [TEST-KEY] ${success ? 'SUCCESS' : 'FAILED'} — ${provider} in ${Date.now() - start}ms: ${message}`);
    return NextResponse.json({ success, message });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ [TEST-KEY] ERROR after ${Date.now() - start}ms:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 200 });
  }
}
