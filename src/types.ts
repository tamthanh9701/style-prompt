// ============================================================
// Type Definitions for Style Prompt Library
// ============================================================

export type SubjectType =
  | 'character'
  | 'object'
  | 'scene'
  | 'architecture'
  | 'food'
  | 'vehicle'
  | 'animal'
  | 'nature'
  | 'abstract'
  | 'product'
  | 'other';

export interface SubjectGroup {
  main_subject: string | null;
  quantity: string | null;
  subject_details: string | null;
  size_scale: string | null;
  orientation_placement: string | null;
}

export interface SubjectCharacterGroup {
  pose_action: string | null;
  expression_emotion: string | null;
  clothing_accessories: string | null;
  body_features: string | null;
  hair_style: string | null;
  age_appearance: string | null;
  ethnicity_skin_tone: string | null;
}

export interface SubjectObjectGroup {
  object_state: string | null;
  object_condition: string | null;
  brand_label: string | null;
  arrangement_layout: string | null;
  interaction: string | null;
}

export interface EnvironmentGroup {
  setting: string | null;
  location_type: string | null;
  time_of_day: string | null;
  weather: string | null;
  season: string | null;
  era_time_period: string | null;
  background_elements: string | null;
  foreground_elements: string | null;
  ground_surface: string | null;
  sky_description: string | null;
}

export interface CompositionGroup {
  framing: string | null;
  camera_angle: string | null;
  perspective: string | null;
  depth_of_field: string | null;
  focal_point: string | null;
  composition_rule: string | null;
  symmetry: string | null;
  negative_space: string | null;
  crop_style: string | null;
}

export interface LightingGroup {
  primary_light_source: string | null;
  light_direction: string | null;
  light_quality: string | null;
  light_color_temperature: string | null;
  shadow_type: string | null;
  shadow_intensity: string | null;
  special_lighting_effects: string | null;
  ambient_light: string | null;
  light_count: string | null;
}

export interface ColorPaletteGroup {
  dominant_colors: string[] | null;
  color_scheme_type: string | null;
  saturation_level: string | null;
  contrast_level: string | null;
  color_mood: string | null;
  color_grading: string | null;
  tonal_range: string | null;
}

export interface ArtisticStyleGroup {
  medium: string | null;
  art_movement: string | null;
  style_reference: string | null;
  surface_texture: string | null;
  rendering_style: string | null;
  level_of_abstraction: string | null;
}

export interface MoodAtmosphereGroup {
  overall_mood: string | null;
  narrative_context: string | null;
  energy_level: string | null;
  atmosphere_effects: string | null;
  emotional_tone: string | null;
}

export interface MaterialTextureGroup {
  primary_material: string | null;
  secondary_material: string | null;
  surface_finish: string | null;
  reflectivity: string | null;
  transparency: string | null;
  pattern_detail: string | null;
  wear_aging: string | null;
}

export interface TechnicalQualityGroup {
  resolution_quality: string | null;
  detail_level: string | null;
  sharpness: string | null;
  noise_grain: string | null;
  render_engine: string | null;
}

export interface CameraLensGroup {
  lens_type: string | null;
  aperture: string | null;
  shutter_speed_effect: string | null;
  iso_effect: string | null;
  film_stock: string | null;
  filter_on_lens: string | null;
}

export interface PostProcessingGroup {
  vignette: string | null;
  bloom_glow: string | null;
  chromatic_aberration: string | null;
  lens_distortion: string | null;
  color_filter: string | null;
  grain_overlay: string | null;
  sharpening: string | null;
}

export interface NegativePromptGroup {
  avoid_elements: string[];
  avoid_styles: string[];
  avoid_artifacts: string[];
  avoid_quality: string[];
}

export interface GenerationParamsGroup {
  aspect_ratio: string | null;
  seed: number | null;
  steps: number | null;
  cfg_scale: number | null;
  sampler: string | null;
  model_recommendation: string | null;
}

// ============================================================
// Main Prompt Schema
// ============================================================

export interface PromptSchema {
  schema_version?: number; // v2
  style_name: string;
  version: string;
  subject_type: SubjectType;

  subject: SubjectGroup;
  subject_character: SubjectCharacterGroup | null;
  subject_object: SubjectObjectGroup | null;
  environment: EnvironmentGroup;
  composition: CompositionGroup;
  lighting: LightingGroup;
  color_palette: ColorPaletteGroup;
  artistic_style: ArtisticStyleGroup;
  mood_atmosphere: MoodAtmosphereGroup;
  material_texture: MaterialTextureGroup;
  technical_quality: TechnicalQualityGroup;
  camera_lens: CameraLensGroup;
  post_processing: PostProcessingGroup;
  negative_prompt: NegativePromptGroup;
  generation_params: GenerationParamsGroup;
}

// ============================================================
// Style Library
// ============================================================
export type StyleType = 'photo' | 'illustration' | 'cinematic' | 'anime' | 'product' | 'mixed';

// Status lifecycle: draft → active → deprecated
export type StyleStatus = 'draft' | 'active' | 'deprecated';

