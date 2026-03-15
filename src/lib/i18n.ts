// ============================================================
// i18n - Vietnamese & English translations
// ============================================================

export type Locale = 'vi' | 'en';

const LOCALE_KEY = 'style_prompt_locale';

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'vi';
  return (localStorage.getItem(LOCALE_KEY) as Locale) || 'vi';
}

export function setLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_KEY, locale);
  }
}

type TranslationKeys = {
  // Nav
  nav_title: string;
  nav_settings: string;
  nav_new_style: string;

  // Library
  lib_title: string;
  lib_subtitle: string;
  lib_empty_title: string;
  lib_empty_desc: string;
  lib_empty_btn: string;
  lib_images: string;

  // Create
  create_title: string;
  create_subtitle: string;
  create_style_name: string;
  create_style_name_placeholder: string;
  create_drop_title: string;
  create_drop_desc: string;
  create_analyze_btn: string;
  create_analyzing: string;
  create_analyzing_title: string;
  create_analyzing_desc: string;
  create_upload_warning: string;

  // Edit
  edit_subtitle: string;
  edit_improve_btn: string;
  edit_save_btn: string;
  edit_tab_editor: string;
  edit_tab_output: string;
  edit_tab_json: string;
  edit_subject_type: string;
  edit_live_preview: string;
  edit_copy: string;
  edit_fill_fields: string;
  edit_positive: string;
  edit_negative: string;
  edit_json_prompt: string;
  edit_copy_json: string;
  edit_raw_json: string;
  edit_gen_params: string;
  edit_no_content: string;
  edit_saved: string;
  edit_copied: string;
  edit_copy_failed: string;
  edit_fields: string;

  // Compare
  compare_title: string;
  compare_subtitle: string;
  compare_ref_images: string;
  compare_gen_images: string;
  compare_drop_gen: string;
  compare_prompt_used: string;
  compare_prompt_placeholder: string;
  compare_btn: string;
  compare_analyzing: string;
  compare_analyzing_title: string;
  compare_analyzing_desc: string;
  compare_results: string;
  compare_similarity: string;
  compare_current: string;
  compare_suggested: string;
  compare_apply_btn: string;
  compare_applied: string;
  compare_upload_warning: string;
  compare_review_title: string;
  compare_original: string;
  compare_improved: string;
  compare_accept: string;
  compare_reject: string;
  compare_accept_all: string;
  compare_no_diff: string;

  // Settings
  settings_title: string;
  settings_subtitle: string;
  settings_active_provider: string;
  settings_api_key: string;
  settings_base_url: string;
  settings_model: string;
  settings_save_btn: string;
  settings_cancel: string;
  settings_saved: string;
  settings_test_btn: string;
  settings_testing: string;
  settings_test_ok: string;
  settings_test_fail: string;
  settings_enter_key: string;

  // Language
  lang_label: string;

  // Back
  back_library: string;
  back_editor: string;

  // Subject types
  st_character: string;
  st_animal: string;
  st_object: string;
  st_product: string;
  st_scene: string;
  st_architecture: string;
  st_food: string;
  st_vehicle: string;
  st_nature: string;
  st_abstract: string;
  st_other: string;

  // Style created
  style_created: string;
  style_deleted: string;

  // General
  select_placeholder: string;

  // Analysis result
  analysis_complete: string;
  analysis_summary: string;
  analysis_fields_detected: string;
  analysis_view_edit: string;

  // Generate variant
  generate_title: string;
  generate_subtitle: string;
  generate_btn: string;
  generate_detecting: string;
  generate_detecting_title: string;
  generate_detecting_desc: string;
  generate_required: string;
  generate_recommended: string;
  generate_optional: string;
  generate_style_locked: string;
  generate_result_title: string;
  generate_copy_prompt: string;
  generate_copy_json: string;
  generate_new_variant: string;
  generate_fill_required: string;
  generate_style_summary: string;
};

