'use client';

import Link from 'next/link';

interface CreditDisplayProps {
  credits: number;
}

export default function CreditDisplay({ credits }: CreditDisplayProps) {
  const CREDITS_PER_JOB = parseFloat(process.env.NEXT_PUBLIC_CREDITS_PER_JOB || '0.0667');
  const approximateJobs = Math.floor(credits / CREDITS_PER_JOB);
  
  // Round credits to 4 decimal places for display
  const displayCredits = Math.round(credits * 10000) / 10000;
  
  // Determine color based on credit level
  const getCreditsColor = () => {
    if (credits < 10) return 'text-red-600';
    if (credits < 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Available Credits</p>
          <p className={`text-2xl font-bold ${getCreditsColor()}`}>
            {displayCredits.toFixed(4)}
          </p>
          
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Cost per job</p>
          <p className="text-sm font-semibold text-gray-700">
            {CREDITS_PER_JOB} credits
          </p>
          <Link
            href="/buy-credits"
            className="mt-2 inline-block px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Buy Credits
          </Link>
        </div>
      </div>
      
      {credits < 10 && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-700">
            ⚠️ Low credits! Purchase more to continue searching.
          </p>
        </div>
      )}
    </div>
  );
}