// Maximum number of reference images per style
export const MAX_REFERENCE_IMAGES = 10;

export interface RefImageRecord {
  id: string;
  libraryId: string;
  data: Blob | string;
  mimeType: string;
  index: number;
  source: 'original' | 'generated'; // MỤC ĐÍCH: Tracking phạt trọng số chống Drift
  sourceJobId?: string; // DEBUG/RESTORE: Nhớ ID của Lần Gen đã đẻ ra Ref này
  addedAt: string;
}

export interface GenImageRecord {
  id: string;
  libraryId: string;
  jobId?: string;
  data: Blob | string;
  mimeType?: string;
  createdAt: string;
  generationSource?: string;
  aspectRatio?: string;
  promptText?: string;
  promptJson?: string;
}

export interface GenerationJob {
  id: string;
  libraryId: string;
  versionId: string;       // RESTORE: Khóa Version dùng lúc Gen
  userPrompt: string;
  mergedPrompt: string;    // DEBUG: Payload Text gửi đi thực tế
  modelConfig: { model: string; aspectRatio: string; outputCount: number; seed?: number };
  outputImageIds: string[];
  status: 'queued' | 'running' | 'done' | 'error';
  durationMs: number;      // KPI API Health
  errorDetail?: string;    // DEBUG Lỗi
  userRating?: number;
  createdAt: string;
}

export interface LibraryVersion {
  id: string; libraryId: string; versionNumber: number; versionName: string;
  parentVersionId?: string;// RESTORE LOGIC.
  prompt: PromptSchema;    // CẤU TRÚC 15 NHÓM V1 (Schema_version: 2).
  referenceImageIds: string[];
  createdAt: string;
}

export interface StyleLibrary {
  id: string;
  name: string;
  description: string;
  styleType: StyleType;
  tags: string[];
  coverImageId: string | null;
  created_at: string;
  updated_at: string;
  // Lifecycle & versioning
  status: StyleStatus;
  version: number; // auto-increment: 1, 2, 3...
  activeVersionId: string;

  // -- CÁC TRƯỜNG GIỮ TỪ V1 (Vì PromptSchema vẫn là Core) --
  ref_image_count: number;
  prompt: PromptSchema;         // Schema hiện tại đang edit

  // DEPRECATED (Will be removed after migration):
  reference_images: string[];
  prompt_history: PromptSchema[];
  generated_image_ids: string[];
  generated_images: GeneratedImage[];
  cached_variant_fields?: VariantFieldCache;
  prompt_instances: PromptInstance[];
  eval_records: EvalRecord[];
}

export interface VariantField {
  group: string;
  field: string;
  label_vi: string;
  label_en: string;
  hint_vi: string;
  hint_en: string;
  placeholder_vi: string;
  placeholder_en: string;
  importance: 'required' | 'recommended' | 'optional';
  input_type: 'text' | 'textarea' | 'tags';
}

export interface VariantFieldCache {
  style_summary: string;
  fields: VariantField[];
  detected_at: string; // ISO timestamp
}

export interface GeneratedImage {
  id: string;
  // NOTE: actual image data is in IndexedDB: getGenImageById(id)
  prompt_json: string;   // JSON string of PromptSchema used
  prompt_text: string;
  created_at: string;
  prompt_instance_id?: string; // link to PromptInstance
  generation_source: 'imagen' | 'external' | 'unknown';
  aspect_ratio: string;
  variant_params?: Record<string, string>;
  parent_image_id?: string;
}

// ============================================================
// Framework Entities: PromptInstance, EvalRecord
// ============================================================

export type PromptTask = 'create_style' | 'generate_new' | 'refine_prompt' | 'style_transfer' | 'edit_image';

export interface PromptInstance {
  id: string;
  style_id: string;
  style_version: number;
  task: PromptTask;
  subject_snapshot: Record<string, unknown>; // SubjectProfile at time of generation
  final_prompt: string; // JSON or text
  model_used: string;
  created_at: string;
}

export interface EvalRecord {
  id: string;
  prompt_instance_id: string;
  style_id: string;
  style_fidelity_score: number; // 1-5
  content_match_score: number; // 1-5
  notes: string;
  created_at: string;
}

// ============================================================
// AI Provider Configuration
// ============================================================

export type AIProviderType = 'openai' | 'anthropic' | 'openrouter' | 'litellm' | 'google' | 'vertexai';

export interface AIProviderConfig {
  type: AIProviderType;
  api_key: string;
  base_url: string;
  model: string;
  enabled: boolean;
  // Vertex AI specific
  vertex_project?: string;
  vertex_location?: string;
  vertex_credentials?: string; // Service account JSON string
}

