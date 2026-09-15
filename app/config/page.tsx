'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  credits: number;
  keywords: string[];
  scanInterval: number;
  lastScanAt?: string;
}

export default function ConfigPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [keywords, setKeywords] = useState<string>('');
  const [scanInterval, setScanInterval] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchUser(token);
  }, [router]);

  const fetchUser = async (token: string) => {
    try {
      const res = await fetch('/api/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }

      const data = await res.json();
      setUser(data.user);
      setKeywords(data.user.keywords.join(', '));
      setScanInterval(data.user.scanInterval);
    } catch (err) {
      console.error(err);
      localStorage.removeItem('token');
      router.push('/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const keywordsArray = keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      if (keywordsArray.length === 0) {
        throw new Error('Please enter at least one keyword');
      }

      const token = localStorage.getItem('token');
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          keywords: keywordsArray,
          scanInterval,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update configuration');
      }

      setSuccess('Configuration updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Automatic Scan Configuration
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
                Keywords for Automatic Scans
              </label>
              <input
                type="text"
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., React Developer, Cybersecurity, Data Analyst"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Separate multiple keywords with commas
              </p>
            </div>

            <div>
              <label htmlFor="scanInterval" className="block text-sm font-medium text-gray-700 mb-2">
                Scan Interval (hours)
              </label>
              <select
                id="scanInterval"
                value={scanInterval}
                onChange={(e) => setScanInterval(parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="0.5">30 minutes</option>
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
              </select>
              <p className="mt-2 text-sm text-gray-500">
                How often should the system automatically scan for new jobs?
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Automatic scans will use these keywords and will consume 5 credits per scan.
                Make sure you have sufficient credits to avoid interruptions.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Current Status
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium text-gray-700">Email:</span>{' '}
                <span className="text-gray-600">{user.email}</span>
              </p>
              <p>
                <span className="font-medium text-gray-700">Credits:</span>{' '}
                <span className="text-gray-600">{user.credits}</span>
              </p>
              <p>
                <span className="font-medium text-gray-700">Active Keywords:</span>{' '}
                <span className="text-gray-600">
                  {user.keywords.length > 0 ? user.keywords.join(', ') : 'None'}
                </span>
              </p>
              <p>
                <span className="font-medium text-gray-700">Scan Interval:</span>{' '}
                <span className="text-gray-600">Every {user.scanInterval} hour{user.scanInterval !== 1 ? 's' : ''}</span>
              </p>
              {user.lastScanAt && (
                <p>
                  <span className="font-medium text-gray-700">Last Scan:</span>{' '}
                  <span className="text-gray-600">
                    {new Date(user.lastScanAt).toLocaleString()}
                  </span>
                </p>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                System Scan Times
              </h4>
              <p className="text-xs text-gray-600">
                Automatic scans run daily at: 8:00 AM, 12:00 PM, 4:00 PM, 8:00 PM
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
