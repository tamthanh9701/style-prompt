import { NextRequest, NextResponse } from 'next/server';
import type { AIProviderType } from '@/types';

// Increase timeout for long AI requests
export const maxDuration = 120; // seconds

// ============================================================
// AI Gateway API Route
// Supports: OpenAI, Anthropic, OpenRouter, LiteLLM, Google AI Studio, Vertex AI
// ============================================================

interface AIRequestBody {
  action: 'analyzeStyle' | 'compareImages' | 'suggestImprovements' | 'generateVariant' | 'variantFromImage' | 'analyzeForEdit' | 'generateEditPrompt' | 'refinePrompt';
  provider: AIProviderType;
  api_key: string;
  base_url: string;
  model: string;
  images: string[]; // base64 data URLs
  prompt_context?: string; // existing prompt JSON for comparison
  reference_images?: string[]; // reference style images for comparison
  // Vertex AI specific
  vertex_project?: string;
  vertex_location?: string;
  vertex_credentials?: string; // Service account JSON string
}

// Convert base64 data URL to the format needed by each provider
function extractBase64(dataUrl: string): { base64: string; mediaType: string } {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    return { base64: dataUrl, mediaType: 'image/jpeg' };
  }
  return { base64: match[2], mediaType: match[1] };
}

// ============================================================
// System prompts for each action
// ============================================================

const REFINE_PROMPT_SYSTEM = `You are a style prompt refinement expert. You will receive two groups of images. We combine them into one array, but you should treat the first ones as [GENERATED] (what the AI produced) and the later ones as [REFERENCE] (the ground truth style).

Compare them and identify style DRIFT — differences in lighting, color palette, composition, texture, mood, etc.

Return a JSON object:
{
  "drift_summary": "string — overall assessment",
  "confidence": "high | medium | low",
  "suggested_changes": [
    {
      "group": "lighting",
      "field": "main_light_type",
      "current_value": "natural daylight",
      "suggested_value": "warm golden hour",
      "reason": "Generated images show cooler tones than reference"
    }
  ]
}

You MUST respond with ONLY a valid JSON object matching this exact structure. DO NOT include any explanation or markdown, just the raw JSON.`;

const ANALYZE_STYLE_SYSTEM = `You are an expert image analysis AI. Your task is to analyze the visual style of the provided images and generate a comprehensive structured JSON prompt that captures every aspect of the style.

You MUST respond with ONLY a valid JSON object matching this exact structure. For any aspect not clearly present in the images, set the value to null. DO NOT include any explanation or markdown, just the raw JSON.

The JSON structure:
{
  "style_name": "string - a descriptive name for this style",
  "version": "1.0",
  "subject_type": "character | object | scene | architecture | food | vehicle | animal | nature | abstract | product | other",
  "subject": {
    "main_subject": "string|null",
    "quantity": "string|null",
    "subject_details": "string|null",
    "size_scale": "string|null",
    "orientation_placement": "string|null"
  },
  "subject_character": {
    "pose_action": "string|null",
    "expression_emotion": "string|null",
    "clothing_accessories": "string|null",
    "body_features": "string|null",
    "hair_style": "string|null",
    "age_appearance": "string|null",
    "ethnicity_skin_tone": "string|null"
  },
  "subject_object": {
    "object_state": "string|null",
    "object_condition": "string|null",
    "brand_label": "string|null",
    "arrangement_layout": "string|null",
    "interaction": "string|null"
  },
  "environment": {
    "setting": "string|null",
    "location_type": "string|null",
    "time_of_day": "string|null",
    "weather": "string|null",
    "season": "string|null",
    "era_time_period": "string|null",
    "background_elements": "string|null",
    "foreground_elements": "string|null",
    "ground_surface": "string|null",
    "sky_description": "string|null"
  },
  "composition": {
    "framing": "string|null",
    "camera_angle": "string|null",
    "perspective": "string|null",
    "depth_of_field": "string|null",
    "focal_point": "string|null",
    "composition_rule": "string|null",
    "symmetry": "string|null",
    "negative_space": "string|null",
    "crop_style": "string|null"
  },
  "lighting": {
    "primary_light_source": "string|null",
    "light_direction": "string|null",
    "light_quality": "string|null",
    "light_color_temperature": "string|null",
    "shadow_type": "string|null",
    "shadow_intensity": "string|null",
    "special_lighting_effects": "string|null",
    "ambient_light": "string|null",
    "light_count": "string|null"
  },
  "color_palette": {
    "dominant_colors": ["array of color names or hex codes"] or null,
    "color_scheme_type": "string|null",
    "saturation_level": "string|null",
    "contrast_level": "string|null",
    "color_mood": "string|null",
    "color_grading": "string|null",
    "tonal_range": "string|null"
  },
  "artistic_style": {
    "medium": "string|null",
    "art_movement": "string|null",
    "style_reference": "string|null",
    "surface_texture": "string|null",
    "rendering_style": "string|null",
    "level_of_abstraction": "string|null"
  },
  "mood_atmosphere": {
    "overall_mood": "string|null",
    "narrative_context": "string|null",
    "energy_level": "string|null",
    "atmosphere_effects": "string|null",
    "emotional_tone": "string|null"
  },
  "material_texture": {
    "primary_material": "string|null",
    "secondary_material": "string|null",
    "surface_finish": "string|null",
    "reflectivity": "string|null",
    "transparency": "string|null",
    "pattern_detail": "string|null",
    "wear_aging": "string|null"
  },
  "technical_quality": {
    "resolution_quality": "string|null",
    "detail_level": "string|null",
    "sharpness": "string|null",
    "noise_grain": "string|null",
    "render_engine": "string|null"
  },
  "camera_lens": {
    "lens_type": "string|null",
    "aperture": "string|null",
    "shutter_speed_effect": "string|null",
    "iso_effect": "string|null",
    "film_stock": "string|null",
    "filter_on_lens": "string|null"
  },
  "post_processing": {
    "vignette": "string|null",
    "bloom_glow": "string|null",
    "chromatic_aberration": "string|null",
    "lens_distortion": "string|null",
    "color_filter": "string|null",
    "grain_overlay": "string|null",
    "sharpening": "string|null"
  },
  "negative_prompt": {
    "avoid_elements": ["array of strings"],
    "avoid_styles": ["array of strings"],
    "avoid_artifacts": ["array of strings"],
    "avoid_quality": ["array of strings"]
  },
  "generation_params": {
    "aspect_ratio": "string|null",
    "seed": null,
    "steps": number|null,
    "cfg_scale": number|null,
    "sampler": "string|null",
    "model_recommendation": "string|null"
  }
}

Analyze the images carefully for: subject type and details, environment and setting, composition and framing, lighting setup, color palette, artistic style and medium, mood and atmosphere, material textures, technical quality indicators, camera/lens characteristics, and any post-processing effects visible.

For subject_character and subject_object: only fill in the one that applies based on subject_type. Set the other to null entirely if it doesn't apply.`;



