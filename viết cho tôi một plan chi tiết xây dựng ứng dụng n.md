<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# viết cho tôi một plan chi tiết xây dựng ứng dụng này. tôi sẽ sửa lại thông tin ứng dụng như sau

- ứng dụng cần có khả năng gen ảnh tương tự flow labs của google
- ứng dụng sẽ định nghĩa những thành phần của style library vào library prompt. người dùng sẽ tạo ảnh thuộc thư viện bằng cách nhập nội dung mô tả về ảnh (user prompt)
- khi gen ảnh theo library, model sẽ đọc ảnh mẫu từ thư viện, library prompt và user prompt để gen ảnh

Dưới đây là plan chi tiết cho phiên bản mới của app: một **library-driven image generation tool**, nơi người dùng tạo Style Library, lưu ảnh mẫu + library prompt, rồi sinh ảnh mới bằng cách kết hợp `reference images + library prompt + user prompt`, gần với cách Flow dùng image assets như “ingredients” trong cùng một project. [^1][^2][^3][^4] Hướng này phù hợp hơn PRD cũ vì giữ ảnh mẫu là dữ liệu đầu vào hạng nhất, thay vì chỉ reverse-engineer ảnh thành prompt text thuần túy. [^3][^4][^1]

## Định nghĩa sản phẩm

- Mục tiêu chính của app là giúp người dùng xây thư viện phong cách để tái sử dụng nhất quán, đúng pain point “copy-paste prompt thủ công”, “prompt drift”, và nhu cầu tạo nhiều ảnh khác subject nhưng cùng style đã nêu trong PRD. [^3]
- Khác với bản đầu thiên về bóc ảnh thành JSON 10 trường, bản mới nên coi `library_prompt` là lớp mô tả style có thể chỉnh sửa, còn ảnh mẫu vẫn phải được gửi trực tiếp vào flow generate để giữ fidelity tốt hơn. [^3][^4][^1]
- Flow cho phép tạo ảnh trong project, lưu version/history, và thêm ảnh vào prompt dưới dạng ingredient, nên app của bạn nên mô phỏng đúng triết lý đó ở mức ảnh tĩnh: lưu asset, tái dùng asset, và generate từ asset + prompt. [^1][^2]


## MVP v1.0

- Chỉ giữ 1 vòng giá trị chính: **Tạo Library → thêm ảnh mẫu → viết/gợi ý library prompt → nhập user prompt → generate ảnh → lưu kết quả vào history**, đúng tinh thần thu hẹp scope trong implementation plan. [^4]
- Mỗi library nên có 1–10 ảnh mẫu, một `library_prompt` mô tả phong cách cố định, một `negative_prompt` tùy chọn, tags, và version hiện hành. [^4][^1]
- AI analysis vẫn nên tồn tại, nhưng chỉ để gợi ý `library_prompt`, tags, notes, và cảnh báo bộ ảnh “mixed”; nó không được tự động áp prompt vào library nếu chưa qua review. [^4]
- Không nên làm ở v1.0: A/B compare đầy đủ, image edit riêng, style transfer riêng, hay studio phức tạp, vì chính implementation plan đã xác nhận MVP cũ quá rộng. [^4]


## Màn hình và chức năng

### 1. Library List

- Hiển thị toàn bộ library dưới dạng card, có cover image, số lượng ảnh mẫu, số version, trạng thái `Active/Draft/Deprecated`, và nút “Generate”. [^3]
- Có filter theo tag, style type, updated time, và trạng thái. [^3]


### 2. Create Library

- User nhập tên library, mô tả ngắn, style type, rồi upload ảnh mẫu; app lưu ảnh cục bộ dưới dạng Blob trong IndexedDB thay vì base64 để tránh phình dữ liệu. [^4]
- Sau upload, user chọn một trong hai đường: **Manual** để tự viết library prompt, hoặc **AI Assist** để model đọc bộ ảnh và gợi ý prompt. [^4]
- Nếu dùng AI Assist, app phải mở review panel với confidence, notes, và style consistency trước khi user accept. [^4]


### 3. Edit Library

