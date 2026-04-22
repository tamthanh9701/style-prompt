import { supabase } from './supabase';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    display_name: string | null;
    created_at: string;
}

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function getUserRole(userId: string): Promise<UserRole> {
    // Primary: read role from JWT user_metadata (avoids circular RLS issue)
    const { data: { session } } = await supabase.auth.getSession();
    const metaRole = session?.user?.user_metadata?.role;
    if (metaRole === 'admin' || metaRole === 'user') return metaRole as UserRole;

    // Fallback: query user_profiles table
    const { data, error } = await supabase.from('user_profiles').select('role').eq('id', userId).maybeSingle();
    if (error || !data) return 'user';
    return data.role as UserRole;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
    if (error || !data) return null;
    return data as UserProfile;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
}
