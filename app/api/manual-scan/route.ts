import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Import scheduler functions for manual testing
async function testSchedulerFunctions() {
  // Dynamically import to avoid issues with cron scheduling in API routes
  const { getUsersForScheduledScan, runDefaultScheduledScans, runCustomScheduledScans } = await import('@/lib/scheduler');
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  console.log(`🧪 Manual scan test triggered at ${currentTime}`);
  
  // Run both default and custom scans for current time
  await runDefaultScheduledScans(currentTime);
  await runCustomScheduledScans(currentTime);
  
  return {
    message: `Manual scan executed for time ${currentTime}`,
    currentTime,
    timestamp: now.toISOString()
  };
}

export async function POST(request: NextRequest) {
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

    const result = await testSchedulerFunctions();
    
    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Manual scan API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute manual scan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}