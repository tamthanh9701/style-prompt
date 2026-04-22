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
    // Use getUser() to get a fresh session verified from the server (not local cache)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

// Extract role directly from a session/user object (no extra API call)
export function getRoleFromSession(user: { user_metadata?: Record<string, unknown> } | null | undefined): UserRole {
    const role = user?.user_metadata?.role;
    if (role === 'admin') return 'admin';
    return 'user';
}

export async function getUserRole(userId: string): Promise<UserRole> {
    // Primary: get fresh user from server and read role from metadata
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const role = getRoleFromSession(user);
        if (role === 'admin') return 'admin';
    }

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
