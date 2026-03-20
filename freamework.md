# Style Prompt Library — Framework Vận Hành Hoàn Chỉnh

Ứng dụng sử dụng một schema chuẩn gồm 3 nhóm: STYLE (cố định), SUBJECT (biến số), META để tạo prompt cho các tác vụ: tạo style, tạo ảnh mới, cải thiện prompt, chuyển đổi style.[^1]

***

## 1. Mục tiêu \& Phạm vi

- Biến mỗi style thành một “Style Profile” có cấu trúc, version rõ ràng; dùng lại trên mọi tác vụ.
- Tách bạch STYLE vs SUBJECT như spec hiện tại; đảm bảo STYLE không đổi giữa các variant, SUBJECT thay đổi linh hoạt.[^1]
- Hợp nhất 4 tính năng vào 1 lifecycle: Style Design → Prompt Composition → Generation → Evaluation → Versioning.[^2][^3][^4]

***

## 2. Mô hình dữ liệu cốt lõi

### 2.1 Entity chính

- **StyleProfile**
    - meta: `style_name`, `version`, `subject_type`[^1]
    - style_groups: `artistic_style`, `color_palette`, `lighting`, `mood_atmosphere`, `material_texture`, `technical_quality`, `camera_lens`, `post_processing`, `negative_prompt`, `generation_params`[^1]
    - status: `draft | active | deprecated`
    - reference_images: danh sách ảnh gốc dùng làm style.
- **SubjectProfile (per request)**
    - subject groups: `subject`, `subject_character`, `subject_object`, `environment`, `composition`[^1]
    - ràng buộc bởi `subject_type`.
- **PromptTemplate**
    - task: `create_style | generate_new | refine_prompt | style_transfer`
    - pattern: cách ghép STYLE + SUBJECT + META → final text prompt.
- **PromptInstance**
    - style_profile_version
    - subject_profile_snapshot
    - task
    - final_prompt_text (hoặc JSON)
    - model_used (SDXL, MJ, DALL·E, …).
- **ImageArtifact**
    - image_url / id
    - link đến PromptInstance + style_profile_version.
- **EvalRecord**
    - style_fidelity_score (1–5)
    - content_match_score (1–5)
    - notes (mismatch: palette, lighting, anatomy, composition, v.v.)
    - nguồn: user feedback hoặc internal review.

***

## 3. Chuẩn StyleProfile (gắn với style_spec.md)

StyleProfile là object tổng hợp từ toàn bộ nhóm STYLE + META; SUBJECT chỉ sống ở level request.[^1]

