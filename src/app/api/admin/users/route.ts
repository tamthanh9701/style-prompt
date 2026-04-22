import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service_role key for admin operations
function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Verify the caller is an admin
async function verifyAdmin(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return false;

    const token = authHeader.replace('Bearer ', '');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = createClient(url, anonKey);

    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return false;

    const { data: profile } = await client.from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    return profile?.role === 'admin';
}

// GET: List all user profiles
export async function GET(request: NextRequest) {
    if (!(await verifyAdmin(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admin = getAdminClient();
    const { data, error } = await admin.from('user_profiles').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users: data });
}

// POST: Create a new user
export async function POST(request: NextRequest) {
    if (!(await verifyAdmin(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, role, display_name } = body;

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const admin = getAdminClient();

    // Create user in Supabase Auth with role in metadata
    const { data: userData, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: role || 'user', display_name: display_name || '' },
    });

    if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Update profile with correct role and display_name (trigger may have already created row)
    if (userData.user) {
        await admin.from('user_profiles').upsert({
            id: userData.user.id,
            email,
            role: role || 'user',
            display_name: display_name || null,
        });
    }

    return NextResponse.json({ success: true, user: userData.user });
}

// DELETE: Delete a user
export async function DELETE(request: NextRequest) {
    if (!(await verifyAdmin(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
