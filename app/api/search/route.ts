import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById, updateUserCredits } from '@/lib/auth';
import { scrapeJobs } from '@/lib/apify';

const CREDITS_PER_JOB = parseFloat(process.env.CREDITS_PER_JOB || '0.0667');

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

    // Scrape jobs first to know how many we got
    const jobs = await scrapeJobs(keywords, linkedinCount, naukriCount, sources, datePosted);
    
    // Calculate credits needed based on jobs delivered
    const creditsNeeded = jobs.length * CREDITS_PER_JOB;
    
    console.log(`🔍 Search by user ${user.email}: Found ${jobs.length} jobs, need ${creditsNeeded.toFixed(4)} credits, user has ${user.credits} credits`);
    
    // Check if user has enough credits for the jobs we found
    if (user.credits < creditsNeeded) {
      return NextResponse.json(
        { 
          error: `Insufficient credits. Need ${creditsNeeded.toFixed(4)} credits for ${jobs.length} jobs, but you have ${user.credits} credits.`,
          jobsFound: jobs.length,
          creditsNeeded: creditsNeeded,
          creditsAvailable: user.credits
        },
        { status: 402 }
      );
    }

    // Deduct credits based on jobs delivered
    const remainingCredits = user.credits - creditsNeeded;
    console.log(`💳 Deducting ${creditsNeeded.toFixed(4)} credits from user ${user.email}. New balance: ${remainingCredits.toFixed(4)}`);
    
    // Update credits in database
    await updateUserCredits(user.id, remainingCredits);
    
    // Verify the update worked by fetching the user again
    const updatedUser = await getUserById(user.id);
    console.log(`✅ Verification - User ${user.email} credits after update: ${updatedUser?.credits}`);

    return NextResponse.json({
      jobs,
      jobsDelivered: jobs.length,
      creditsPerJob: CREDITS_PER_JOB,
      creditsUsed: creditsNeeded,
      remainingCredits: remainingCredits,
      verifiedCredits: updatedUser?.credits, // Add this for debugging
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search jobs' },
      { status: 500 }
    );
  }
}