// ============================================================
// Provider-specific API calls
// ============================================================

async function callOpenAI(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  images: string[]
): Promise<string> {
  const content: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
    { type: 'text', text: userMessage }
  ];

  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: { url: img, detail: 'high' }
    });
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content }
      ],
      max_tokens: 8000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  images: string[]
): Promise<string> {
  const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

  for (const img of images) {
    const { base64, mediaType } = extractBase64(img);
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64,
      }
    });
  }

  content.push({ type: 'text', text: userMessage });

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
      max_tokens: 8000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callOpenRouter(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  images: string[]
): Promise<string> {
  // OpenRouter uses OpenAI-compatible format
  return callOpenAI(apiKey, baseUrl, model, systemPrompt, userMessage, images);
}

async function callLiteLLM(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  images: string[]
): Promise<string> {
  // LiteLLM uses OpenAI-compatible format
  return callOpenAI(apiKey, baseUrl, model, systemPrompt, userMessage, images);
}

// ============================================================
// Google AI Studio (Gemini) provider
// ============================================================

async function callGemini(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  images: string[]
): Promise<string> {
  const base = baseUrl || 'https://generativelanguage.googleapis.com';
  const url = `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build parts: text first, then images
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [{ text: userMessage }];

  for (const img of images) {
    const { base64, mediaType } = extractBase64(img);
    parts.push({
      inlineData: {
        mimeType: mediaType,
        data: base64,
      },
    });
  }

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google AI Studio error: ${response.status} - ${error.substring(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response content from Gemini');
  return text;
}

// ============================================================
// Google Vertex AI provider + Service Account JWT Auth
// ============================================================

// Base64url encode for JWT
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

// Import PKCS8 PEM private key for RS256 signing
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

// Generate OAuth2 access token from service account credentials JSON
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

  // Exchange JWT for access token
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

// Resolve Vertex AI auth: credentials JSON → OAuth2 token, or use API key / manual Bearer token
async function resolveVertexAuth(
  apiKey: string,
  credentials?: string
): Promise<{ authHeader: Record<string, string> }> {
  // Priority 1: Service account credentials
  if (credentials && credentials.trim().startsWith('{')) {
    console.log('[VERTEX] Using service account credentials for auth');
    const accessToken = await getAccessTokenFromCredentials(credentials);
    return { authHeader: { 'Authorization': `Bearer ${accessToken}` } };
  }

  // Priority 2: API key (starts with AIza)
  if (apiKey.startsWith('AIza')) {
    console.log('[VERTEX] Using Google API key for auth');
    return { authHeader: { 'x-goog-api-key': apiKey } };
  }

  // Priority 3: Manual Bearer token
  console.log('[VERTEX] Using manual Bearer token for auth');
  return { authHeader: { 'Authorization': `Bearer ${apiKey}` } };
}

// Detect if a model needs global endpoint (preview/experimental models)
function isPreviewModel(model: string): boolean {
  const previewIndicators = ['preview', 'experimental', 'exp', 'latest', 'beta'];
  const lower = model.toLowerCase();
  return previewIndicators.some(ind => lower.includes(ind));
}

// Build Vertex AI URL from project + location, or use manual base_url
// Preview/experimental models → global endpoint + v1beta1
// Stable models → regional endpoint + v1
function buildVertexUrl(baseUrl: string, project?: string, location?: string, model?: string): string {
  if (baseUrl && baseUrl.includes('aiplatform.googleapis.com')) {
    // Manual base_url provided — use it directly
    return `${baseUrl.replace(/\/$/, '')}/publishers/google/models/${model}:generateContent`;
  }

  if (!project) throw new Error('Vertex AI: project_id is required (set in Settings → Vertex Project)');

  const preview = isPreviewModel(model || '');
  const apiVersion = preview ? 'v1beta1' : 'v1';
  const loc = preview ? 'global' : (location || 'us-central1');
  const host = preview
    ? 'aiplatform.googleapis.com'                    // global endpoint
    : `${location || 'us-central1'}-aiplatform.googleapis.com`; // regional endpoint

  const url = `https://${host}/${apiVersion}/projects/${project}/locations/${loc}/publishers/google/models/${model}:generateContent`;
  console.log(`[VERTEX] URL resolved: ${url} (preview=${preview}, apiVersion=${apiVersion}, location=${loc})`);
  return url;
}