export const DEFAULT_PROVIDERS: Record<AIProviderType, Omit<AIProviderConfig, 'api_key' | 'enabled'>> = {
  openai: {
    type: 'openai',
    base_url: 'https://api.openai.com/v1',
    model: 'gpt-4o',
  },
  anthropic: {
    type: 'anthropic',
    base_url: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-20250514',
  },
  openrouter: {
    type: 'openrouter',
    base_url: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o',
  },
  litellm: {
    type: 'litellm',
    base_url: 'http://localhost:4000',
    model: 'gpt-4o',
  },
  google: {
    type: 'google',
    base_url: 'https://generativelanguage.googleapis.com',
    model: 'gemini-2.0-flash',
  },
  vertexai: {
    type: 'vertexai',
    base_url: '',
    model: 'gemini-2.0-flash',
  },
};

// ============================================================
// AI Response Types
// ============================================================

export interface ComparisonResult {
  differences: DifferenceItem[];
  similarity_score: number; // 0-100
  suggested_prompt: PromptSchema;
  summary: string;
}

export interface DifferenceItem {
  category: string;
  field: string;
  current_value: string | null;
  suggested_value: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
}

// ============================================================
// Image Generation Configuration
// ============================================================

export type ImageGenProvider = 'vertex_gemini';
// Model IDs for image generation on Vertex AI
export const IMAGE_GEN_MODELS = [
  { id: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image (Preview)' },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image (Preview)' },
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (GA)' },
] as const;

export interface ImageGenConfig {
  enabled: boolean;
  provider: ImageGenProvider;        // currently only 'vertex_gemini'
  model: string;                     // e.g. 'gemini-3.1-flash-image-preview'
  vertex_project: string;            // GCP project ID
  vertex_location: string;           // e.g. 'us-central1' or 'global'
  vertex_credentials: string;        // Service account JSON string
  default_aspect_ratio: string;      // e.g. '1:1'
  default_sample_count: number;      // 1-4
}

export interface ImageGenRequest {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio: string;
  reference_images?: string[];        // base64 data URLs for style reference
  sample_count?: number;
  seed?: number;
}

export interface ImageGenResponse {
  images: string[];                  // base64 data URLs returned by model
  model_used: string;
  prompt_used: string;
  aspect_ratio: string;
}

// ============================================================
// App Settings
// ============================================================

export interface AppSettings {
  active_provider: AIProviderType;
  providers: Record<AIProviderType, AIProviderConfig>;
  image_gen: ImageGenConfig;
}

// ============================================================
// Field Metadata (for UI rendering)
// ============================================================

export interface FieldMeta {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'textarea' | 'color' | 'number' | 'select' | 'tags' | 'toggle';
  options?: string[];
  placeholder?: string;
}

export type GroupMeta = {
  key: string;
  label: string;
  icon: string;
  description: string;
  fields: FieldMeta[];
  condition?: (schema: PromptSchema) => boolean;
};

// ============================================================
// Utility: Create empty prompt
// ============================================================

export function createEmptyPrompt(name: string = 'Untitled Style', type: SubjectType = 'character'): PromptSchema {
  return {
    style_name: name,
    version: '1.0',
    subject_type: type,
    subject: {
      main_subject: null,
      quantity: null,
      subject_details: null,
      size_scale: null,
      orientation_placement: null,
    },
    subject_character: {
      pose_action: null,
      expression_emotion: null,
      clothing_accessories: null,
      body_features: null,
      hair_style: null,
      age_appearance: null,
      ethnicity_skin_tone: null,
    },
    subject_object: {
      object_state: null,
      object_condition: null,
      brand_label: null,
      arrangement_layout: null,
      interaction: null,
    },
    environment: {
      setting: null,
      location_type: null,
      time_of_day: null,
      weather: null,
      season: null,
      era_time_period: null,
      background_elements: null,
      foreground_elements: null,
      ground_surface: null,
      sky_description: null,
    },
    composition: {
      framing: null,
      camera_angle: null,
      perspective: null,
      depth_of_field: null,
      focal_point: null,
      composition_rule: null,
      symmetry: null,
      negative_space: null,
      crop_style: null,
    },
    lighting: {
      primary_light_source: null,
      light_direction: null,
      light_quality: null,
      light_color_temperature: null,
      shadow_type: null,
      shadow_intensity: null,
      special_lighting_effects: null,
      ambient_light: null,
      light_count: null,
    },
    color_palette: {
      dominant_colors: null,
      color_scheme_type: null,
      saturation_level: null,
      contrast_level: null,
      color_mood: null,
      color_grading: null,
      tonal_range: null,
    },
    artistic_style: {
      medium: null,
      art_movement: null,
      style_reference: null,
      surface_texture: null,
      rendering_style: null,
      level_of_abstraction: null,
    },
    mood_atmosphere: {
      overall_mood: null,
      narrative_context: null,
      energy_level: null,
      atmosphere_effects: null,
      emotional_tone: null,
    },
    material_texture: {
      primary_material: null,
      secondary_material: null,
      surface_finish: null,
      reflectivity: null,
      transparency: null,
      pattern_detail: null,
      wear_aging: null,
    },
    technical_quality: {
      resolution_quality: null,
      detail_level: null,
      sharpness: null,
      noise_grain: null,
      render_engine: null,
    },
    camera_lens: {
      lens_type: null,
      aperture: null,
      shutter_speed_effect: null,
      iso_effect: null,
      film_stock: null,
      filter_on_lens: null,
    },
    post_processing: {
      vignette: null,
      bloom_glow: null,
      chromatic_aberration: null,
      lens_distortion: null,
      color_filter: null,
      grain_overlay: null,
      sharpening: null,
    },
    negative_prompt: {
      avoid_elements: [],
      avoid_styles: [],
      avoid_artifacts: [],
      avoid_quality: [],
    },
    generation_params: {
      aspect_ratio: null,
      seed: null,
      steps: null,
      cfg_scale: null,
      sampler: null,
      model_recommendation: null,
    },
  };
}

