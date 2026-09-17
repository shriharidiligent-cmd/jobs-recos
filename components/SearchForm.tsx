'use client';

import { useState } from 'react';

interface SearchFormProps {
  onSearch: (
    keywords: string, 
    linkedinCount: number, 
    naukriCount: number,
    sources: string[],
    datePosted?: string
  ) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const defaultLinkedin = Math.max(15, parseInt(process.env.NEXT_PUBLIC_DEFAULT_LINKEDIN_COUNT || '15'));
  const defaultNaukri = Math.max(15, parseInt(process.env.NEXT_PUBLIC_DEFAULT_NAUKRI_COUNT || '15'));
  const CREDITS_PER_JOB = parseFloat(process.env.NEXT_PUBLIC_CREDITS_PER_JOB || '0.0667');
  
  const [keywords, setKeywords] = useState('');
  const [linkedinCount, setLinkedinCount] = useState(defaultLinkedin);
  const [naukriCount, setNaukriCount] = useState(defaultNaukri);
  const [sources, setSources] = useState<string[]>(['linkedin', 'naukri']);
  const [datePosted, setDatePosted] = useState('');

  const handleSourceChange = (source: string) => {
    if (sources.includes(source)) {
      setSources(sources.filter(s => s !== source));
    } else {
      setSources([...sources, source]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keywords.trim() && sources.length > 0) {
      onSearch(keywords, linkedinCount, naukriCount, sources, datePosted || undefined);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="space-y-4">
        <div>
          <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
            Search Keywords *
          </label>
          <input
            type="text"
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g., React Developer, Cybersecurity, Data Analyst"
            className="w-full text-gray-800 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Sources *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sources.includes('linkedin')}
                onChange={() => handleSourceChange('linkedin')}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">LinkedIn</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sources.includes('naukri')}
                onChange={() => handleSourceChange('naukri')}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Naukri</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="linkedin-count" className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn Results
            </label>
            <input
              type="number"
              id="linkedin-count"
              min="15"
              max="50"
              value={linkedinCount}
              onChange={(e) => setLinkedinCount(Math.max(15, parseInt(e.target.value) || 15))}
              disabled={!sources.includes('linkedin')}
              className="w-full text-gray-800 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="naukri-count" className="block text-sm font-medium text-gray-700 mb-2">
              Naukri Results
            </label>
            <input
              type="number"
              id="naukri-count"
              min="15"
              max="50"
              value={naukriCount}
              onChange={(e) => setNaukriCount(Math.max(15, parseInt(e.target.value) || 15))}
              disabled={!sources.includes('naukri')}
              className="w-full text-gray-800 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label htmlFor="date-posted" className="block text-sm font-medium text-gray-700 mb-2">
            Date Posted
          </label>
          <select
            id="date-posted"
            value={datePosted}
            onChange={(e) => setDatePosted(e.target.value)}
            className="w-full text-gray-800 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Any Time</option>
            <option value="24h">Past 24 Hours</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || sources.length === 0}
          className="w-full py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search Jobs'}
        </button>

        {sources.length === 0 && (
          <p className="text-sm text-red-600 text-center">
            Please select at least one job source
          </p>
        )}

        {/* Cost Information */}
        <div className="bg-blue-50 p-3 rounded-md">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800">
              Requesting up to {linkedinCount + naukriCount} jobs
            </span>
            <span className="text-blue-600 font-medium">
              Max cost: {((linkedinCount + naukriCount) * CREDITS_PER_JOB).toFixed(4)} credits
            </span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            💡 You only pay for jobs we actually find and deliver ({CREDITS_PER_JOB} credits per job)
          </p>
        </div>
      </div>
    </form>
  );
}