const translations: Record<Locale, TranslationKeys> = {
  vi: {
    nav_title: 'Thư Viện Prompt',
    nav_settings: '⚙️ Cài đặt',
    nav_new_style: '+ Tạo mới',

    lib_title: 'Thư Viện Style',
    lib_subtitle: 'Bộ sưu tập các style hình ảnh đã phân tích và prompt có cấu trúc',
    lib_empty_title: 'Chưa có style nào',
    lib_empty_desc: 'Tải ảnh mẫu lên và để AI phân tích style để tạo prompt có cấu trúc.',
    lib_empty_btn: '+ Tạo Style Đầu Tiên',
    lib_images: 'ảnh',

    create_title: 'Tạo Style Mới',
    create_subtitle: 'Tải ảnh mẫu lên và để AI phân tích style',
    create_style_name: 'Tên Style',
    create_style_name_placeholder: 'VD: Cyberpunk Noir, Giấc Mơ Màu Nước...',
    create_drop_title: 'Kéo thả ảnh vào đây hoặc nhấn để chọn',
    create_drop_desc: 'Tải ảnh mẫu đại diện cho style bạn muốn phân tích',
    create_analyze_btn: '🔍 Phân Tích Style bằng AI',
    create_analyzing: 'Đang phân tích...',
    create_analyzing_title: 'AI đang phân tích ảnh của bạn...',
    create_analyzing_desc: 'Quá trình có thể mất 30-60 giây tùy thuộc vào số ảnh và nhà cung cấp AI.',
    create_upload_warning: 'Vui lòng tải lên ít nhất một ảnh',

    edit_subtitle: 'Chỉnh sửa thông số prompt để kiểm soát quá trình tạo ảnh',
    edit_improve_btn: '🔄 Cải thiện Prompt',
    edit_save_btn: '💾 Lưu',
    edit_tab_editor: '📝 Trình soạn thảo',
    edit_tab_output: '📋 JSON Prompt',
    edit_tab_json: '{ } Raw JSON',
    edit_subject_type: 'Loại Chủ Thể',
    edit_live_preview: '📋 Xem Trước Prompt',
    edit_copy: 'Sao chép',
    edit_fill_fields: 'Điền các trường để tạo prompt...',
    edit_positive: 'Prompt Chính',
    edit_negative: 'Prompt Loại Trừ',
    edit_json_prompt: 'JSON Prompt — Sẵn sàng sao chép',
    edit_copy_json: '📋 Sao chép JSON Prompt',
    edit_raw_json: 'Raw JSON đầy đủ',
    edit_gen_params: '⚙️ Thông Số Tạo Ảnh (Metadata)',
    edit_no_content: 'Chưa có nội dung. Hãy chỉnh sửa các trường để tạo prompt.',
    edit_saved: 'Đã lưu prompt!',
    edit_copied: 'Đã sao chép!',
    edit_copy_failed: 'Sao chép thất bại',
    edit_fields: 'trường',

    compare_title: 'Cải Thiện Prompt',
    compare_subtitle: 'Tải ảnh đã tạo bằng AI lên để so sánh với style mẫu và nhận đề xuất cải thiện',
    compare_ref_images: '🖼️ Ảnh Style Mẫu',
    compare_gen_images: '🤖 Ảnh Đã Tạo',
    compare_drop_gen: 'Kéo thả ảnh đã tạo vào đây',
    compare_prompt_used: '📝 Prompt Đã Sử Dụng',
    compare_prompt_placeholder: 'Dán prompt bạn đã dùng để tạo ảnh...',
    compare_btn: '🔍 So Sánh & Phân Tích',
    compare_analyzing: 'Đang phân tích...',
    compare_analyzing_title: 'AI đang so sánh ảnh...',
    compare_analyzing_desc: 'Đang phân tích sự khác biệt giữa ảnh style mẫu và ảnh đã tạo...',
    compare_results: '📊 Kết Quả Phân Tích',
    compare_similarity: 'Tương Đồng',
    compare_current: 'Hiện tại',
    compare_suggested: 'Đề xuất',
    compare_apply_btn: '✨ Áp Dụng Các Đề Xuất Đã Chọn',
    compare_applied: 'Đã áp dụng đề xuất cải thiện!',
    compare_upload_warning: 'Tải ảnh đã tạo lên để so sánh',
    compare_review_title: '🔄 Xem Lại & Chọn Đề Xuất',
    compare_original: 'Giá trị hiện tại',
    compare_improved: 'Đề xuất cải thiện',
    compare_accept: 'Chấp nhận',
    compare_reject: 'Bỏ qua',
    compare_accept_all: 'Chọn tất cả',
    compare_no_diff: 'Không có khác biệt đáng kể',

    settings_title: 'Cài Đặt AI Provider',
    settings_subtitle: 'Cấu hình API key và model cho nhà cung cấp AI',
    settings_active_provider: 'Provider Đang Dùng',
    settings_api_key: 'API Key',
    settings_base_url: 'Base URL',
    settings_model: 'Model',
    settings_save_btn: '💾 Lưu Cài Đặt',
    settings_cancel: 'Hủy',
    settings_saved: 'Đã lưu cài đặt!',
    settings_test_btn: '🧪 Test',
    settings_testing: 'Đang test...',
    settings_test_ok: '✅ Kết nối thành công!',
    settings_test_fail: '❌ Kết nối thất bại: ',
    settings_enter_key: 'Nhập API Key trước khi test',

    lang_label: '🌐 Ngôn ngữ',

    back_library: '← Về Thư Viện',
    back_editor: '← Về Trình Soạn Thảo',

    st_character: '🧑 Nhân vật',
    st_animal: '🐾 Động vật',
    st_object: '📦 Vật thể',
    st_product: '🏷️ Sản phẩm',
    st_scene: '🏙️ Bối cảnh',
    st_architecture: '🏛️ Kiến trúc',
    st_food: '🍽️ Đồ ăn',
    st_vehicle: '🚗 Phương tiện',
    st_nature: '🌿 Thiên nhiên',
    st_abstract: '🎨 Trừu tượng',
    st_other: '📌 Khác',

    style_created: 'Đã tạo style thành công!',
    style_deleted: 'Đã xóa style',

    select_placeholder: '— Chọn —',

    analysis_complete: '✅ Phân tích hoàn tất!',
    analysis_summary: 'AI đã phân tích style và tạo prompt có cấu trúc.',
    analysis_fields_detected: 'thông số được phát hiện',
    analysis_view_edit: '📝 Xem & Chỉnh Sửa Prompt',

    generate_title: '🖼️ Tạo Ảnh Mới',
    generate_subtitle: 'Nhập nội dung variant để tạo ảnh mới cùng style đã phân tích',
    generate_btn: '✨ Tạo Prompt Cho Ảnh Mới',
    generate_detecting: 'AI đang phân tích...',
    generate_detecting_title: 'AI đang xác định các trường cần nhập...',
    generate_detecting_desc: 'AI sẽ hướng dẫn bạn nhập những thông số cần thiết để tạo ảnh với style này.',
    generate_required: 'Bắt buộc',
    generate_recommended: 'Nên có',
    generate_optional: 'Tùy chọn',
    generate_style_locked: '🔒 Style cố định (từ phân tích)',
    generate_result_title: '✅ Prompt Đã Tạo',
    generate_copy_prompt: '📋 Sao chép JSON Prompt',
    generate_copy_json: '📋 Sao chép',
    generate_new_variant: '↩️ Tạo Variant Mới',
    generate_fill_required: 'Vui lòng điền các trường bắt buộc',
    generate_style_summary: '🎨 Phong cách đã cố định',
  },

  en: {
    nav_title: 'Style Prompt Library',
    nav_settings: '⚙️ Settings',
    nav_new_style: '+ New Style',

    lib_title: 'Style Library',
    lib_subtitle: 'Your collection of analyzed image styles and structured prompts',
    lib_empty_title: 'No styles yet',
    lib_empty_desc: 'Upload reference images and let AI analyze their style to create structured prompts.',
    lib_empty_btn: '+ Create Your First Style',
    lib_images: 'images',

    create_title: 'Create New Style',
    create_subtitle: 'Upload reference images and let AI analyze their style',
    create_style_name: 'Style Name',
    create_style_name_placeholder: 'e.g., Cyberpunk Noir, Watercolor Dreams...',
    create_drop_title: 'Drop images here or click to browse',
    create_drop_desc: 'Upload reference images that represent the style you want to analyze',
    create_analyze_btn: '🔍 Analyze Style with AI',
    create_analyzing: 'Analyzing...',
    create_analyzing_title: 'AI is analyzing your images...',
    create_analyzing_desc: 'This may take 30-60 seconds depending on the number of images and your AI provider.',
    create_upload_warning: 'Please upload at least one image',

    edit_subtitle: 'Edit prompt parameters to control image generation',
    edit_improve_btn: '🔄 Improve Prompt',
    edit_save_btn: '💾 Save',
    edit_tab_editor: '📝 Visual Editor',
    edit_tab_output: '📋 JSON Prompt',
    edit_tab_json: '{ } Raw JSON',
    edit_subject_type: 'Subject Type',
    edit_live_preview: '📋 Live Prompt Preview',
    edit_copy: 'Copy',
    edit_fill_fields: 'Fill in fields to generate prompt...',
    edit_positive: 'Positive Prompt',
    edit_negative: 'Negative Prompt',
    edit_json_prompt: 'JSON Prompt — Ready to Copy',
    edit_copy_json: '📋 Copy JSON Prompt',
    edit_raw_json: 'Raw JSON (Full)',
    edit_gen_params: '⚙️ Generation Parameters (Metadata)',
    edit_no_content: 'No prompt content yet. Edit fields to generate.',
    edit_saved: 'Prompt saved!',
    edit_copied: 'Copied to clipboard!',
    edit_copy_failed: 'Failed to copy',
    edit_fields: 'fields',

    compare_title: 'Improve Prompt',
    compare_subtitle: 'Upload AI-generated images to compare with reference style and get improvement suggestions',
    compare_ref_images: '🖼️ Reference Style Images',
    compare_gen_images: '🤖 Generated Images',
    compare_drop_gen: 'Drop generated images here',
    compare_prompt_used: '📝 Prompt Used for Generation',
    compare_prompt_placeholder: 'Paste the prompt you used to generate the images...',
    compare_btn: '🔍 Compare & Analyze',
    compare_analyzing: 'Analyzing...',
    compare_analyzing_title: 'AI is comparing images...',
    compare_analyzing_desc: 'Analyzing differences between reference style and generated images...',
    compare_results: '📊 Analysis Results',
    compare_similarity: 'Similarity',
    compare_current: 'Current',
    compare_suggested: 'Suggested',
    compare_apply_btn: '✨ Apply Selected Suggestions',
    compare_applied: 'Suggested improvements applied!',
    compare_upload_warning: 'Upload generated images to compare',
    compare_review_title: '🔄 Review & Select Suggestions',
    compare_original: 'Current Value',
    compare_improved: 'Suggested Improvement',
    compare_accept: 'Accept',
    compare_reject: 'Skip',
    compare_accept_all: 'Select All',
    compare_no_diff: 'No significant differences found',

    settings_title: 'AI Provider Settings',
    settings_subtitle: 'Configure your AI provider API keys and models',
    settings_active_provider: 'Active Provider',
    settings_api_key: 'API Key',
    settings_base_url: 'Base URL',
    settings_model: 'Model',
    settings_save_btn: '💾 Save Settings',
    settings_cancel: 'Cancel',
    settings_saved: 'Settings saved!',
    settings_test_btn: '🧪 Test',
    settings_testing: 'Testing...',
    settings_test_ok: '✅ Connection successful!',
    settings_test_fail: '❌ Connection failed: ',
    settings_enter_key: 'Enter an API Key before testing',

    lang_label: '🌐 Language',

    back_library: '← Back to Library',
    back_editor: '← Back to Editor',

    st_character: '🧑 Character',
    st_animal: '🐾 Animal',
    st_object: '📦 Object',
    st_product: '🏷️ Product',
    st_scene: '🏙️ Scene',
    st_architecture: '🏛️ Architecture',
    st_food: '🍽️ Food',
    st_vehicle: '🚗 Vehicle',
    st_nature: '🌿 Nature',
    st_abstract: '🎨 Abstract',
    st_other: '📌 Other',

    style_created: 'Style created successfully!',
    style_deleted: 'Style deleted',

    select_placeholder: '— Select —',

    analysis_complete: '✅ Analysis complete!',
    analysis_summary: 'AI has analyzed the style and generated a structured prompt.',
    analysis_fields_detected: 'fields detected',
    analysis_view_edit: '📝 View & Edit Prompt',

    generate_title: '🖼️ Create New Image',
    generate_subtitle: 'Enter variant content to create a new image in the same analyzed style',
    generate_btn: '✨ Generate Prompt for New Image',
    generate_detecting: 'AI is analyzing...',
    generate_detecting_title: 'AI is identifying required input fields...',
    generate_detecting_desc: 'AI will guide you on what to fill in to create a new image in this style.',
    generate_required: 'Required',
    generate_recommended: 'Recommended',
    generate_optional: 'Optional',
    generate_style_locked: '🔒 Style locked (from analysis)',
    generate_result_title: '✅ Prompt Generated',
    generate_copy_prompt: '📋 Copy JSON Prompt',
    generate_copy_json: '📋 Copy',
    generate_new_variant: '↩️ Create New Variant',
    generate_fill_required: 'Please fill in all required fields',
    generate_style_summary: '🎨 Style locked',
  },
};