```json
{
  "style_profile_id": "uuid",
  "meta": {
    "style_name": "Cyberpunk Rainy Street Portrait",
    "version": "v1",
    "subject_type": "character",
    "status": "active"
  },
  "style": {
    "artistic_style": {
      "medium": "3D render",
      "art_movement": "cyberpunk",
      "style_reference": "Blade Runner, Ghost in the Shell",
      "surface_texture": "smooth render",
      "rendering_style": "stylized",
      "level_of_abstraction": "semi-abstract"
    },
    "color_palette": {
      "dominant_colors": ["deep blue", "magenta", "neon cyan"],
      "color_scheme_type": "complementary",
      "saturation_level": "highly saturated",
      "contrast_level": "high contrast",
      "color_mood": "cold and energetic",
      "color_grading": "teal and orange",
      "tonal_range": "full range"
    },
    "lighting": {
      "primary_light_source": "neon signs",
      "light_direction": "side lighting",
      "light_quality": "soft",
      "light_color_temperature": "cool 6500K",
      "shadow_type": "soft",
      "shadow_intensity": "dramatic",
      "special_lighting_effects": "volumetric, god rays",
      "ambient_light": "dim ambient",
      "light_count": "multiple sources"
    },
    "mood_atmosphere": {
      "overall_mood": "mysterious",
      "narrative_context": "a lone figure in a rainy neon city",
      "energy_level": "dynamic",
      "atmosphere_effects": "haze, rain, fog",
      "emotional_tone": "melancholic"
    },
    "material_texture": {
      "primary_material": "wet asphalt",
      "secondary_material": "metal, glass",
      "surface_finish": "glossy",
      "reflectivity": "high",
      "transparency": "translucent neon reflections",
      "pattern_detail": "urban signs, geometric light patterns",
      "wear_aging": "slightly worn cityscape"
    },
    "technical_quality": {
      "resolution_quality": "4K",
      "detail_level": "highly detailed",
      "sharpness": "tack sharp",
      "noise_grain": "clean",
      "render_engine": "Unreal Engine 5"
    },
    "camera_lens": {
      "lens_type": "85mm portrait",
      "aperture": "f/1.4",
      "shutter_speed_effect": "frozen action",
      "iso_effect": "clean low ISO",
      "film_stock": "Kodak Portra 400",
      "filter_on_lens": "none"
    },
    "post_processing": {
      "vignette": "subtle vignette",
      "bloom_glow": "neon glow",
      "chromatic_aberration": "subtle",
      "lens_distortion": "none",
      "color_filter": "cool blue",
      "grain_overlay": "none",
      "sharpening": "strong sharpening"
    },
    "negative_prompt": {
      "avoid_elements": ["watermark", "text", "border"],
      "avoid_styles": ["cartoon", "pixel art"],
      "avoid_artifacts": ["extra fingers", "bad anatomy"],
      "avoid_quality": ["blurry", "low resolution"]
    },
    "generation_params": {
      "aspect_ratio": "16:9",
      "seed": null,
      "steps": 30,
      "cfg_scale": 7.5,
      "sampler": "DPM++ 2M Karras",
      "model_recommendation": "SDXL"
    }
  },
  "reference_images": [
    "url_1",
    "url_2"
  ]
}
```

Tất cả field STYLE trong style_spec.md đều được map vào block `style` trong StyleProfile.[^1]

***

## 4. Prompt Composition Layer

### 4.1 SubjectProfile (per request)

SubjectProfile dùng đúng các group SUBJECT.[^1]

```json
{
  "subject_profile": {
    "subject": {
      "main_subject": "a young woman",
      "quantity": "single",
      "subject_details": "wearing a red coat, holding a transparent umbrella",
      "size_scale": "life-size",
      "orientation_placement": "centered"
    },
    "subject_character": {
      "pose_action": "standing confidently",
      "expression_emotion": "mysterious smile",
      "clothing_accessories": "futuristic jacket, neon earrings",
      "body_features": "slim, athletic build",
      "hair_style": "short bob haircut with neon highlights",
      "age_appearance": "young adult",
      "ethnicity_skin_tone": "olive-toned"
    },
    "environment": {
      "setting": "rain-soaked city street with holographic billboards",
      "location_type": "outdoor",
      "time_of_day": "night",
      "weather": "heavy rain",
      "season": "autumn",
      "era_time_period": "futuristic",
      "background_elements": "skyscrapers, neon signs",
      "foreground_elements": "puddles, reflections",
      "ground_surface": "wet cobblestone",
      "sky_description": "barely visible cloudy sky"
    },
    "composition": {
      "framing": "medium shot",
      "camera_angle": "eye level",
      "perspective": "one-point",
      "depth_of_field": "shallow DOF",
      "focal_point": "subject's eyes",
      "composition_rule": "rule of thirds",
      "symmetry": "asymmetric",
      "negative_space": "moderate negative space",
      "crop_style": "tight crop"
    }
  }
}
```


### 4.2 PromptTemplate (per task)

Ví dụ template cho `generate_new` (ý tưởng, bạn tùy chỉnh format):

