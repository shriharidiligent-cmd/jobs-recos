'use client';

interface CreditDisplayProps {
  credits: number;
}

export default function CreditDisplay({ credits }: CreditDisplayProps) {
  const CREDITS_PER_SEARCH = parseInt(process.env.NEXT_PUBLIC_CREDITS_PER_SEARCH || '5');
  const RUPEES_PER_CREDIT = parseInt(process.env.NEXT_PUBLIC_RUPEES_PER_CREDIT || '2');
  const costPerSearch = CREDITS_PER_SEARCH * RUPEES_PER_CREDIT;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Available Credits</p>
          <p className="text-2xl font-bold text-blue-600">{credits}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Cost per search</p>
          <p className="text-sm font-semibold text-gray-700">
            {CREDITS_PER_SEARCH} credits (₹{costPerSearch})
          </p>
        </div>
      </div>
    </div>
  );
}