- Màn này có 3 vùng: ảnh mẫu, prompt editor, và preview/version history; hướng này vẫn giữ tinh thần “pro-tool” và versioning từ PRD gốc nhưng bỏ bớt các tab phụ không cần cho MVP. [^3][^4]
- Editor nên chia thành `Core`, `Advanced`, và `Model Config`, theo hướng core/extended/vendor mà implementation plan đề xuất. [^4]
- Có dirty-check bằng deep compare, không dùng `JSON.stringify`, và hiển thị thay đổi bằng chỉ báo nhẹ thay vì hiệu ứng flashy. [^4]


### 4. Generate

- User chọn library hoặc version cụ thể, nhập `user_prompt`, chọn model, aspect ratio, số ảnh đầu ra, seed, rồi bấm Generate. [^1][^4]
- Backend dựng payload gồm: `reference_images`, `library_prompt`, `user_prompt`, `negative_prompt`, `model_config`, vì Flow hỗ trợ tạo ảnh trong project và thêm ảnh trực tiếp vào prompt như ingredient. [^1]
- Kết quả trả về là gallery các ảnh mới, mỗi ảnh có metadata prompt/version và nút “Save to Library History” hoặc “Use as New Reference”. [^1][^3]


### 5. Settings và Logs

- Settings chứa model provider, API key, mặc định output count, default aspect ratio, và rule ưu tiên giữa library prompt với user prompt. [^4][^1]
- Logs lưu lại analyze jobs, generation jobs, prompt payload đã merge, lỗi parse JSON, lỗi provider, và thời gian xử lý để phục vụ debug. [^4]


## Kiến trúc và dữ liệu

- App nên tách rõ **offline library** và **online AI**, vì implementation plan đã chỉ ra offline-first mâu thuẫn với analyze/generate nếu không phân lớp rõ. [^4]
- Phần offline gồm: Library CRUD, xem lịch sử, edit prompt, export/import, và duyệt asset; phần online gồm: AI prompt suggestion và image generation. [^4]
- Về storage, metadata nhỏ có thể ở localStorage hoặc IndexedDB tùy đơn giản hóa, còn ảnh mẫu và ảnh gen phải nằm ở IndexedDB dưới dạng Blob. [^3][^4]


### Data model đề xuất

```ts
type StyleLibrary = {
  id: string
  name: string
  description: string
  styleType: 'photo' | 'illustration' | 'cinematic' | 'anime' | 'product' | 'mixed'
  coverImageId: string | null
  referenceImageIds: string[]
  activeVersionId: string
  tags: string[]
  status: 'active' | 'draft' | 'deprecated'
  createdAt: string
  updatedAt: string
}

type LibraryVersion = {
  id: string
  libraryId: string
  versionName: string
  libraryPrompt: string
  negativePrompt?: string
  modelConfig?: {
    aspectRatio?: string
    outputCount?: number
    seed?: number
    guidance?: number
    model?: string
  }
  aiAnalysis?: {
    confidence: 'high' | 'medium' | 'low'
    styleConsistency: 'consistent' | 'mixed'
    notes?: string
  }
  referenceImageIds: string[]
  createdAt: string
}

type GenerationJob = {
  id: string
  libraryId: string
  versionId: string
  userPrompt: string
  mergedPrompt: string
  outputImageIds: string[]
  status: 'queued' | 'running' | 'done' | 'error'
  createdAt: string
}
```

- Model này bám được cả nhu cầu versioning, status của library, lịch sử generate, và gợi ý AI review từ hai tài liệu cũ. [^3][^4]


### Prompt contract

- `library_prompt` chỉ mô tả style cố định: mood, lighting, rendering, palette, material, camera language, composition preference. [^3][^4]
- `user_prompt` chỉ mô tả nội dung cần tạo: subject, hành động, bối cảnh, chi tiết riêng cho ảnh mới. [^3]
- Rule merge nên là: **reference images quyết định style fidelity**, `library_prompt` khóa logic thẩm mỹ, còn `user_prompt` thay nội dung; nếu user prompt mâu thuẫn với style thì ưu tiên style trừ khi user bật chế độ override. [^1][^4]


## Lộ trình xây dựng