```markdown
You are an expert image prompt composer.

STYLE (do not change core style traits):
- Artistic style: {{style.artistic_style.medium}}, {{style.artistic_style.art_movement}}, {{style.artistic_style.rendering_style}}, {{style.artistic_style.surface_texture}}, {{style.artistic_style.level_of_abstraction}}
- Color palette: {{style.color_palette.dominant_colors}}, scheme {{style.color_palette.color_scheme_type}}, {{style.color_palette.saturation_level}}, {{style.color_palette.contrast_level}}, mood {{style.color_palette.color_mood}}, grading {{style.color_palette.color_grading}}
- Lighting: {{style.lighting.primary_light_source}}, {{style.lighting.light_direction}}, {{style.lighting.light_quality}}, {{style.lighting.light_color_temperature}}, shadows {{style.lighting.shadow_type}}, {{style.lighting.shadow_intensity}}, effects {{style.lighting.special_lighting_effects}}
- Mood & atmosphere: {{style.mood_atmosphere.overall_mood}}, {{style.mood_atmosphere.narrative_context}}, {{style.mood_atmosphere.energy_level}}, effects {{style.mood_atmosphere.atmosphere_effects}}, tone {{style.mood_atmosphere.emotional_tone}}
- Material & texture: {{style.material_texture.primary_material}}, {{style.material_texture.secondary_material}}, finish {{style.material_texture.surface_finish}}, reflectivity {{style.material_texture.reflectivity}}
- Technical: {{style.technical_quality.resolution_quality}}, {{style.technical_quality.detail_level}}, {{style.technical_quality.sharpness}}, grain {{style.technical_quality.noise_grain}}, engine {{style.technical_quality.render_engine}}
- Camera & lens: {{style.camera_lens.lens_type}}, {{style.camera_lens.aperture}}, {{style.camera_lens.shutter_speed_effect}}, film {{style.camera_lens.film_stock}}
- Post processing: vignette {{style.post_processing.vignette}}, glow {{style.post_processing.bloom_glow}}, color filter {{style.post_processing.color_filter}}, grain {{style.post_processing.grain_overlay}}
- Negative: avoid {{style.negative_prompt.avoid_elements}}, styles {{style.negative_prompt.avoid_styles}}, artifacts {{style.negative_prompt.avoid_artifacts}}, quality {{style.negative_prompt.avoid_quality}}

SUBJECT (can change per request):
- Main subject: {{subject.subject.main_subject}}, {{subject.subject.subject_details}}, quantity {{subject.subject.quantity}}, size {{subject.subject.size_scale}}, placement {{subject.subject.orientation_placement}}
- Character: pose {{subject.subject_character.pose_action}}, expression {{subject.subject_character.expression_emotion}}, clothing {{subject.subject_character.clothing_accessories}}, hair {{subject.subject_character.hair_style}}, age {{subject.subject_character.age_appearance}}
- Environment: {{subject.environment.setting}}, time {{subject.environment.time_of_day}}, weather {{subject.environment.weather}}, background {{subject.environment.background_elements}}, foreground {{subject.environment.foreground_elements}}
- Composition: framing {{subject.composition.framing}}, camera angle {{subject.composition.camera_angle}}, perspective {{subject.composition.perspective}}, DOF {{subject.composition.depth_of_field}}, focal point {{subject.composition.focal_point}}, rule {{subject.composition.composition_rule}}

GENERATION PARAMS:
- Aspect ratio {{style.generation_params.aspect_ratio}}, steps {{style.generation_params.steps}}, cfg {{style.generation_params.cfg_scale}}, sampler {{style.generation_params.sampler}}, model {{style.generation_params.model_recommendation}}

Return a single, concise prompt string suitable for the target image model.
```

Các task khác (`refine_prompt`, `style_transfer`, `create_style`) dùng cùng schema nhưng prompt system khác, vẫn dựa trên StyleProfile + SubjectProfile.[^5][^2]

***

## 5. Luồng nghiệp vụ (đã gắn với schema của bạn)

### 5.1 Tạo Style (Create Style)

1. User tạo Style mới
    - Nhập: `style_name`, `subject_type`, mô tả ngắn.
    - Upload nhiều ảnh style.
2. AI phân tích ảnh → auto-fill STYLE groups
    - `artistic_style`, `color_palette`, `lighting`, `mood_atmosphere`, …
    - Mặc định tạo `generation_params` phù hợp (aspect_ratio, steps, sampler, model).[^1]
3. User review \& chỉnh tay
    - UI hiển thị bảng group giống style_spec.md để user edit từng field.
4. Lưu thành StyleProfile v1 (status = `draft`) → khi owner confirm → `active`.

***

### 5.2 Tạo ảnh mới (Generate New Image)