// ============================================================
// Style vs Subject Classification
// ============================================================
// STYLE groups: Fixed parameters that define the visual style
// SUBJECT groups: Variable parameters that define image content

export const STYLE_GROUPS: (keyof PromptSchema)[] = [
  'artistic_style',
  'color_palette',
  'lighting',
  'mood_atmosphere',
  'material_texture',
  'technical_quality',
  'camera_lens',
  'post_processing',
  'negative_prompt',
  'generation_params',
];

export const SUBJECT_GROUPS: (keyof PromptSchema)[] = [
  'subject',
  'subject_character',
  'subject_object',
  'environment',
  'composition',
];

// Helper to check if a group belongs to Style or Subject
export function getGroupCategory(groupKey: keyof PromptSchema): 'style' | 'subject' | 'meta' {
  if (STYLE_GROUPS.includes(groupKey)) return 'style';
  if (SUBJECT_GROUPS.includes(groupKey)) return 'subject';
  return 'meta'; // style_name, version, subject_type
}

// ============================================================
// Utility: Flatten prompt to text
// ============================================================

const GROUP_ORDER: (keyof PromptSchema)[] = [
  'artistic_style',
  'subject',
  'subject_character',
  'subject_object',
  'environment',
  'composition',
  'lighting',
  'color_palette',
  'mood_atmosphere',
  'material_texture',
  'technical_quality',
  'camera_lens',
  'post_processing',
];

const SKIP_FIELDS = ['_applies_when'];

export function flattenPrompt(schema: PromptSchema): { positive: string; negative: string } {
  const parts: string[] = [];

  for (const groupKey of GROUP_ORDER) {
    const group = schema[groupKey];
    if (!group || typeof group !== 'object') continue;

    // Skip conditional groups that don't apply
    if (groupKey === 'subject_character') {
      const characterTypes: SubjectType[] = ['character', 'animal'];
      if (!characterTypes.includes(schema.subject_type)) continue;
    }
    if (groupKey === 'subject_object') {
      const objectTypes: SubjectType[] = ['object', 'product', 'food', 'vehicle'];
      if (!objectTypes.includes(schema.subject_type)) continue;
    }

    for (const [key, value] of Object.entries(group)) {
      if (SKIP_FIELDS.includes(key)) continue;
      if (value === null || value === undefined || value === '') continue;
      if (Array.isArray(value) && value.length === 0) continue;

      if (Array.isArray(value)) {
        parts.push(value.join(', '));
      } else if (typeof value === 'string') {
        parts.push(value);
      }
    }
  }

  // Build negative prompt
  const negParts: string[] = [];
  const neg = schema.negative_prompt;
  if (neg) {
    for (const arr of [neg.avoid_elements, neg.avoid_styles, neg.avoid_artifacts, neg.avoid_quality]) {
      if (arr && arr.length > 0) {
        negParts.push(...arr);
      }
    }
  }

  return {
    positive: parts.join(', '),
    negative: negParts.join(', '),
  };
}

// ============================================================
// Utility: Generate clean JSON prompt (for copying)
// Removes all null, empty string, and empty array values
// ============================================================

function cleanObject(obj: Record<string, unknown>): Record<string, unknown> | null {
  const cleaned: Record<string, unknown> = {};
  let hasValue = false;
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const sub = cleanObject(value as Record<string, unknown>);
      if (sub) {
        cleaned[key] = sub;
        hasValue = true;
      }
    } else {
      cleaned[key] = value;
      hasValue = true;
    }
  }
  return hasValue ? cleaned : null;
}

export function generateJsonPrompt(schema: PromptSchema): Record<string, unknown> {
  // Skip conditional groups that don't apply
  const characterTypes: SubjectType[] = ['character', 'animal'];
  const objectTypes: SubjectType[] = ['object', 'product', 'food', 'vehicle'];

  const result: Record<string, unknown> = {};

  // Keep metadata
  result.style_name = schema.style_name;
  result.version = schema.version;
  result.subject_type = schema.subject_type;

  // Process groups in order
  const groups: (keyof PromptSchema)[] = [
    'artistic_style', 'subject', 'subject_character', 'subject_object',
    'environment', 'composition', 'lighting', 'color_palette',
    'mood_atmosphere', 'material_texture', 'technical_quality',
    'camera_lens', 'post_processing', 'negative_prompt', 'generation_params',
  ];

  for (const groupKey of groups) {
    if (groupKey === 'subject_character' && !characterTypes.includes(schema.subject_type)) continue;
    if (groupKey === 'subject_object' && !objectTypes.includes(schema.subject_type)) continue;

    const group = schema[groupKey];
    if (!group || typeof group !== 'object') continue;

    const cleaned = cleanObject(group as unknown as Record<string, unknown>);
    if (cleaned) {
      result[groupKey] = cleaned;
    }
  }

  return result;
}

