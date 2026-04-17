import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Vertex AI Gemini Image Generation API Route
// Model: gemini-3.1-flash-image-preview (and other Gemini image models)
// Uses: generateContent with responseModalities: ["TEXT", "IMAGE"]
// ============================================================

export const maxDuration = 180; // seconds — image gen can take longer

interface ImagenRequestBody {
  MANDATORY_STYLE: string;
  CONTENT: string;
  references?: string[];
  settings: {
    negative_prompt?: string;
    aspect_ratio?: string;
    sample_count?: number;
    seed?: number;
    model: string;
    vertex_project: string;
    vertex_location?: string;
    vertex_credentials: string;
  };
}

// ============================================================
// Auth helpers (reuse JWT logic from ai/route.ts)
// ============================================================

function base64url(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = data;
  }
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function getAccessTokenFromCredentials(credentialsJson: string): Promise<string> {
  const creds = JSON.parse(credentialsJson);
  const { client_email, private_key, token_uri } = creds;

  if (!client_email || !private_key) {
    throw new Error('Invalid credentials: missing client_email or private_key');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await importPrivateKey(private_key);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${base64url(signature)}`;

  const tokenResponse = await fetch(token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${tokenResponse.status} - ${err.substring(0, 200)}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// ============================================================
// Build Vertex AI URL for Gemini image models
// ============================================================

function buildImageGenUrl(project: string, location: string, model: string): string {
  // Preview/global models use global endpoint
  const isGlobal = location === 'global' || model.includes('preview') || model.includes('experimental');

  if (isGlobal) {
    return `https://aiplatform.googleapis.com/v1beta1/projects/${project}/locations/global/publishers/google/models/${model}:generateContent`;
  }

  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

// ============================================================
// Extract base64 from data URL
// ============================================================

function extractBase64(dataUrl: string): { base64: string; mediaType: string } {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return { base64: dataUrl, mediaType: 'image/jpeg' };
  return { base64: match[2], mediaType: match[1] };
}

// ============================================================
// Map aspect ratio string to Gemini image dimensions hint
// Gemini image models accept aspect_ratio as a text instruction
// ============================================================

function aspectRatioToPrompt(ratio: string): string {
  const map: Record<string, string> = {
    '1:1': 'square aspect ratio (1:1)',
    '4:3': 'landscape aspect ratio (4:3)',
    '3:4': 'portrait aspect ratio (3:4)',
    '16:9': 'widescreen aspect ratio (16:9)',
    '9:16': 'vertical/story aspect ratio (9:16)',
    '3:2': 'standard photo aspect ratio (3:2)',
    '2:3': 'portrait photo aspect ratio (2:3)',
    '21:9': 'cinematic ultra-wide aspect ratio (21:9)',
  };
  return map[ratio] || `${ratio} aspect ratio`;
}

// ============================================================
// Main image generation function
// ============================================================

async function generateImages(body: ImagenRequestBody): Promise<string[]> {
  const {
    MANDATORY_STYLE,
    CONTENT,
    references = [],
    settings,
  } = body;

  const {
    model,
    vertex_project,
    vertex_location = 'global',
    vertex_credentials,
    aspect_ratio = '1:1',
    negative_prompt,
    sample_count = 1,
  } = settings;

  // Get OAuth2 token from service account credentials
  const accessToken = await getAccessTokenFromCredentials(vertex_credentials);

  const url = buildImageGenUrl(vertex_project, vertex_location, model);
  console.log(`[IMAGEN] URL: ${url}`);

  const aspectHint = aspectRatioToPrompt(aspect_ratio);
  let fullPrompt = `[MANDATORY STYLE INSTRUCTIONS]\n${MANDATORY_STYLE}\n\n[CONTENT IDEA]\n${CONTENT}\n\nGenerate this image with ${aspectHint}.`;

  if (CONTENT.includes('game asset sheet')) {
    fullPrompt += `\n\n[SPATIAL LAYOUT RULES]\n- Arrange all items in a clean grid or evenly spaced layout.\n- Each item must be ISOLATED with clear white/transparent space between them.\n- Do NOT overlap, merge, or blend any items together.\n- Treat each item as an independent sprite that could be individually cropped.\n- Maintain consistent scale across all items.\n- Use a plain or minimal background to maximize asset usability.`;
  }

  if (negative_prompt) {
    fullPrompt += `\n\nAvoid: ${negative_prompt}`;
  }

  // Build multi-part request: text + optional reference images
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allResults: string[] = [];

  // Generate sample_count images (API may return 1 at a time for preview models)
  const numRequests = Math.min(sample_count, 4);

  for (let i = 0; i < numRequests; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [
      { text: fullPrompt },
    ];

    // Add reference style images
    // Sort original refs before generated refs (if they were tagged, UI handles it, here we just take the array)
    for (const refImg of references.slice(0, 4)) { // Max 4 ref images total
      const { base64, mediaType } = extractBase64(refImg);
      parts.push({
        inlineData: { mimeType: mediaType, data: base64 },
      });
    }

    // Include a runtime seed to force unique variations
    const uniqueSeed = Math.floor(Math.random() * 10000000000);
    const variationInstruction = i > 0
      ? `\n\nVariation ${i + 1} - create a unique but stylistically consistent composition.`
      : ``;

    parts[0].text = `${fullPrompt}${variationInstruction}\n\n[SYSTEM RUNTIME SEED: ${uniqueSeed} - Ensure this generation strictly unique]`;

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        temperature: 1.0,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Vertex AI image gen error (${response.status}): ${errText.substring(0, 400)}`);
    }

    const data = await response.json();
    console.log(`[IMAGEN] Response received, candidates: ${data?.candidates?.length || 0}`);

    // Extract image parts from response
    const candidate = data?.candidates?.[0];
    if (!candidate?.content?.parts) {
      console.warn('[IMAGEN] No content parts in response');
      continue;
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data && part.inlineData?.mimeType) {
        const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        allResults.push(dataUrl);
      }
    }
  }

  if (allResults.length === 0) {
    throw new Error('No images were generated. The model may have filtered the request or the response format was unexpected.');
  }

  return allResults;
}

// ============================================================
// Route handler
// ============================================================

export async function POST(request: NextRequest) {
  const reqId = Math.random().toString(36).slice(2, 8).toUpperCase();
  const start = Date.now();

  try {
    const body: ImagenRequestBody = await request.json();
    const { MANDATORY_STYLE, CONTENT, settings, references } = body;
    const { model, vertex_project, vertex_credentials, sample_count, aspect_ratio } = settings || {};

    console.log(`\n🖼️ [IMAGEN:${reqId}] REQUEST`, {
      model,
      project: vertex_project,
      sampleCount: sample_count,
      aspectRatio: aspect_ratio,
      styleLength: MANDATORY_STYLE?.length || 0,
      contentLength: CONTENT?.length || 0,
      referenceImages: references?.length || 0,
    });

    // Validate required fields
    if (!MANDATORY_STYLE || !CONTENT) {
      return NextResponse.json({ error: 'MANDATORY_STYLE and CONTENT are required' }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }
    if (!vertex_project) {
      return NextResponse.json({ error: 'Vertex project ID is required' }, { status: 400 });
    }
    if (!vertex_credentials) {
      return NextResponse.json({ error: 'Vertex AI credentials (service account JSON) are required' }, { status: 400 });
    }

    const images = await generateImages(body);

    console.log(`\n✅ [IMAGEN:${reqId}] SUCCESS — generated ${images.length} images in ${Date.now() - start}ms`);

    return NextResponse.json({ images, count: images.length });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n❌ [IMAGEN:${reqId}] ERROR after ${Date.now() - start}ms:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
