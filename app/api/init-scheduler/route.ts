import { NextRequest, NextResponse } from 'next/server';
import { startScheduler, stopScheduler, restartScheduler } from '@/lib/scheduler';

let schedulerStarted = false;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  try {
    if (action === 'restart') {
      console.log('🔄 Manual scheduler restart requested');
      restartScheduler();
      schedulerStarted = true;
      return NextResponse.json({ 
        message: 'Scheduler restarted successfully',
        action: 'restart',
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'stop') {
      console.log('🛑 Manual scheduler stop requested');
      stopScheduler();
      schedulerStarted = false;
      return NextResponse.json({ 
        message: 'Scheduler stopped successfully',
        action: 'stop',
        timestamp: new Date().toISOString()
      });
    }
    
    // Default: start scheduler
    if (!schedulerStarted) {
      console.log('🚀 Initial scheduler start requested');
      startScheduler();
      schedulerStarted = true;
      return NextResponse.json({ 
        message: 'Scheduler initialized successfully',
        action: 'start',
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({ 
      message: 'Scheduler already running',
      action: 'status',
      timestamp: new Date().toISOString(),
      running: true
    });
  } catch (error) {
    console.error('❌ Scheduler API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to manage scheduler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'restart') {
      console.log('🔄 POST scheduler restart requested');
      restartScheduler();
      schedulerStarted = true;
      return NextResponse.json({ 
        message: 'Scheduler restarted successfully via POST',
        action: 'restart',
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use action: "restart"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Scheduler POST API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process scheduler request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
