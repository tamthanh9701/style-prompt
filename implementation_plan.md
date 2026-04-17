# Style Prompt Library V2 — Explicit Implementation Plan (v10 Final)

Tài liệu thiết kế kiến trúc và kế hoạch triển khai (Implementation Plan) cấp Master. Cung cấp đầy đủ Contract API, Database Interface và Ma trận phân chia File để tiến hành Code (Cấu trúc lại ~40-50% Core Flow).

---

## 1. Product & Technical Metrics

| Tên Metric | Mục Tiêu Kỹ Thuật | Ý Nghĩa / Cách đo đạc |
| :--- | :--- | :--- |
| **High-Fidelity Promote Rate** | > 15% | `Count(Output "Use as Ref" VÀ Rating ≥ 4⭐) / Total Output`. |
| **Generation Save Rate** | > 40% | `Count(Output ấn "Save") / Total Generations`. |
| **Successful Migration Rate** | > 99% | Tỷ lệ chuyển đổi ảnh Gốc Base64 thành Blob thành công. |
| **Silent Data Loss Rate** | 0% | `Base64 Cũ - (Blob Mới + Failed Logged)` = 0. Việc Lỗi (Partial Skip) là được phép, nhưng mất dữ liệu không để lại Log là Tối Kỵ. |

---

## 2. Hệ Điều Hướng Giao Tiếp API (Single Source of Truth Contracts)

### 2.1 Tuyến: `POST /api/ai` (Trích xuất Schema)
**Request Body (Frontend Build):**
*Lưu ý: Mảng Base64 ở đây chỉ là Format Truyền Tải (Transport format) qua mạng. Trong Storage máy Local, chúng hoàn toàn lưu bằng File Blob.*
```json
{
  "action": "analyzeStyle",
  "data": { "images": [ "data:image/webp;base64,...", "data:image/webp;base64,..." ] },
  "config": { "provider": "google", "model": "gemini-2.0-flash", "apiKey": "..." }
}
```
**Response Body (Backend Reply):**
```json
{
  "success": true,
  "result": {
    "schema": { "schema_version": 2, "style_name": "Suggested Style", ... }, // V1 15-Groups
    "_analysis_meta": { "confidence": "high", "style_consistency": "consistent", "notes": "..." }
  }
}
```

### 2.2 Tuyến: `POST /api/imagen` (Tuyến Hóa Nhiệm: Sinh Ảnh)
*Không có AI trung gian can thiệp sửa chữ.* Text truyền lên do Client tự Gom và Chuẩn Hoá (Normalize Text, xoá các chuỗi Null/Rỗng, cắt khoảng trắng).
**Request Body:**
```json
{
  "libraryId": "lib_8x9a...", 
  "mergedPromptText": "MANDATORY STYLE: Octane render, cyberpunk neon lighting.\nCONTENT: A stray cat walking down the alley.", // Bắt buộc tuân thủ Cấu Trúc Business Heuristic
  "negativePromptText": "watermark, bad anatomy",
  "referenceImagesB64": [
    "data:image/jpeg;base64... Original 1 ...", // Buộc Sort Gốc Trực tiếp ở đầu
    "data:image/jpeg;base64... Gen Ref 1 ..."   // Ảnh Gen Ref bị đẩy xuống phía sau mảng
  ],
  "aspectRatio": "16:9",
  "model": "gemini-3.1-flash-image-preview",
  "sampleCount": 2, // Max 4
  "seed": 4252
}
```

---

## 3. Dữ liệu: Data Entities Core (Full Audit & Migration Field)

Sự sống còn nằm tại `lib/db.ts` và `types.ts`. Các Base64 truyền tải được Decode ra Blob để Save RAM ở đây.

```typescript
export interface RefImageRecord {
  id: string; 
  libraryId: string; 
  data: Blob;           // BẮT BUỘC: Database chỉ lưu Blob. Tránh việc nhét ngược Base64.
  mimeType: string;
  source: 'original' | 'generated'; // MỤC ĐÍCH: Tracking phạt trọng số chống Drift
  sourceJobId?: string; // DEBUG/RESTORE: Nhớ ID của Lần Gen đã đẻ ra Ref này
  addedAt: string;      
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
```

---

## 4. Ma Trận File Cốt Lõi (File Mapping Matrix)

Phạm vi Re-Platforming.