export function t(locale: Locale, key: keyof TranslationKeys): string {
  return translations[locale][key] || translations.en[key] || key;
}

export type { TranslationKeys };

// ============================================================
// Group & Field Labels (Localized)
// ============================================================

export type LocalizedGroupMeta = {
  key: string;
  label: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    description: string;
    placeholder: string;
  }>;
};

const GROUP_LABELS_VI: Record<string, { label: string; description: string }> = {
  subject: { label: 'Chủ Thể', description: 'Chủ thể chính của hình ảnh' },
  subject_character: { label: 'Chi Tiết Nhân Vật', description: 'Thuộc tính riêng cho nhân vật/động vật' },
  subject_object: { label: 'Chi Tiết Vật Thể', description: 'Thuộc tính riêng cho vật thể/sản phẩm' },
  environment: { label: 'Môi Trường', description: 'Bối cảnh và nền' },
  composition: { label: 'Bố Cục', description: 'Khung hình và góc máy' },
  lighting: { label: 'Ánh Sáng', description: 'Nguồn sáng và hiệu ứng' },
  color_palette: { label: 'Bảng Màu', description: 'Màu sắc và tông màu' },
  artistic_style: { label: 'Phong Cách Nghệ Thuật', description: 'Chất liệu và phong cách tham chiếu' },
  mood_atmosphere: { label: 'Tâm Trạng & Bầu Không Khí', description: 'Cảm xúc và bầu không khí' },
  material_texture: { label: 'Chất Liệu & Kết Cấu', description: 'Bề mặt vật liệu và kết cấu' },
  technical_quality: { label: 'Chất Lượng Kỹ Thuật', description: 'Độ phân giải và chi tiết' },
  camera_lens: { label: 'Máy Ảnh & Ống Kính', description: 'Thông số máy ảnh và ống kính' },
  post_processing: { label: 'Hậu Kỳ', description: 'Hiệu ứng xử lý sau chụp' },
  negative_prompt: { label: 'Prompt Loại Trừ', description: 'Các yếu tố cần tránh trong hình ảnh' },
  generation_params: { label: 'Thông Số Tạo Ảnh', description: 'Cài đặt kỹ thuật (không bao gồm trong prompt)' },
};

