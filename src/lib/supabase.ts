import { createClient } from '@supabase/supabase-js';

// Provide dummy fallbacks so Next.js static prerendering doesn't crash during build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadImage(bucket: string, path: string, blob: Blob | Buffer, contentType: string) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, blob, {
        contentType,
        upsert: true
    });
    if (error) throw error;
    return data;
}

export async function downloadImage(bucket: string, path: string): Promise<Blob> {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    return data as Blob;
}

export async function deleteImage(bucket: string, path: string) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
}

export function getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}