// ============================================================
// Field metadata for UI
// ============================================================

export const PROMPT_GROUPS: GroupMeta[] = [
  {
    key: 'subject',
    label: 'Subject',
    icon: '🎯',
    description: 'Main subject of the image',
    fields: [
      { key: 'main_subject', label: 'Main Subject', description: 'The primary subject', type: 'textarea', placeholder: 'e.g., a young woman, a vintage camera, a mountain landscape' },
      { key: 'quantity', label: 'Quantity', description: 'Number of subjects', type: 'text', placeholder: 'e.g., single, two, a group of' },
      { key: 'subject_details', label: 'Details', description: 'Additional details about the subject', type: 'textarea', placeholder: 'e.g., wearing a red dress, with intricate engravings' },
      { key: 'size_scale', label: 'Size / Scale', description: 'Size or scale of the subject', type: 'text', placeholder: 'e.g., life-size, miniature, gigantic' },
      { key: 'orientation_placement', label: 'Orientation / Placement', description: 'Position in frame', type: 'text', placeholder: 'e.g., centered, off to the right, in the foreground' },
    ],
  },
  {
    key: 'subject_character',
    label: 'Character Details',
    icon: '🧑',
    description: 'Character/animal-specific attributes',
    condition: (s) => ['character', 'animal'].includes(s.subject_type),
    fields: [
      { key: 'pose_action', label: 'Pose / Action', description: 'Body pose or action', type: 'text', placeholder: 'e.g., standing confidently, running, sitting cross-legged' },
      { key: 'expression_emotion', label: 'Expression / Emotion', description: 'Facial expression or emotion', type: 'text', placeholder: 'e.g., mysterious smile, intense gaze, laughing' },
      { key: 'clothing_accessories', label: 'Clothing & Accessories', description: 'Outfit and accessories', type: 'textarea', placeholder: 'e.g., leather jacket, neon earrings, silver watch' },
      { key: 'body_features', label: 'Body Features', description: 'Physical features', type: 'text', placeholder: 'e.g., athletic build, tall, cybernetic arm' },
      { key: 'hair_style', label: 'Hair Style', description: 'Hair description', type: 'text', placeholder: 'e.g., long flowing red hair, short undercut, braided' },
      { key: 'age_appearance', label: 'Age / Appearance', description: 'Age and general appearance', type: 'text', placeholder: 'e.g., young adult, elderly, teenage' },
      { key: 'ethnicity_skin_tone', label: 'Ethnicity / Skin Tone', description: 'Skin tone or ethnicity', type: 'text', placeholder: 'e.g., dark skin, pale, olive-toned' },
    ],
  },
  {
    key: 'subject_object',
    label: 'Object Details',
    icon: '📦',
    description: 'Object/product-specific attributes',
    condition: (s) => ['object', 'product', 'food', 'vehicle'].includes(s.subject_type),
    fields: [
      { key: 'object_state', label: 'State', description: 'Current state of the object', type: 'text', placeholder: 'e.g., brand new, in motion, half-eaten' },
      { key: 'object_condition', label: 'Condition', description: 'Physical condition', type: 'text', placeholder: 'e.g., pristine, weathered, rusty' },
      { key: 'brand_label', label: 'Brand / Label', description: 'Brand or label', type: 'text', placeholder: 'e.g., Leica, Apple, generic' },
      { key: 'arrangement_layout', label: 'Arrangement', description: 'How the object is arranged', type: 'text', placeholder: 'e.g., flat lay, stacked, scattered' },
      { key: 'interaction', label: 'Interaction', description: 'Interaction with other elements', type: 'text', placeholder: 'e.g., hand holding it, floating, resting on a surface' },
    ],
  },
  {
    key: 'environment',
    label: 'Environment',
    icon: '🌍',
    description: 'Setting and background',
    fields: [
      { key: 'setting', label: 'Setting', description: 'Main setting', type: 'textarea', placeholder: 'e.g., rain-soaked city street, enchanted forest, studio' },
      { key: 'location_type', label: 'Location Type', description: 'Type of location', type: 'text', placeholder: 'e.g., indoor, outdoor, underwater, space' },
      { key: 'time_of_day', label: 'Time of Day', description: 'Time of day', type: 'text', placeholder: 'e.g., golden hour, midnight, dawn' },
      { key: 'weather', label: 'Weather', description: 'Weather conditions', type: 'text', placeholder: 'e.g., heavy rain, foggy, clear sky, snowing' },
      { key: 'season', label: 'Season', description: 'Season', type: 'text', placeholder: 'e.g., autumn, summer, winter' },
      { key: 'era_time_period', label: 'Era / Time Period', description: 'Historical period', type: 'text', placeholder: 'e.g., 1920s, medieval, futuristic' },
      { key: 'background_elements', label: 'Background Elements', description: 'Background details', type: 'textarea', placeholder: 'e.g., holographic billboards, mountains, stars' },
      { key: 'foreground_elements', label: 'Foreground Elements', description: 'Foreground details', type: 'text', placeholder: 'e.g., puddles, fallen leaves, steam' },
      { key: 'ground_surface', label: 'Ground Surface', description: 'Ground description', type: 'text', placeholder: 'e.g., wet cobblestone, grass, sand dunes' },
      { key: 'sky_description', label: 'Sky', description: 'Sky description', type: 'text', placeholder: 'e.g., dramatic sunset, starry night, overcast' },
    ],
  },
  {
    key: 'composition',
    label: 'Composition',
    icon: '📐',
    description: 'Framing and camera setup',
    fields: [
      { key: 'framing', label: 'Framing', description: 'Shot framing', type: 'text', placeholder: 'e.g., close-up, medium shot, full body, wide shot' },
      { key: 'camera_angle', label: 'Camera Angle', description: 'Angle of view', type: 'text', placeholder: "e.g., low angle, eye level, bird's eye, dutch angle" },
      { key: 'perspective', label: 'Perspective', description: 'Perspective type', type: 'text', placeholder: 'e.g., one-point, fish-eye, isometric' },
      { key: 'depth_of_field', label: 'Depth of Field', description: 'DOF setting', type: 'text', placeholder: 'e.g., shallow DOF, deep focus, tilt-shift' },
      { key: 'focal_point', label: 'Focal Point', description: 'What is in focus', type: 'text', placeholder: "e.g., subject's eyes, center of frame" },
      { key: 'composition_rule', label: 'Composition Rule', description: 'Composition guideline', type: 'text', placeholder: 'e.g., rule of thirds, golden ratio, centered' },
      { key: 'symmetry', label: 'Symmetry', description: 'Symmetry type', type: 'text', placeholder: 'e.g., symmetric, asymmetric, radial' },
      { key: 'negative_space', label: 'Negative Space', description: 'Use of empty space', type: 'text', placeholder: 'e.g., lots of negative space, minimal, crowded' },
      { key: 'crop_style', label: 'Crop Style', description: 'Cropping style', type: 'text', placeholder: 'e.g., tight crop, loose crop, full frame' },
    ],
  },
  {
    key: 'lighting',
    label: 'Lighting',
    icon: '💡',
    description: 'Light sources and effects',
    fields: [
      { key: 'primary_light_source', label: 'Primary Light Source', description: 'Main light', type: 'text', placeholder: 'e.g., sunlight, neon signs, candle, studio light' },
      { key: 'light_direction', label: 'Light Direction', description: 'Where light comes from', type: 'text', placeholder: 'e.g., side lighting, backlighting, overhead' },
      { key: 'light_quality', label: 'Light Quality', description: 'Quality of light', type: 'text', placeholder: 'e.g., soft, harsh, diffused, dappled' },
      { key: 'light_color_temperature', label: 'Color Temperature', description: 'Warm or cool light', type: 'text', placeholder: 'e.g., warm 3200K, cool 6500K, mixed' },
      { key: 'shadow_type', label: 'Shadow Type', description: 'Type of shadows', type: 'text', placeholder: 'e.g., deep contrast, soft, ambient occlusion' },
      { key: 'shadow_intensity', label: 'Shadow Intensity', description: 'How strong the shadows are', type: 'text', placeholder: 'e.g., subtle, dramatic, none' },
      { key: 'special_lighting_effects', label: 'Special Effects', description: 'Special lighting effects', type: 'text', placeholder: 'e.g., volumetric, god rays, lens flare, caustics' },
      { key: 'ambient_light', label: 'Ambient Light', description: 'Ambient/fill light', type: 'text', placeholder: 'e.g., dim ambient, bright fill, glowing atmosphere' },
      { key: 'light_count', label: 'Light Count', description: 'Number of light sources', type: 'text', placeholder: 'e.g., single source, three-point, multiple' },
    ],
  },
  {
    key: 'color_palette',
    label: 'Color Palette',
    icon: '🎨',
    description: 'Colors and tones',
    fields: [
      { key: 'dominant_colors', label: 'Dominant Colors', description: 'Main colors in the image', type: 'tags', placeholder: 'Type a color and press Enter' },
      { key: 'color_scheme_type', label: 'Color Scheme', description: 'Color harmony', type: 'text', placeholder: 'e.g., complementary, analogous, monochromatic, triadic' },
      { key: 'saturation_level', label: 'Saturation', description: 'Color saturation', type: 'text', placeholder: 'e.g., highly saturated, muted, desaturated' },
      { key: 'contrast_level', label: 'Contrast', description: 'Contrast level', type: 'text', placeholder: 'e.g., high contrast, low contrast, medium' },
      { key: 'color_mood', label: 'Color Mood', description: 'Emotional color tone', type: 'text', placeholder: 'e.g., warm and inviting, cold and clinical, dark moody' },
      { key: 'color_grading', label: 'Color Grading', description: 'Post color grading', type: 'text', placeholder: 'e.g., teal and orange, cross-processed, bleach bypass' },
      { key: 'tonal_range', label: 'Tonal Range', description: 'Range of tones', type: 'text', placeholder: 'e.g., full range, high key, low key' },
    ],
  },
  {
    key: 'artistic_style',
    label: 'Artistic Style',
    icon: '🖌️',
    description: 'Art medium and style references',
    fields: [
      { key: 'medium', label: 'Medium', description: 'Artistic medium', type: 'text', placeholder: 'e.g., oil painting, photograph, 3D render, watercolor' },
      { key: 'art_movement', label: 'Art Movement', description: 'Artistic movement', type: 'text', placeholder: 'e.g., impressionism, cyberpunk, art nouveau, surrealism' },
      { key: 'style_reference', label: 'Style Reference', description: 'Reference artists or works', type: 'textarea', placeholder: 'e.g., Greg Rutkowski, Studio Ghibli, Blade Runner' },
      { key: 'surface_texture', label: 'Surface Texture', description: 'Visual texture', type: 'text', placeholder: 'e.g., smooth render, oil paint strokes, grainy film' },
      { key: 'rendering_style', label: 'Rendering Style', description: 'How it is rendered', type: 'text', placeholder: 'e.g., photorealistic, stylized, cel-shaded, flat' },
      { key: 'level_of_abstraction', label: 'Abstraction Level', description: 'Realistic vs abstract', type: 'text', placeholder: 'e.g., hyperrealistic, semi-abstract, fully abstract' },
    ],
  },
  {
    key: 'mood_atmosphere',
    label: 'Mood & Atmosphere',
    icon: '🌫️',
    description: 'Emotional tone and atmosphere',
    fields: [
      { key: 'overall_mood', label: 'Overall Mood', description: 'General mood', type: 'text', placeholder: 'e.g., mysterious, joyful, melancholic, epic' },
      { key: 'narrative_context', label: 'Narrative Context', description: 'Underlying story', type: 'textarea', placeholder: "e.g., a lone warrior's last stand, a peaceful morning" },
      { key: 'energy_level', label: 'Energy Level', description: 'Dynamic energy', type: 'text', placeholder: 'e.g., calm, dynamic, chaotic, serene' },
      { key: 'atmosphere_effects', label: 'Atmosphere Effects', description: 'Atmospheric particles', type: 'text', placeholder: 'e.g., haze, smoke, dust particles, mist, fireflies' },
      { key: 'emotional_tone', label: 'Emotional Tone', description: 'Emotional feel', type: 'text', placeholder: 'e.g., nostalgic, hopeful, dark, whimsical' },
    ],
  },
  {
    key: 'material_texture',
    label: 'Material & Texture',
    icon: '🧱',
    description: 'Surface materials and textures',
    fields: [
      { key: 'primary_material', label: 'Primary Material', description: 'Main material', type: 'text', placeholder: 'e.g., brushed metal, marble, wood, fabric' },
      { key: 'secondary_material', label: 'Secondary Material', description: 'Additional material', type: 'text', placeholder: 'e.g., glass accents, gold trim, leather' },
      { key: 'surface_finish', label: 'Surface Finish', description: 'Surface finish', type: 'text', placeholder: 'e.g., matte, glossy, satin, rough' },
      { key: 'reflectivity', label: 'Reflectivity', description: 'How reflective', type: 'text', placeholder: 'e.g., non-reflective, mirror-like, subtle sheen' },
      { key: 'transparency', label: 'Transparency', description: 'Transparency level', type: 'text', placeholder: 'e.g., opaque, translucent, transparent, frosted' },
      { key: 'pattern_detail', label: 'Pattern / Detail', description: 'Surface patterns', type: 'text', placeholder: 'e.g., floral pattern, geometric, paisley, plain' },
      { key: 'wear_aging', label: 'Wear / Aging', description: 'Age and wear', type: 'text', placeholder: 'e.g., vintage patina, brand new, weathered, rusted' },
    ],
  },
  {
    key: 'technical_quality',
    label: 'Technical Quality',
    icon: '⚡',
    description: 'Resolution and detail settings',
    fields: [
      { key: 'resolution_quality', label: 'Resolution', description: 'Output quality', type: 'text', placeholder: 'e.g., 4K, 8K, ultra HD, high resolution' },
      { key: 'detail_level', label: 'Detail Level', description: 'Amount of detail', type: 'text', placeholder: 'e.g., highly detailed, intricate, ultra-fine, minimal' },
      { key: 'sharpness', label: 'Sharpness', description: 'Image sharpness', type: 'text', placeholder: 'e.g., tack sharp, soft focus, selective sharp' },
      { key: 'noise_grain', label: 'Noise / Grain', description: 'Film grain or noise', type: 'text', placeholder: 'e.g., clean, film grain, subtle noise' },
      { key: 'render_engine', label: 'Render Engine', description: 'Rendering engine', type: 'text', placeholder: 'e.g., Octane, Unreal Engine 5, V-Ray, Blender' },
    ],
  },
  {
    key: 'camera_lens',
    label: 'Camera & Lens',
    icon: '📷',
    description: 'Camera and lens settings',
    fields: [
      { key: 'lens_type', label: 'Lens Type', description: 'Camera lens', type: 'text', placeholder: 'e.g., 85mm portrait, 24mm wide, 50mm standard, macro' },
      { key: 'aperture', label: 'Aperture', description: 'Aperture value', type: 'text', placeholder: 'e.g., f/1.4, f/2.8, f/8, f/16' },
      { key: 'shutter_speed_effect', label: 'Shutter Speed Effect', description: 'Motion effect', type: 'text', placeholder: 'e.g., frozen action, motion blur, long exposure trails' },
      { key: 'iso_effect', label: 'ISO Effect', description: 'ISO noise effect', type: 'text', placeholder: 'e.g., clean low ISO, grainy high ISO' },
      { key: 'film_stock', label: 'Film Stock', description: 'Film emulation', type: 'text', placeholder: 'e.g., Kodak Portra 400, Fuji Velvia 50, Ilford HP5' },
      { key: 'filter_on_lens', label: 'Lens Filter', description: 'Physical filter', type: 'text', placeholder: 'e.g., polarizer, ND filter, star filter, soft focus' },
    ],
  },
  {
    key: 'post_processing',
    label: 'Post Processing',
    icon: '🔧',
    description: 'Post-production effects',
    fields: [
      { key: 'vignette', label: 'Vignette', description: 'Edge darkening', type: 'text', placeholder: 'e.g., subtle vignette, heavy vignette, none' },
      { key: 'bloom_glow', label: 'Bloom / Glow', description: 'Highlight bloom', type: 'text', placeholder: 'e.g., soft bloom, neon glow, none' },
      { key: 'chromatic_aberration', label: 'Chromatic Aberration', description: 'Color fringing', type: 'text', placeholder: 'e.g., subtle CA, heavy, none' },
      { key: 'lens_distortion', label: 'Lens Distortion', description: 'Lens distortion', type: 'text', placeholder: 'e.g., barrel, pincushion, none' },
      { key: 'color_filter', label: 'Color Filter', description: 'Color filter overlay', type: 'text', placeholder: 'e.g., vintage warm, cool blue, sepia, none' },
      { key: 'grain_overlay', label: 'Grain Overlay', description: 'Added grain effect', type: 'text', placeholder: 'e.g., 35mm film grain, digital noise, none' },
      { key: 'sharpening', label: 'Sharpening', description: 'Sharpening level', type: 'text', placeholder: 'e.g., strong sharpening, subtle, none' },
    ],
  },
  {
    key: 'negative_prompt',
    label: 'Negative Prompt',
    icon: '🚫',
    description: 'Elements to avoid in the image',
    fields: [
      { key: 'avoid_elements', label: 'Avoid Elements', description: 'Things to exclude', type: 'tags', placeholder: 'e.g., watermark, text, border' },
      { key: 'avoid_styles', label: 'Avoid Styles', description: 'Styles to avoid', type: 'tags', placeholder: 'e.g., cartoon, anime, pixel art' },
      { key: 'avoid_artifacts', label: 'Avoid Artifacts', description: 'AI artifacts to avoid', type: 'tags', placeholder: 'e.g., extra fingers, bad anatomy' },
      { key: 'avoid_quality', label: 'Avoid Quality Issues', description: 'Quality issues to avoid', type: 'tags', placeholder: 'e.g., blurry, low resolution, noisy' },
    ],
  },
  {
    key: 'generation_params',
    label: 'Generation Parameters',
    icon: '⚙️',
    description: 'Technical generation settings (not included in prompt text)',
    fields: [
      { key: 'aspect_ratio', label: 'Aspect Ratio', description: 'Image aspect ratio', type: 'text', placeholder: 'e.g., 16:9, 1:1, 9:16, 4:3' },
      { key: 'seed', label: 'Seed', description: 'Random seed for reproducibility', type: 'number', placeholder: 'Leave empty for random' },
      { key: 'steps', label: 'Steps', description: 'Generation steps', type: 'number', placeholder: 'e.g., 20, 30, 50' },
      { key: 'cfg_scale', label: 'CFG Scale', description: 'Classifier-free guidance', type: 'number', placeholder: 'e.g., 7.0, 7.5, 12.0' },
      { key: 'sampler', label: 'Sampler', description: 'Sampling method', type: 'text', placeholder: 'e.g., DPM++ 2M Karras, Euler a' },
      { key: 'model_recommendation', label: 'Recommended Model', description: 'Suggested AI model', type: 'text', placeholder: 'e.g., SDXL, Midjourney v6, DALL-E 3' },
    ],
  },
];

export interface RefineSuggestion {
  drift_summary: string;
  confidence: 'high' | 'medium' | 'low';
  suggested_changes: Array<{
    group: string;
    field: string;
    current_value: string | null;
    suggested_value: string;
    reason: string;
  }>;
}
