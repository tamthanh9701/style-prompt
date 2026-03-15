import { NextRequest, NextResponse } from 'next/server';
import type { AIProviderType } from '@/types';

// ============================================================
// AI Gateway API Route
// Supports: OpenAI, Anthropic, OpenRouter, LiteLLM
// ============================================================

interface AIRequestBody {
  action: 'analyzeStyle' | 'compareImages' | 'suggestImprovements';
  provider: AIProviderType;
  api_key: string;
  base_url: string;
  model: string;
  images: string[]; // base64 data URLs
  prompt_context?: string; // existing prompt JSON for comparison
  reference_images?: string[]; // reference style images for comparison
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

const COMPARE_IMAGES_SYSTEM = `You are an expert image analysis AI. You will be given:
1. Reference style images (the target style)
2. Generated images (created from a prompt)
3. The prompt that was used to generate the images

Your task is to compare the generated images against the reference style images and identify differences. You MUST respond with ONLY a valid JSON object:

{
  "differences": [
    {
      "category": "string - the prompt group (e.g., lighting, color_palette, composition)",
      "field": "string - the specific field in that group",
      "current_value": "string|null - what the current prompt produces",
      "suggested_value": "string - what it should be changed to",
      "severity": "minor | moderate | major",
      "description": "string - explanation of the difference"
    }
  ],
  "similarity_score": number (0-100),
  "summary": "string - overall analysis summary"
}

Be thorough but practical. Focus on the most impactful differences that would bring the generated images closer to the reference style.`;

const SUGGEST_IMPROVEMENTS_SYSTEM = `You are an expert image prompt engineer. Based on the comparison analysis provided, generate an improved version of the prompt JSON. You MUST respond with ONLY the complete valid JSON prompt object with the suggested improvements applied. Use the same structure as the original prompt but with improved values.`;

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
// Route handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body: AIRequestBody = await request.json();
    const { action, provider, api_key, base_url, model, images } = body;

    if (!api_key) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }

    let systemPrompt: string;
    let userMessage: string;
    let allImages: string[] = images;

    switch (action) {
      case 'analyzeStyle':
        systemPrompt = ANALYZE_STYLE_SYSTEM;
        userMessage = `Analyze the style of these ${images.length} image(s) and generate a comprehensive structured JSON prompt. Pay close attention to every visual detail including subject, environment, lighting, colors, textures, artistic style, mood, and camera/lens characteristics.`;
        break;

      case 'compareImages':
        systemPrompt = COMPARE_IMAGES_SYSTEM;
        if (!body.reference_images || !body.prompt_context) {
          return NextResponse.json({ error: 'Reference images and prompt context are required for comparison' }, { status: 400 });
        }
        allImages = [...body.reference_images, ...images];
        userMessage = `REFERENCE STYLE IMAGES: The first ${body.reference_images.length} image(s) are the reference style.
GENERATED IMAGES: The remaining ${images.length} image(s) were generated using a prompt.

THE PROMPT USED:
${body.prompt_context}

Compare the generated images against the reference style images and identify all differences.`;
        break;

      case 'suggestImprovements':
        systemPrompt = SUGGEST_IMPROVEMENTS_SYSTEM;
        if (!body.prompt_context) {
          return NextResponse.json({ error: 'Prompt context is required for improvements' }, { status: 400 });
        }
        userMessage = `Based on the following comparison analysis and the original prompt, generate an improved version of the full prompt JSON.

COMPARISON ANALYSIS AND CURRENT PROMPT:
${body.prompt_context}

Look at the provided images as reference and generate the improved prompt JSON.`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    let result: string;

    const callProvider = {
      openai: callOpenAI,
      anthropic: callAnthropic,
      openrouter: callOpenRouter,
      litellm: callLiteLLM,
    };

    const providerFn = callProvider[provider];
    if (!providerFn) {
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    result = await providerFn(api_key, base_url, model, systemPrompt, userMessage, allImages);

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
    console.error('AI Gateway error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