1. Chọn StyleProfile (style_name + version active).
2. Nhập SubjectProfile qua form tương ứng các group SUBJECT.[^1]
3. Prompt Composition ghép StyleProfile + SubjectProfile theo PromptTemplate `generate_new`.
4. Gọi model gen ảnh → ra ImageArtifact.
5. User đánh giá (optional) → tạo EvalRecord cho PromptInstance.

***

### 5.3 Cải thiện prompt (Refine Prompt)

1. Input
    - Ảnh output + PromptInstance + StyleProfile hiện tại + reference_images.
2. AI phân tích lệch style
    - So sánh palette, lighting, mood, composition với StyleProfile + ảnh tham chiếu.
    - Gợi ý chỉnh trong:
        - STYLE: ví dụ tăng `contrast_level`, chỉnh `lighting.light_quality`.
        - generation_params: thay sampler, cfg_scale, steps.
3. Tạo StyleProfile candidate v_next (draft)
    - Không sửa trực tiếp version active.
4. Evaluation
    - Chạy một tập SubjectProfile test (có thể lưu sẵn cho mỗi style).
    - So sánh v_current vs v_next bằng human rating hoặc quick review.
5. Promote
    - Nếu tốt hơn → set v_next = `active`, v_current = `deprecated`.
    - Nếu không → reject, log lý do.

***

### 5.4 Chuyển đổi style (Style Transfer)

1. Input
    - Ảnh bất kỳ (content) + StyleProfile target.
2. AI trích SubjectProfile từ ảnh gốc
    - Dùng cùng schema SUBJECT (subject, environment, composition, v.v.).[^1]
3. Prompt Composition (task = `style_transfer`)
    - Dùng StyleProfile target (STYLE) + SubjectProfile (từ ảnh gốc, có thể cho phép user chỉnh).
    - PromptTemplate nhấn mạnh: giữ bố cục/nội dung, thay toàn bộ STYLE.
4. Gọi model gen ảnh → lưu ImageArtifact + EvalRecord (user rate giống style).

***

## 6. Lifecycle \& Versioning

- **Design**
    - Tạo StyleProfile v1 từ style_ref + AI analysis + chỉnh tay.
- **Test**
    - Dùng Playground, test với nhiều SubjectProfile.
- **Evaluate**
    - Lưu EvalRecord: style_fidelity, content_match, note.
- **Release**
    - Promote version đạt chuẩn sang `active`, gắn “production tag”.
- **Monitor**
    - Log toàn bộ PromptInstance + ImageArtifact + EvalRecord.
- **Iterate**
    - Khi cần cải thiện, tạo candidate v_next → quay lại Test \& Evaluate trước khi thay active.[^3][^6][^2]

***

## 7. Mapping rõ STYLE vs SUBJECT

| Nhóm | Nguồn | Vai trò trong framework |
| :-- | :-- | :-- |
| STYLE groups (10 nhóm) | StyleProfile | Định nghĩa phong cách, cố định theo style, versioned [^1] |
| SUBJECT groups (5 nhóm) | SubjectProfile (per request) | Nội dung, biến đổi theo mỗi ảnh [^1] |
| META (`style_name`, `version`, `subject_type`) | StyleProfile.meta | Nhận dạng style, liên kết UI và version [^1] |
| negative_prompt, generation_params | StyleProfile.style | Guardrail + tham số model cho mọi request thuộc style [^1] |


***

Nếu bạn muốn, bước tiếp theo tôi có thể viết thêm một đoạn “spec cho Antigravity” dạng checklist: cần refactor những phần nào trong codebase/UI theo framework này. Bạn có muốn thêm phần checklist ngắn (dev-focused) không?

<div align="center">⁂</div>

[^1]: style_spec.md

[^2]: https://promptengineering.org/comprehensive-and-simplified-lifecycles-for-effective-ai-prompt-management/

[^3]: https://dev.to/kuldeep_paul/from-experimentation-to-production-how-to-manage-the-prompt-engineering-lifecycle-28pj

[^4]: https://portkey.ai/blog/lifecycle-of-a-prompt

[^5]: https://www.emergentmind.com/topics/prompt-specification-engineering

[^6]: https://agenta.ai/blog/what-we-learned-building-a-prompt-management-system

