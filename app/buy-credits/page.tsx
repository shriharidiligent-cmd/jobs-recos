'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CreditPackage {
  credits: number;
  approximateJobs: number;
  popular?: boolean;
}

interface PricingInfo {
  creditsPerJob: number;
  minCreditPurchase: number;
  jobsFromMinPurchase: number;
  example: {
    credits50: CreditPackage;
    credits100: CreditPackage;
    credits200: CreditPackage;
  };
}

export default function BuyCreditsPage() {
  const [user, setUser] = useState<any>(null);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [customCredits, setCustomCredits] = useState(50);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchUser();
    fetchPricing();
  }, [router]);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/add-credits');
      if (response.ok) {
        const data = await response.json();
        setPricing(data.pricing);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseCredits = async (credits: number) => {
    setPurchasing(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/add-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ creditsToAdd: credits }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Successfully added ${data.creditsAdded} credits! New balance: ${data.newCreditsTotal}`);
        
        // Update user state
        if (user) {
          setUser({ ...user, credits: data.newCreditsTotal });
        }
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Failed to purchase credits');
    } finally {
      setPurchasing(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading credit packages...</p>
        </div>
      </div>
    );
  }

  if (!user || !pricing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Unable to load credit information</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">💳 Buy Credits</h1>
            <p className="mt-1 text-sm text-gray-600">
              Purchase credits to continue searching for jobs
            </p>
          </div>

          <div className="p-6">
            {/* Current Balance */}
            <div className="bg-blue-50 p-4 rounded-md mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Current Balance</h3>
                  <p className="text-2xl font-bold text-blue-900">{user.credits.toFixed(4)} Credits</p>
                  <p className="text-xs text-blue-700">
                    ≈ {Math.floor(user.credits / pricing.creditsPerJob)} jobs available
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-800">Cost per job</p>
                  <p className="text-lg font-semibold text-blue-900">{pricing.creditsPerJob} credits</p>
                </div>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className="mb-6 p-4 rounded-md bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-800">{message}</p>
              </div>
            )}

            {/* Credit Packages */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* 50 Credits Package */}
              <div className="border border-gray-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Starter</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">{pricing.example.credits50.credits}</p>
                <p className="text-sm text-gray-600 mb-4">Credits</p>
                <p className="text-sm text-gray-500 mb-4">
                  ≈ {pricing.example.credits50.approximateJobs} jobs
                </p>
                <button
                  onClick={() => purchaseCredits(pricing.example.credits50.credits)}
                  disabled={purchasing}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {purchasing ? 'Processing...' : 'Purchase'}
                </button>
              </div>

              {/* 100 Credits Package - Popular */}
              <div className="border-2 border-blue-500 rounded-lg p-6 text-center relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Popular
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Standard</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">{pricing.example.credits100.credits}</p>
                <p className="text-sm text-gray-600 mb-4">Credits</p>
                <p className="text-sm text-gray-500 mb-4">
                  ≈ {pricing.example.credits100.approximateJobs} jobs
                </p>
                <button
                  onClick={() => purchaseCredits(pricing.example.credits100.credits)}
                  disabled={purchasing}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {purchasing ? 'Processing...' : 'Purchase'}
                </button>
              </div>

              {/* 200 Credits Package */}
              <div className="border border-gray-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">{pricing.example.credits200.credits}</p>
                <p className="text-sm text-gray-600 mb-4">Credits</p>
                <p className="text-sm text-gray-500 mb-4">
                  ≈ {pricing.example.credits200.approximateJobs} jobs
                </p>
                <button
                  onClick={() => purchaseCredits(pricing.example.credits200.credits)}
                  disabled={purchasing}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {purchasing ? 'Processing...' : 'Purchase'}
                </button>
              </div>
            </div>

            {/* Custom Amount */}
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Amount</h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credits (minimum {pricing.minCreditPurchase})
                  </label>
                  <input
                    type="number"
                    min={pricing.minCreditPurchase}
                    value={customCredits}
                    onChange={(e) => setCustomCredits(Math.max(pricing.minCreditPurchase, parseInt(e.target.value) || pricing.minCreditPurchase))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ≈ {Math.floor(customCredits / pricing.creditsPerJob)} jobs
                  </p>
                </div>
                <button
                  onClick={() => purchaseCredits(customCredits)}
                  disabled={purchasing || customCredits < pricing.minCreditPurchase}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {purchasing ? 'Processing...' : 'Purchase'}
                </button>
              </div>
            </div>

            {/* Information */}
            <div className="bg-yellow-50 p-4 rounded-md mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-500 text-xl">💡</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">How Credits Work</h3>
                  <div className="mt-1 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>You pay {pricing.creditsPerJob} credits per job delivered (not per search)</li>
                      <li>If a search finds 30 jobs, you pay 30 × {pricing.creditsPerJob} = {(30 * pricing.creditsPerJob).toFixed(4)} credits</li>
                      <li>No jobs found = no credits charged</li>
                      <li>Credits never expire</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

      

            {/* Navigation */}
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}