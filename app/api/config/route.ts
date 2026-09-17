import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById, updateUserConfig } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get environment configuration for frontend display
    const scanTimes = (process.env.SCAN_TIMES || '08:00,12:00,16:00,20:00')
      .split(',')
      .map(t => t.trim())
      .filter(time => {
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        const isValid = timeRegex.test(time);
        
        if (!isValid) {
          console.warn(`⚠️ Invalid scan time format: ${time}. Skipping.`);
          return false;
        }
        
        // Check if hour is valid (0-23)
        const [hours] = time.split(':').map(Number);
        if (hours < 0 || hours > 23) {
          console.warn(`⚠️ Invalid hour in scan time: ${time}. Skipping.`);
          return false;
        }
        
        return true;
      });

    const creditsPerJob = parseFloat(process.env.CREDITS_PER_JOB || '0.0667');
    const defaultCredits = parseFloat(process.env.DEFAULT_CREDITS || '100');
    const minCreditPurchase = parseFloat(process.env.MIN_CREDIT_PURCHASE || '50');
    const defaultLinkedinCount = parseInt(process.env.DEFAULT_LINKEDIN_COUNT || '15');
    const defaultNaukriCount = parseInt(process.env.DEFAULT_NAUKRI_COUNT || '15');

    return NextResponse.json({
      scanTimes,
      creditsPerJob,
      defaultCredits,
      minCreditPurchase,
      defaultLinkedinCount,
      defaultNaukriCount
    });
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { keywords, scanInterval, baseTime, useCustomSchedule } = await request.json();

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      );
    }

    if (!scanInterval || scanInterval < 0.167) {
      return NextResponse.json(
        { error: `Scan interval must be at least 10 minutes (0.167 hours)` },
        { status: 400 }
      );
    }

    // Validate baseTime format if custom schedule is enabled
    if (useCustomSchedule && baseTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(baseTime)) {
        return NextResponse.json(
          { error: 'Base time must be in HH:MM format' },
          { status: 400 }
        );
      }
    }

    await updateUserConfig(user.id, keywords, scanInterval, baseTime, useCustomSchedule);

    return NextResponse.json({
      message: 'Configuration updated successfully',
      keywords,
      scanInterval,
      baseTime,
      useCustomSchedule,
    });
  } catch (error) {
    console.error('Config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
