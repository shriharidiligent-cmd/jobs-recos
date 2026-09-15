import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByEmail,
  verifyPassword,
  generateToken,
} from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user with password
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !userData) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, userData.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken(userData.id);

    return NextResponse.json({
      token,
      user: {
        id: userData.id,
        email: userData.email,
        credits: userData.credits,
        keywords: userData.keywords || [],
        scanInterval: userData.scan_interval,
        lastScanAt: userData.last_scan_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
