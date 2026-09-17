'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreditDisplay from '@/components/CreditDisplay';
import SearchForm from '@/components/SearchForm';
import JobCard from '@/components/JobCard';
import NextScanPopup from '@/components/NextScanPopup';

interface User {
  id: string;
  email: string;
  credits: number;
  keywords: string[];
  scanInterval: number;
  lastScanAt?: string;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  jobUrl: string;
  postUrl?: string;
  posterName?: string;
  posterProfileUrl?: string;
  source: 'linkedin' | 'naukri';
  postedDate?: string;
  
  // LinkedIn-specific rich data
  author?: {
    name: string;
    avatar?: string;
    linkedinUrl?: string;
    info?: string;
    publicIdentifier?: string;
  };
  job?: {
    title?: string;
    location?: string;
    subtitle?: string;
    logoUrl?: string;
    linkedinUrl?: string;
    buttonText?: string;
  };
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
  postedAgo?: string;
  content?: string;
  postImages?: string[];
  
  // Naukri-specific rich data
  salary?: string;
  experience?: string;
  skills?: string[];
  companyRating?: string;
  companyReviews?: number;
  logoUrl?: string;
  jobType?: string;
  isWalkIn?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchUser(token);
    
    // Initialize scheduler on first load
    fetch('/api/init-scheduler').catch(console.error);
  }, [router]);

  useEffect(() => {
    if (user && !showPopup) {
      const hasShownPopup = sessionStorage.getItem('shownScanPopup');
      if (!hasShownPopup) {
        setShowPopup(true);
        sessionStorage.setItem('shownScanPopup', 'true');
      }
    }
  }, [user]);

  const fetchUser = async (token: string) => {
    setLoading(true);
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
    } catch (err) {
      console.error(err);
      localStorage.removeItem('token');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (
    keywords: string, 
    linkedinCount: number, 
    naukriCount: number,
    sources: string[],
    datePosted?: string
  ) => {
    setSearchLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          keywords, 
          linkedinCount, 
          naukriCount,
          sources,
          datePosted 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setJobs(data.jobs);
      
      // Update user credits
      if (user) {
        setUser({ ...user, credits: data.remainingCredits });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('shownScanPopup');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showPopup && (
        <NextScanPopup
          lastScanAt={user.lastScanAt || null}
          scanInterval={user.scanInterval}
          onClose={() => setShowPopup(false)}
        />
      )}

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Job Search Portal</h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/scan-results"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Auto Scans
              </Link>
              <Link
                href="/config"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
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
        <div className="mb-6">
          <CreditDisplay credits={user.credits} />
        </div>

        <div className="mb-8">
          <SearchForm onSearch={handleSearch} loading={searchLoading} />
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {jobs.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Search Results ({jobs.length} jobs found)
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}

        {jobs.length === 0 && !searchLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Enter keywords above to search for jobs
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
