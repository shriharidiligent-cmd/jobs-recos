import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../../../lib/supabase';

interface TokenPayload {
  userId: string;
  email: string;
}

const MIN_CREDIT_PURCHASE = parseInt(process.env.MIN_CREDIT_PURCHASE || '50');

export async function POST(request: NextRequest) {
  try {
    const { creditsToAdd } = await request.json();

    if (!creditsToAdd || typeof creditsToAdd !== 'number' || creditsToAdd < MIN_CREDIT_PURCHASE) {
      return NextResponse.json(
        { 
          error: `Minimum credit purchase is ${MIN_CREDIT_PURCHASE} credits`,
          minPurchase: MIN_CREDIT_PURCHASE
        },
        { status: 400 }
      );
    }

    // Get user from JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: TokenPayload;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get current user credits
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('credits, email')
      .eq('id', decoded.userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentCredits = userData.credits || 0;
    const newCreditsTotal = currentCredits + creditsToAdd;

    // Update user credits
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ credits: newCreditsTotal })
      .eq('id', decoded.userId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return NextResponse.json(
        { error: 'Failed to add credits' },
        { status: 500 }
      );
    }

    // Log the credit addition
    console.log(`✅ Added ${creditsToAdd} credits to user ${userData.email}. New balance: ${newCreditsTotal}`);

    // TODO: In a real application, this is where you would:
    // 1. Process payment through Razorpay/Stripe/PayPal
    // 2. Verify payment status
    // 3. Only add credits after successful payment
    // 4. Log transaction in a separate transactions table

    return NextResponse.json({
      success: true,
      message: `Successfully added ${creditsToAdd} credits`,
      creditsAdded: creditsToAdd,
      previousCredits: currentCredits,
      newCreditsTotal: newCreditsTotal,
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Mock transaction ID
    });

  } catch (error) {
    console.error('Error in add credits endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get credit pricing information
export async function GET(request: NextRequest) {
  try {
    const creditsPerJob = parseFloat(process.env.CREDITS_PER_JOB || '0.0667');
    const minPurchase = parseInt(process.env.MIN_CREDIT_PURCHASE || '50');
    
    // Calculate how many jobs the minimum purchase gives
    const jobsFromMinPurchase = Math.floor(minPurchase / creditsPerJob);
    
    return NextResponse.json({
      success: true,
      pricing: {
        creditsPerJob: creditsPerJob,
        minCreditPurchase: minPurchase,
        jobsFromMinPurchase: jobsFromMinPurchase,
        example: {
          credits50: {
            credits: 50,
            approximateJobs: Math.floor(50 / creditsPerJob)
          },
          credits100: {
            credits: 100,
            approximateJobs: Math.floor(100 / creditsPerJob)
          },
          credits200: {
            credits: 200,
            approximateJobs: Math.floor(200 / creditsPerJob)
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in get pricing endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}