const FIELD_LABELS_VI: Record<string, Record<string, { label: string; description: string; placeholder: string }>> = {
  subject: {
    main_subject: { label: 'Chủ Thể Chính', description: 'Chủ thể chính', placeholder: 'VD: cô gái trẻ, máy ảnh cổ điển, phong cảnh núi' },
    quantity: { label: 'Số Lượng', description: 'Số lượng chủ thể', placeholder: 'VD: một, hai, một nhóm' },
    subject_details: { label: 'Chi Tiết', description: 'Thông tin bổ sung về chủ thể', placeholder: 'VD: mặc váy đỏ, có hoa văn tinh xảo' },
    size_scale: { label: 'Kích Thước / Tỷ Lệ', description: 'Kích thước hoặc tỷ lệ chủ thể', placeholder: 'VD: kích thước thật, thu nhỏ, khổng lồ' },
    orientation_placement: { label: 'Hướng / Vị Trí', description: 'Vị trí trong khung hình', placeholder: 'VD: ở giữa, lệch phải, ở tiền cảnh' },
  },
  subject_character: {
    pose_action: { label: 'Tư Thế / Hành Động', description: 'Tư thế hoặc hành động', placeholder: 'VD: đứng tự tin, chạy, ngồi xếp bằng' },
    expression_emotion: { label: 'Biểu Cảm / Cảm Xúc', description: 'Biểu cảm khuôn mặt', placeholder: 'VD: nụ cười bí ẩn, ánh mắt sắc sảo, cười lớn' },
    clothing_accessories: { label: 'Trang Phục & Phụ Kiện', description: 'Trang phục và phụ kiện', placeholder: 'VD: áo da, bông tai neon, đồng hồ bạc' },
    body_features: { label: 'Đặc Điểm Cơ Thể', description: 'Đặc điểm ngoại hình', placeholder: 'VD: thể hình vận động, cao, cánh tay máy' },
    hair_style: { label: 'Kiểu Tóc', description: 'Mô tả kiểu tóc', placeholder: 'VD: tóc đỏ dài bay, tóc ngắn undercut, tết bím' },
    age_appearance: { label: 'Tuổi / Ngoại Hình', description: 'Tuổi và ngoại hình tổng thể', placeholder: 'VD: thanh niên, người già, thiếu niên' },
    ethnicity_skin_tone: { label: 'Sắc Tộc / Tông Da', description: 'Tông da hoặc sắc tộc', placeholder: 'VD: da ngăm, trắng, ô liu' },
  },
  subject_object: {
    object_state: { label: 'Trạng Thái', description: 'Trạng thái hiện tại', placeholder: 'VD: mới tinh, đang chuyển động, ăn dở' },
    object_condition: { label: 'Tình Trạng', description: 'Tình trạng vật lý', placeholder: 'VD: nguyên vẹn, phong hóa, gỉ sét' },
    brand_label: { label: 'Thương Hiệu / Nhãn', description: 'Thương hiệu hoặc nhãn', placeholder: 'VD: Leica, Apple, generic' },
    arrangement_layout: { label: 'Sắp Xếp', description: 'Cách sắp xếp vật thể', placeholder: 'VD: flat lay, xếp chồng, rải rác' },
    interaction: { label: 'Tương Tác', description: 'Tương tác với yếu tố khác', placeholder: 'VD: tay cầm, bay lơ lửng, đặt trên bề mặt' },
  },
  environment: {
    setting: { label: 'Bối Cảnh', description: 'Bối cảnh chính', placeholder: 'VD: phố mưa, rừng phép thuật, studio' },
    location_type: { label: 'Loại Địa Điểm', description: 'Loại địa điểm', placeholder: 'VD: trong nhà, ngoài trời, dưới nước, vũ trụ' },
    time_of_day: { label: 'Thời Gian Trong Ngày', description: 'Thời gian trong ngày', placeholder: 'VD: giờ vàng, nửa đêm, bình minh' },
    weather: { label: 'Thời Tiết', description: 'Điều kiện thời tiết', placeholder: 'VD: mưa lớn, sương mù, trời quang, tuyết rơi' },
    season: { label: 'Mùa', description: 'Mùa', placeholder: 'VD: thu, hạ, đông' },
    era_time_period: { label: 'Thời Đại', description: 'Thời kỳ lịch sử', placeholder: 'VD: thập niên 1920, trung cổ, tương lai' },
    background_elements: { label: 'Yếu Tố Nền', description: 'Chi tiết hậu cảnh', placeholder: 'VD: biển quảng cáo hologram, núi, sao' },
    foreground_elements: { label: 'Yếu Tố Tiền Cảnh', description: 'Chi tiết tiền cảnh', placeholder: 'VD: vũng nước, lá rụng, hơi nước' },
    ground_surface: { label: 'Mặt Đất', description: 'Mô tả mặt đất', placeholder: 'VD: đá cuội ướt, cỏ, đụn cát' },
    sky_description: { label: 'Bầu Trời', description: 'Mô tả bầu trời', placeholder: 'VD: hoàng hôn rực rỡ, đêm đầy sao, u ám' },
  },
  composition: {
    framing: { label: 'Khung Hình', description: 'Kiểu khung hình', placeholder: 'VD: cận cảnh, trung cảnh, toàn thân, góc rộng' },
    camera_angle: { label: 'Góc Máy', description: 'Góc nhìn', placeholder: 'VD: góc thấp, ngang tầm mắt, nhìn từ trên, góc nghiêng' },
    perspective: { label: 'Phối Cảnh', description: 'Loại phối cảnh', placeholder: 'VD: một điểm tụ, mắt cá, isometric' },
    depth_of_field: { label: 'Độ Sâu Trường Ảnh', description: 'Cài đặt DOF', placeholder: 'VD: DOF mỏng, lấy nét sâu, tilt-shift' },
    focal_point: { label: 'Điểm Lấy Nét', description: 'Phần được lấy nét', placeholder: 'VD: mắt chủ thể, giữa khung hình' },
    composition_rule: { label: 'Quy Tắc Bố Cục', description: 'Nguyên tắc bố cục', placeholder: 'VD: quy tắc phần ba, tỷ lệ vàng, ở giữa' },
    symmetry: { label: 'Đối Xứng', description: 'Loại đối xứng', placeholder: 'VD: đối xứng, bất đối xứng, xuyên tâm' },
    negative_space: { label: 'Khoảng Trống', description: 'Sử dụng không gian trống', placeholder: 'VD: nhiều khoảng trống, tối thiểu, đông đúc' },
    crop_style: { label: 'Kiểu Cắt Xén', description: 'Kiểu crop', placeholder: 'VD: crop sát, crop lỏng, full frame' },
  },
  lighting: {
    primary_light_source: { label: 'Nguồn Sáng Chính', description: 'Đèn chính', placeholder: 'VD: ánh mặt trời, đèn neon, nến, đèn studio' },
    light_direction: { label: 'Hướng Ánh Sáng', description: 'Ánh sáng đến từ đâu', placeholder: 'VD: chiếu bên, ngược sáng, từ trên' },
    light_quality: { label: 'Chất Lượng Ánh Sáng', description: 'Chất lượng ánh sáng', placeholder: 'VD: mềm mại, gắt, khuếch tán, lốm đốm' },
    light_color_temperature: { label: 'Nhiệt Độ Màu', description: 'Ánh sáng ấm hay lạnh', placeholder: 'VD: ấm 3200K, lạnh 6500K, hỗn hợp' },
    shadow_type: { label: 'Loại Bóng', description: 'Loại bóng đổ', placeholder: 'VD: tương phản sâu, mềm, ambient occlusion' },
    shadow_intensity: { label: 'Cường Độ Bóng', description: 'Mức độ bóng đổ', placeholder: 'VD: nhẹ, mạnh, không có' },
    special_lighting_effects: { label: 'Hiệu Ứng Đặc Biệt', description: 'Hiệu ứng ánh sáng đặc biệt', placeholder: 'VD: volumetric, god rays, lens flare' },
    ambient_light: { label: 'Ánh Sáng Môi Trường', description: 'Ánh sáng bao quanh', placeholder: 'VD: mờ nhạt, sáng tràn, phát sáng' },
    light_count: { label: 'Số Nguồn Sáng', description: 'Số lượng nguồn sáng', placeholder: 'VD: một nguồn, ba điểm, nhiều nguồn' },
  },
  color_palette: {
    dominant_colors: { label: 'Màu Chủ Đạo', description: 'Các màu chính trong ảnh', placeholder: 'Nhập màu rồi nhấn Enter' },
    color_scheme_type: { label: 'Sơ Đồ Màu', description: 'Hài hòa màu sắc', placeholder: 'VD: bổ sung, tương đồng, đơn sắc, tam giác' },
    saturation_level: { label: 'Độ Bão Hòa', description: 'Độ bão hòa màu', placeholder: 'VD: bão hòa cao, trầm, nhạt' },
    contrast_level: { label: 'Độ Tương Phản', description: 'Mức tương phản', placeholder: 'VD: tương phản cao, thấp, trung bình' },
    color_mood: { label: 'Tông Màu Cảm Xúc', description: 'Cảm xúc từ màu sắc', placeholder: 'VD: ấm áp, lạnh lẽo, tối tăm' },
    color_grading: { label: 'Chỉnh Màu', description: 'Xử lý màu hậu kỳ', placeholder: 'VD: teal & orange, cross-processed, bleach bypass' },
    tonal_range: { label: 'Dải Tông Màu', description: 'Phạm vi tông', placeholder: 'VD: toàn dải, high key, low key' },
  },
  artistic_style: {
    medium: { label: 'Chất Liệu', description: 'Chất liệu nghệ thuật', placeholder: 'VD: sơn dầu, ảnh chụp, 3D render, màu nước' },
    art_movement: { label: 'Trường Phái', description: 'Phong trào nghệ thuật', placeholder: 'VD: ấn tượng, cyberpunk, art nouveau, siêu thực' },
    style_reference: { label: 'Tham Chiếu Style', description: 'Nghệ sĩ hoặc tác phẩm tham chiếu', placeholder: 'VD: Greg Rutkowski, Studio Ghibli, Blade Runner' },
    surface_texture: { label: 'Kết Cấu Bề Mặt', description: 'Kết cấu bề mặt', placeholder: 'VD: mịn, nét cọ sơn dầu, hạt phim' },
    rendering_style: { label: 'Phong Cách Render', description: 'Cách thể hiện', placeholder: 'VD: photorealistic, cách điệu, cel-shaded, phẳng' },
    level_of_abstraction: { label: 'Mức Trừu Tượng', description: 'Thực tế vs trừu tượng', placeholder: 'VD: siêu thực, bán trừu tượng, trừu tượng hoàn toàn' },
  },
  mood_atmosphere: {
    overall_mood: { label: 'Tâm Trạng Tổng Thể', description: 'Tâm trạng chung', placeholder: 'VD: bí ẩn, vui vẻ, u buồn, hoành tráng' },
    narrative_context: { label: 'Bối Cảnh Câu Chuyện', description: 'Câu chuyện nền', placeholder: 'VD: chiến binh cô độc, buổi sáng yên bình' },
    energy_level: { label: 'Mức Năng Lượng', description: 'Năng lượng động', placeholder: 'VD: bình tĩnh, năng động, hỗn loạn, thanh thản' },
    atmosphere_effects: { label: 'Hiệu Ứng Bầu Không Khí', description: 'Hạt khí quyển', placeholder: 'VD: sương mù, khói, bụi, hơi nước, đom đóm' },
    emotional_tone: { label: 'Giọng Cảm Xúc', description: 'Cảm giác cảm xúc', placeholder: 'VD: hoài cổ, hy vọng, u ám, kỳ ảo' },
  },
  material_texture: {
    primary_material: { label: 'Chất Liệu Chính', description: 'Vật liệu chính', placeholder: 'VD: kim loại chải, đá cẩm thạch, gỗ, vải' },
    secondary_material: { label: 'Chất Liệu Phụ', description: 'Vật liệu bổ sung', placeholder: 'VD: kính, viền vàng, da' },
    surface_finish: { label: 'Lớp Phủ Bề Mặt', description: 'Lớp hoàn thiện', placeholder: 'VD: mờ, bóng, satin, thô' },
    reflectivity: { label: 'Độ Phản Xạ', description: 'Mức độ phản xạ', placeholder: 'VD: không phản xạ, như gương, ánh nhẹ' },
    transparency: { label: 'Độ Trong Suốt', description: 'Mức trong suốt', placeholder: 'VD: đục, bán trong, trong suốt, mờ' },
    pattern_detail: { label: 'Hoa Văn / Chi Tiết', description: 'Hoa văn bề mặt', placeholder: 'VD: hoa văn, hình học, paisley, trơn' },
    wear_aging: { label: 'Độ Mòn / Cũ', description: 'Tuổi và độ mòn', placeholder: 'VD: patina cổ điển, mới tinh, phong hóa, gỉ sét' },
  },
  technical_quality: {
    resolution_quality: { label: 'Độ Phân Giải', description: 'Chất lượng đầu ra', placeholder: 'VD: 4K, 8K, ultra HD, độ phân giải cao' },
    detail_level: { label: 'Mức Độ Chi Tiết', description: 'Lượng chi tiết', placeholder: 'VD: chi tiết cao, tinh xảo, siêu mịn, tối giản' },
    sharpness: { label: 'Độ Sắc Nét', description: 'Độ nét hình ảnh', placeholder: 'VD: sắc nét tuyệt đối, mềm, nét chọn lọc' },
    noise_grain: { label: 'Nhiễu / Hạt', description: 'Hạt phim hoặc nhiễu', placeholder: 'VD: sạch, hạt phim, nhiễu nhẹ' },
    render_engine: { label: 'Engine Render', description: 'Engine dựng hình', placeholder: 'VD: Octane, Unreal Engine 5, V-Ray, Blender' },
  },
  camera_lens: {
    lens_type: { label: 'Loại Ống Kính', description: 'Ống kính máy ảnh', placeholder: 'VD: 85mm chân dung, 24mm góc rộng, 50mm, macro' },
    aperture: { label: 'Khẩu Độ', description: 'Giá trị khẩu độ', placeholder: 'VD: f/1.4, f/2.8, f/8, f/16' },
    shutter_speed_effect: { label: 'Hiệu Ứng Tốc Độ Màn Trập', description: 'Hiệu ứng chuyển động', placeholder: 'VD: đóng băng, nhòe chuyển động, phơi sáng dài' },
    iso_effect: { label: 'Hiệu Ứng ISO', description: 'Hiệu ứng nhiễu ISO', placeholder: 'VD: sạch ISO thấp, nhiều hạt ISO cao' },
    film_stock: { label: 'Loại Phim', description: 'Mô phỏng phim', placeholder: 'VD: Kodak Portra 400, Fuji Velvia 50, Ilford HP5' },
    filter_on_lens: { label: 'Kính Lọc', description: 'Kính lọc vật lý', placeholder: 'VD: polarizer, ND filter, star filter' },
  },
  post_processing: {
    vignette: { label: 'Vignette', description: 'Tối viền', placeholder: 'VD: vignette nhẹ, vignette nặng, không có' },
    bloom_glow: { label: 'Bloom / Phát Sáng', description: 'Hiệu ứng sáng vùng highlight', placeholder: 'VD: bloom mềm, phát sáng neon, không có' },
    chromatic_aberration: { label: 'Sắc Sai', description: 'Tách màu viền', placeholder: 'VD: sắc sai nhẹ, nặng, không có' },
    lens_distortion: { label: 'Méo Ống Kính', description: 'Méo hình ống kính', placeholder: 'VD: barrel, pincushion, không có' },
    color_filter: { label: 'Bộ Lọc Màu', description: 'Lớp phủ bộ lọc màu', placeholder: 'VD: ấm cổ điển, xanh lạnh, sepia, không có' },
    grain_overlay: { label: 'Lớp Phủ Hạt', description: 'Hiệu ứng hạt thêm', placeholder: 'VD: hạt phim 35mm, nhiễu số, không có' },
    sharpening: { label: 'Làm Sắc Nét', description: 'Mức độ làm sắc nét', placeholder: 'VD: làm sắc mạnh, nhẹ, không có' },
  },
  negative_prompt: {
    avoid_elements: { label: 'Tránh Các Yếu Tố', description: 'Những thứ cần loại bỏ', placeholder: 'VD: watermark, chữ, viền' },
    avoid_styles: { label: 'Tránh Phong Cách', description: 'Phong cách cần tránh', placeholder: 'VD: hoạt hình, anime, pixel art' },
    avoid_artifacts: { label: 'Tránh Lỗi AI', description: 'Lỗi AI cần tránh', placeholder: 'VD: thừa ngón tay, giải phẫu sai' },
    avoid_quality: { label: 'Tránh Lỗi Chất Lượng', description: 'Vấn đề chất lượng cần tránh', placeholder: 'VD: mờ, độ phân giải thấp, nhiễu' },
  },
  generation_params: {
    aspect_ratio: { label: 'Tỷ Lệ Khung Hình', description: 'Tỷ lệ ảnh', placeholder: 'VD: 16:9, 1:1, 9:16, 4:3' },
    seed: { label: 'Seed', description: 'Seed ngẫu nhiên để tái tạo', placeholder: 'Để trống cho ngẫu nhiên' },
    steps: { label: 'Số Bước', description: 'Số bước tạo ảnh', placeholder: 'VD: 20, 30, 50' },
    cfg_scale: { label: 'CFG Scale', description: 'Classifier-free guidance', placeholder: 'VD: 7.0, 7.5, 12.0' },
    sampler: { label: 'Sampler', description: 'Phương pháp lấy mẫu', placeholder: 'VD: DPM++ 2M Karras, Euler a' },
    model_recommendation: { label: 'Model Đề Xuất', description: 'Model AI đề xuất', placeholder: 'VD: SDXL, Midjourney v6, DALL-E 3' },
  },
};

/**
 * Get localized label for a group key
 */
export function getGroupLabel(locale: Locale, groupKey: string): { label: string; description: string } {
  if (locale === 'vi' && GROUP_LABELS_VI[groupKey]) {
    return GROUP_LABELS_VI[groupKey];
  }
  // Return empty — caller uses English default from PROMPT_GROUPS
  return { label: '', description: '' };
}

/**
 * Get localized label for a field within a group
 */
export function getFieldLabel(locale: Locale, groupKey: string, fieldKey: string): { label: string; description: string; placeholder: string } {
  if (locale === 'vi' && FIELD_LABELS_VI[groupKey]?.[fieldKey]) {
    return FIELD_LABELS_VI[groupKey][fieldKey];
  }
  return { label: '', description: '', placeholder: '' };
}
