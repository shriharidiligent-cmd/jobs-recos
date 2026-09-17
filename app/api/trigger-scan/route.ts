import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Import the scheduler functions (we need to make them available)
// For now, let's create a simple test function

const CREDITS_PER_JOB = parseFloat(process.env.CREDITS_PER_JOB || '0.0667');
const DEFAULT_LINKEDIN_COUNT = parseInt(process.env.DEFAULT_LINKEDIN_COUNT || '15');
const DEFAULT_NAUKRI_COUNT = parseInt(process.env.DEFAULT_NAUKRI_COUNT || '15');

export async function POST(request: NextRequest) {
  try {
    // Verify admin/test access
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { scanType = 'default', testUserId } = await request.json();

    console.log(`🧪 Manual scan trigger requested: ${scanType}`);

    // Get users for testing
    let query = supabaseAdmin
      .from('users')
      .select('id, email, keywords, scan_interval, base_time, use_custom_schedule, last_scan_at, credits')
      .not('keywords', 'eq', '{}')
      .gte('credits', 0);

    if (testUserId) {
      query = query.eq('id', testUserId);
    }

    const { data: users, error } = await query.limit(5); // Limit for testing

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch users', details: error }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        message: 'No eligible users found for testing',
        criteria: 'Users must have keywords configured and credits > 0'
      });
    }

    const results = [];
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    for (const user of users) {
      const result = {
        userId: user.id,
        email: user.email,
        credits: user.credits,
        keywords: user.keywords,
        scanType: user.use_custom_schedule ? 'custom' : 'default',
        processed: false,
        reason: '',
        jobsFound: 0,
        creditsUsed: 0
      };

      // Check basic eligibility
      if (!user.keywords || user.keywords.length === 0) {
        result.reason = 'No keywords configured';
        results.push(result);
        continue;
      }

      // Estimate credit requirement (assume average 20 jobs)
      const estimatedJobs = 20;
      const estimatedCredits = estimatedJobs * CREDITS_PER_JOB;
      
      if (user.credits < estimatedCredits) {
        result.reason = `Insufficient credits (has ${user.credits}, estimated need ${estimatedCredits.toFixed(4)} for ~${estimatedJobs} jobs)`;
        results.push(result);
        continue;
      }

      result.processed = true;
      result.reason = 'Eligible for automatic scanning';
      results.push(result);
    }

    return NextResponse.json({
      success: true,
      message: `Analyzed ${users.length} users for scan eligibility`,
      currentTime,
      scanType,
      results,
      summary: {
        total: users.length,
        eligible: results.filter(r => r.processed).length,
        ineligible: results.filter(r => !r.processed).length
      }
    });

  } catch (error) {
    console.error('Manual scan trigger error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}