| Tên File Core | Hành Động | Scope / Chức năng nhiệm vụ | Phase |
| :--- | :--- | :--- | :--- |
| `src/types.ts` | Nâng Cấp | Bơm Data Entities (`GenerationJob`, Schema version) | 1 |
| `src/lib/deepCompare.ts` | **Tạo Mới** | So sánh Object thuần (Bỏ Array Order, Null) | 1 |
| `src/lib/db.ts` | Đại Tu | Cài API Blob IndexDB, Viết hàm Lấy Blob -> Ra Base64 lúc truyền API | 1 |
| `src/lib/storage.ts`| Đại Tu | Chạy Backup v1 Key, Viết Script Migration Chunking | 1 |
| `page.tsx` & `Sidebar.tsx`| Đập Viết Lại | Router Lõi Mới / Quản lý Active View / Menu | 2 |
| `CreateStyleView.tsx` | Đập Viết Lại | Tách Box Upload song song với "AI Review Panel" | 2 |
| `LibraryView.tsx` | Nâng Cấp | Đổ Cấu trúc Grid Thư Viện có Tags và Card Cover | 2 |
| *(5 Files View Cũ)* | **Xoá Hệ Thống** | (Compare, Studio, Transfer, Edit, EvalForm) | 2 |
| `EditStyleView.tsx` | Cắt Rễ State | Ngắt State Cũ, Nối Logic Store DB Mới. Làm Box Simple/Adv | 3 |
| `GenerateView.tsx` | **Xây Mới Toàn Bộ** | Logic Merged Heuristic Prompt, Output Grid, UI Rating | 4 |
| `api/ai/route.ts` | Cắt Tỉa Lõi | Xoá các System Prompts V1, Ép trả cấu trúc `_analysis_meta` | 4 |
| `api/imagen/route.ts`| Tái Cấu Trúc | Khớp Request Chuẩn ở Mục 2.2 | 4 |
| `globals.css` | Sơn Lại | Flat Design, Tháo Glow. Làm Pro Tool. | 5 |

---

## 5. Quản Lý Rủi Ro Cốt Lõi & E2E Validation Gates

1.  **Vùng Tử Địa Migration (Phase 1):** Chống UI Freeze khi bung Base64 String lớn.
    *   **QA Gate:** Thread Migration xấp xỉ `< 300ms/Ảnh`. Bắt buộc dùng Array Chunking Timeout.
    *   **Fail Control:** Partial Migration. Ảnh 1 Lỗi => Cắm Flag Log Lỗi => Xóa Queue => Chạy ảnh 2. Hệ thống phải giữ trạng thái: Mọi ảnh lỗi đều được chỉ điểm, phần Trăm `Successful Migration` > 99%.
2.  **Khối U Ác Tính "Drift" (Phase 4):**
    *   Dùng ảnh Output làm Review sẽ làm loãng Entropy nghệ thuật. Chấp nhận hệ lụy này!
    *   **QA Gate:** Áp dụng Hard Limit 3 Ảnh Max vào DB để kéo giảm tốc độ thoái hóa. Trọng Số Array Base64 được Frontend gán chặt quy tắc "Gốc Original đứng Index đầu".
3.  **Sanitize Output Không Dùng AI Trung Gian (Phase 4):**
    *   **QA Gate:** Frontend Builder tuyệt đối không truyền dư Token rác (như `,,,` hoặc `undefined`). Việc "Rửa Text" ở đây do Script hàm JS dọn khoảng trắng, KHÔNG SỬ DỤNG Vòng Prompt Phụ gây bóp méo câu văn User. Prompt gửi đi mang đủ Khối `[STYLE]` và `[CONTENT]`.
4.  **End-To-End Khả Tính Lỗi Network (Phase 5):**
    *   **QA Gate 1:** Ép Timeout 503 HTTP lúc Cắm POST Generative AI: Giao diện bắn Toast Cảnh Báo Lỗi, bảo toàn Chữ Text User gõ trên Form. DB Update cờ Status Job sang `'error'` kèm string `Tmeout`. App Không Crash trắng xóa (White Scereen of Death).
    *   **QA Guidline:** Trong quá trình Load Mảng Blob Ảnh của Single Thư Viện, Khuyến Nghị Memory Browser Main Thread dao động ổn định (VD: ~250MB), Không gây tràn RAM. Đo đạc bằng DevTool Profile. 