async function callVertexAI(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  images: string[],
  options?: { vertex_project?: string; vertex_location?: string; vertex_credentials?: string }
): Promise<string> {
  const url = buildVertexUrl(baseUrl, options?.vertex_project, options?.vertex_location, model);
  const { authHeader } = await resolveVertexAuth(apiKey, options?.vertex_credentials);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [{ text: userMessage }];

  for (const img of images) {
    const { base64, mediaType } = extractBase64(img);
    parts.push({
      inlineData: {
        mimeType: mediaType,
        data: base64,
      },
    });
  }

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  };

  console.log(`[VERTEX] Calling ${url.substring(0, 80)}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI error: ${response.status} - ${error.substring(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response content from Vertex AI');
  return text;
}

// ============================================================
// Route handler
// ============================================================

export async function POST(request: NextRequest) {
  const reqId = Math.random().toString(36).slice(2, 8).toUpperCase();
  const start = Date.now();
  try {
    const body: AIRequestBody = await request.json();
    const { action, provider, api_key, base_url, model, images } = body;

    console.log(`\n📡 [AI:${reqId}] REQUEST`, {
      action,
      provider,
      model,
      imageCount: images?.length ?? 0,
      hasContext: !!body.prompt_context,
      keyPrefix: api_key ? api_key.slice(0, 8) + '...' : 'MISSING',
      baseUrl: base_url,
    });

    if (!api_key && !(provider === 'vertexai' && body.vertex_credentials)) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!images || images.length === 0) {
      // generateVariant, suggestImprovements may not require images
      if (action !== 'generateVariant' && action !== 'suggestImprovements' && action !== 'generateEditPrompt') {
        return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
      }
    }

    let systemPrompt: string;
    let userMessage: string;
    let allImages: string[] = images;

    switch (action) {
      case 'analyzeStyle':
        systemPrompt = ANALYZE_STYLE_SYSTEM;
        userMessage = `Analyze the style of these ${images.length} image(s) and generate a comprehensive structured JSON prompt. Pay close attention to every visual detail including subject, environment, lighting, colors, textures, artistic style, mood, and camera/lens characteristics.`;
        break;

      case 'refinePrompt':
        systemPrompt = REFINE_PROMPT_SYSTEM;
        userMessage = `Compare the following images. The first ${images.length} images are [GENERATED]. The next ${body.reference_images?.length || 0} images are [REFERENCE]. Identify any drift. Here is the current prompt context for reference: ${body.prompt_context}`;
        allImages = [...images, ...(body.reference_images || [])];
        break;

      default:
        return NextResponse.json({ error: 'Invalid or Deprecated action' }, { status: 400 });
    }

    let result: string;

    // Vertex AI needs special handling for credentials
    if (provider === 'vertexai') {
      result = await callVertexAI(api_key || '', base_url, model, systemPrompt, userMessage, allImages, {
        vertex_project: body.vertex_project,
        vertex_location: body.vertex_location,
        vertex_credentials: body.vertex_credentials,
      });
    } else {
      const callProvider: Record<string, typeof callOpenAI> = {
        openai: callOpenAI,
        anthropic: callAnthropic,
        openrouter: callOpenRouter,
        litellm: callLiteLLM,
        google: callGemini,
      };

      const providerFn = callProvider[provider];
      if (!providerFn) {
        return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
      }

      result = await providerFn(api_key, base_url, model, systemPrompt, userMessage, allImages);
    }
    console.log(`\n✅ [AI:${reqId}] SUCCESS — ${action} in ${Date.now() - start}ms (${result.length} chars)`);

    // Try to extract JSON from the response (in case AI wraps it in markdown)
    let jsonResult = result;
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonResult = jsonMatch[1].trim();
    }

    // Validate it's valid JSON
    try {
      const parsed = JSON.parse(jsonResult);
      return NextResponse.json({ result: parsed });
    } catch {
      // Return raw text if not valid JSON
      return NextResponse.json({ result: jsonResult, raw: true });
    }

  } catch (error) {
    console.error(`\n❌ [AI:${reqId}] ERROR after ${Date.now() - start}ms:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
