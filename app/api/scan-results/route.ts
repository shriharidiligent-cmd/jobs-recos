import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken, getUserById } from '@/lib/auth';

// Generate user's scan times for a day based on base_time and interval
function generateUserScanTimes(baseTime: string, intervalHours: number): number[] {
  const [baseHours, baseMinutes] = baseTime.split(':').map(Number);
  const baseTimeInMinutes = baseHours * 60 + baseMinutes;
  const intervalMinutes = intervalHours * 60;
  
  const scanTimes: number[] = [];
  let currentTime = baseTimeInMinutes;
  
  // Generate all scan times for the day (24 hours)
  while (currentTime < 24 * 60) {
    const hours = Math.floor(currentTime / 60);
    scanTimes.push(hours);
    currentTime += intervalMinutes;
  }
  
  return scanTimes;
}

// Get expected scan times for user
function getUserExpectedScanTimes(user: any): number[] {
  if (!user.use_custom_schedule) {
    // Default system times
    const defaultTimes = (process.env.SCAN_TIMES || '08:00,12:00,16:00,20:00')
      .split(',')
      .map(t => parseInt(t.split(':')[0]));
    return defaultTimes;
  }
  
  if (!user.base_time) {
    return []; // No scan times if custom schedule but no base time
  }
  
  return generateUserScanTimes(user.base_time, user.scan_interval);
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const tokenData = verifyToken(token);
    
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = tokenData.userId;
    
    console.log('Fetching scan results for user:', userId);
    
    // Get user data to determine expected scan times
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get user's expected scan times
    const expectedScanTimes = getUserExpectedScanTimes(user);

    const url = new URL(request.url);
    const date = url.searchParams.get('date'); // Format: YYYY-MM-DD

    let query = supabaseAdmin
      .from('scan_results')
      .select('*')
      .eq('user_id', userId)
      .order('scan_time', { ascending: false });

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query = query
        .gte('scan_time', startDate.toISOString())
        .lt('scan_time', endDate.toISOString());
    } else {
      // Default to today if no date provided
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      
      query = query
        .gte('scan_time', startOfDay.toISOString())
        .lt('scan_time', endOfDay.toISOString());
    }

    // Get all scan results for the date, ordered by most recent first
    const { data: scanResults, error } = await query.order('scan_time', { ascending: false });

    if (error) {
      console.error('Error fetching scan results:', error);
      return NextResponse.json({ error: 'Failed to fetch scan results' }, { status: 500 });
    }

    return NextResponse.json({ 
      scanResults: scanResults || [],
      date: date || new Date().toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Scan results API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}