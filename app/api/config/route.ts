import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById, updateUserConfig } from '@/lib/auth';

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

    const { keywords, scanInterval } = await request.json();

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      );
    }

    if (!scanInterval || scanInterval < 0.5) {
      return NextResponse.json(
        { error: `Scan interval must be at least 0.5 hours` },
        { status: 400 }
      );
    }

    await updateUserConfig(user.id, keywords, scanInterval);

    return NextResponse.json({
      message: 'Configuration updated successfully',
      keywords,
      scanInterval,
    });
  } catch (error) {
    console.error('Config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
