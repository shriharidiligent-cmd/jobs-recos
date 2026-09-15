import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById, updateUserCredits } from '@/lib/auth';
import { scrapeJobs } from '@/lib/apify';

const CREDITS_PER_SEARCH = parseInt(process.env.CREDITS_PER_SEARCH || '5');
const RUPEES_PER_CREDIT = parseInt(process.env.RUPEES_PER_CREDIT || '2');

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

    const { 
      keywords, 
      linkedinCount = parseInt(process.env.DEFAULT_LINKEDIN_COUNT || '15'), 
      naukriCount = parseInt(process.env.DEFAULT_NAUKRI_COUNT || '15'),
      sources = ['linkedin', 'naukri'],
      datePosted
    } = await request.json();

    if (!keywords || keywords.trim() === '') {
      return NextResponse.json(
        { error: 'Keywords are required' },
        { status: 400 }
      );
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: 'At least one source must be selected' },
        { status: 400 }
      );
    }

    // Check credits
    if (user.credits < CREDITS_PER_SEARCH) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      );
    }

    // Scrape jobs
    const jobs = await scrapeJobs(keywords, linkedinCount, naukriCount, sources, datePosted);

    // Deduct credits
    await updateUserCredits(user.id, user.credits - CREDITS_PER_SEARCH);

    return NextResponse.json({
      jobs,
      creditsUsed: CREDITS_PER_SEARCH,
      costInRupees: CREDITS_PER_SEARCH * RUPEES_PER_CREDIT,
      remainingCredits: user.credits - CREDITS_PER_SEARCH,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search jobs' },
      { status: 500 }
    );
  }
}
