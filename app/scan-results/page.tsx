'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import JobCard from '@/components/JobCard';

interface ScanResult {
  id: string;
  scan_time: string;
  scan_hour: number;
  keywords: string;
  job_data: any[];
  jobs_count: number;
  sources: string[];
  created_at: string;
}

export default function ScanResultsPage() {
  const router = useRouter();
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchScanResults(selectedDate);
  }, [router, selectedDate]);

  const fetchScanResults = async (date: string) => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/scan-results?date=${date}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch scan results');
      }

      const data = await res.json();
      setScanResults(data.scanResults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatScanTime = (scanTime: string) => {
    return new Date(scanTime).toLocaleString();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scan results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Automatic Scan Results</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/config" className="text-sm text-gray-600 hover:text-gray-900">
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Selector */}
        <div className="mb-6">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Select Date:
          </label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {scanResults.length > 0 ? (
          <div>
            {/* Summary */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                Scan Results Summary
              </h3>
              <p className="text-sm text-blue-800">
                {scanResults.length} scan{scanResults.length !== 1 ? 's' : ''} found with{' '}
                {scanResults.reduce((total, scan) => total + scan.jobs_count, 0)} total jobs
              </p>
            </div>

            {/* All Scans */}
            <div className="space-y-8">
              {scanResults.map((scan) => (
                <div key={scan.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Scan at {formatScanTime(scan.scan_time)}
                      </h2>
                      <div className="text-sm text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                          {scan.jobs_count} job{scan.jobs_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <span>Keywords: {scan.keywords}</span>
                      <span className="ml-4">Sources: {scan.sources.join(', ')}</span>
                    </div>
                  </div>

                  <div className="p-6">
                    {scan.job_data && scan.job_data.length > 0 ? (
                      <div className="grid gap-6 md:grid-cols-2">
                        {scan.job_data.map((job, index) => (
                          <JobCard key={`${scan.id}-${index}`} job={job} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p>No jobs found in this scan</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scan results found</h3>
            <p className="text-gray-500">
              No automatic scans were performed on this date. 
              {selectedDate === new Date().toISOString().split('T')[0] ? (
                <span className="block mt-2">
                  Scans run automatically based on your schedule. Check your{' '}
                  <Link href="/config" className="text-blue-600 hover:text-blue-700">
                    settings
                  </Link>{' '}
                  to configure scan times.
                </span>
              ) : null}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}