| Phase | Mục tiêu | Deliverable |
| :-- | :-- | :-- |
| Phase 0 | Chốt product spec mới theo hướng “image ingredients + library prompt + user prompt”. [^1][^4] | Functional spec ngắn, sitemap, event flow, API contract. [^4] |
| Phase 1 | Xây data layer và storage. [^3][^4] | `storage.ts`, `db.ts`, schema library/version/job, Blob migration-safe storage. [^4] |
| Phase 2 | Xây Library CRUD và upload ảnh mẫu. [^3][^4] | Library List, Create/Edit Library, cover image, tags, status. [^3] |
| Phase 3 | Xây Prompt Editor và Versioning. [^3][^4] | `library_prompt`, `negative_prompt`, `model_config`, dirty-check, save version. [^4] |
| Phase 4 | Xây AI Assist cho library prompt. [^4] | `/api/library/analyze`, AIReviewPanel, confidence badge, consistency warning. [^4] |
| Phase 5 | Xây Generate flow theo library. [^1] | `/api/generate`, payload merger, output gallery, save history. [^1][^4] |
| Phase 6 | Refine loop. [^3][^1] | “Use output as reference”, duplicate version, retry with same library. [^1][^3] |
| Phase 7 | QA và release. [^4] | Offline/online tests, migration test, logging, beta rollout. [^4] |

### Sprint gợi ý

- **Sprint 1:** project setup, routing, theme, DB schema, Library list shell. [^4]
- **Sprint 2:** upload reference images, Blob storage, create/edit library. [^4]
- **Sprint 3:** prompt editor, version save, export/import JSON manifest. [^3][^4]
- **Sprint 4:** AI assist + review panel + logs. [^4]
- **Sprint 5:** generate API + gallery + history panel, tương tự Flow có project-level image creation và version history. [^1]
- **Sprint 6:** polish, telemetry, bugfix, beta. [^4]


## API, QA và quyết định cần chốt

### API routes

- `POST /api/library/analyze`: nhận `referenceImages[]`, trả `suggestedLibraryPrompt`, `tags`, `confidence`, `styleConsistency`, `notes`. [^4]
- `POST /api/generate`: nhận `referenceImages[] + libraryPrompt + userPrompt + negativePrompt + modelConfig`, trả `images[] + rawResponse + usage`. [^1]
- `POST /api/version/create`: lưu version mới cho library. [^3]


### QA bắt buộc

- Test tạo library hoàn toàn offline, sau đó mở lại vẫn thấy metadata và ảnh mẫu. [^3][^4]
- Test AI analyze với bộ ảnh đồng nhất và bộ ảnh mixed để xem warning hoạt động đúng. [^4]
- Test generate với cùng library nhưng nhiều user prompt khác nhau để kiểm tra mức giữ style. [^3][^1]
- Test migration và storage budget, vì implementation plan đã coi Blob migration và storage là điểm kỹ thuật quan trọng. [^4]


### 3 quyết định nên chốt ngay

- Có cho user thêm ảnh output tốt trở lại library như reference không; theo mình nên có vì Flow cũng cho tái dùng asset trong project và lưu version để tiếp tục tạo. [^1][^2]
- `confidence` nên dùng cả label và numeric score, vì label dễ đọc cho UI còn numeric hữu ích cho rule tự động. [^4]
- Có giữ “schema field editor” hay không; với định nghĩa sản phẩm mới, nên hạ nó xuống vai trò phụ trợ cho library prompt, không để nó trở thành trung tâm của app như PRD cũ. [^3][^4]

Plan ngắn gọn nhất là: **xây Library làm nguồn style, Generate làm trung tâm sử dụng, AI Assist làm công cụ hỗ trợ, và Versioning làm cơ chế giữ chất lượng lâu dài**. [^3][^4][^1] Muốn tiếp tục ở mức thực thi, tôi có thể viết tiếp cho bạn bản **PRD v2 hoàn chỉnh** hoặc **task breakdown theo FE/BE/AI**.

<div align="center">⁂</div>

[^1]: https://support.google.com/flow/answer/16729550?hl=en

[^2]: https://blog.google/innovation-and-ai/products/google-flow-veo-ai-filmmaking-tool/

[^3]: prd_style_prompt_library.md

[^4]: implementation_plan.md

