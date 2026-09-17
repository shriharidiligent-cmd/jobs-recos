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
  baseTime?: string;
  useCustomSchedule?: boolean;
  lastScanAt?: string;
}

interface EnvConfig {
  scanTimes: string[];
  creditsPerJob: number;
  defaultCredits: number;
  minCreditPurchase: number;
  defaultLinkedinCount: number;
  defaultNaukriCount: number;
}

export default function ConfigPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null);
  const [keywords, setKeywords] = useState<string>('');
  const [scanInterval, setScanInterval] = useState<number>(2);
  const [intervalTime, setIntervalTime] = useState<string>('02:00'); // HH:MM format for interval
  const [baseTime, setBaseTime] = useState<string>('09:00');
  const [useCustomSchedule, setUseCustomSchedule] = useState<boolean>(false);
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
    fetchEnvConfig();
  }, [router]);

  const fetchEnvConfig = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'GET',
      });

      if (res.ok) {
        const config = await res.json();
        setEnvConfig(config);
      } else {
        console.warn('Failed to fetch environment config, using defaults');
        // Set fallback defaults if API fails
        setEnvConfig({
          scanTimes: ['08:00', '12:00', '16:00', '20:00'],
          creditsPerJob: 0.0667,
          defaultCredits: 100,
          minCreditPurchase: 50,
          defaultLinkedinCount: 15,
          defaultNaukriCount: 15
        });
      }
    } catch (err) {
      console.error('Error fetching env config:', err);
      // Set fallback defaults if API fails
      setEnvConfig({
        scanTimes: ['08:00', '12:00', '16:00', '20:00'],
        creditsPerJob: 0.0667,
        defaultCredits: 100,
        minCreditPurchase: 50,
        defaultLinkedinCount: 15,
        defaultNaukriCount: 15
      });
    }
  };

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
      setBaseTime(data.user.baseTime || '09:00');
      setUseCustomSchedule(data.user.useCustomSchedule || false);
      
      // Convert interval hours to HH:MM format
      const interval = data.user.scanInterval;
      const hours = Math.floor(interval);
      const minutes = Math.round((interval - hours) * 60);
      setIntervalTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      
      console.log('Loaded user config:', {
        useCustomSchedule: data.user.useCustomSchedule,
        baseTime: data.user.baseTime,
        scanInterval: data.user.scanInterval,
        calculatedIntervalTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      });
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

      // Parse interval time when using custom schedule
      let finalScanInterval = scanInterval;
      if (useCustomSchedule) {
        finalScanInterval = parseIntervalTime(intervalTime);
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
          scanInterval: finalScanInterval,
          baseTime: useCustomSchedule ? baseTime : null,
          useCustomSchedule,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update configuration');
      }

      setSuccess('Configuration updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Update local state with parsed interval
      setScanInterval(finalScanInterval);
      
      // Refresh user data to show updated info
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        fetchUser(currentToken);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = () => {
    setUseCustomSchedule(false);
    setBaseTime('09:00');
    setScanInterval(2);
    setIntervalTime('02:00');
  };

  // Convert time format (HH:MM) to hours (decimal)
  const parseIntervalTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error('Invalid time format. Use HH:MM format (00:00 to 23:59)');
    }
    
    const totalHours = hours + (minutes / 60);
    
    if (totalHours < 0.167) { // Less than 10 minutes
      throw new Error('Minimum interval is 10 minutes (00:10)');
    }
    
    if (totalHours > 24) {
      throw new Error('Maximum interval is 24 hours (24:00)');
    }
    
    return totalHours;
  };

  if (!user || !envConfig) {
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
            <div className="flex items-center space-x-4">
              <Link
                href="/scan-results"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Auto Scans
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to Dashboard
              </Link>
            </div>
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
                className="w-full text-gray-800 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Separate multiple keywords with commas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Scan Schedule
              </label>
              
              <div className="space-y-4">
                {/* Schedule Type Selection */}
                <div className="flex items-start space-x-4">
                  <div className="flex items-center">
                    <input
                      id="default-schedule"
                      name="schedule-type"
                      type="radio"
                      checked={!useCustomSchedule}
                      onChange={() => setUseCustomSchedule(false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="default-schedule" className="ml-2 text-sm text-gray-700">
                      Use Default Schedule
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="custom-schedule"
                      name="schedule-type"
                      type="radio"
                      checked={useCustomSchedule}
                      onChange={() => setUseCustomSchedule(true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="custom-schedule" className="ml-2 text-sm text-gray-700">
                      Use Custom Schedule
                    </label>
                  </div>
                </div>

                {/* Default Schedule Info */}
                {!useCustomSchedule && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <p className="text-sm text-gray-600">
                      <strong>Default Schedule:</strong> Scans run daily at {envConfig.scanTimes.map(time => {
                        const [hours, minutes] = time.split(':').map(Number);
                        const period = hours >= 12 ? 'PM' : 'AM';
                        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
                        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                      }).join(', ')}
                    </p>
                  </div>
                )}

                {/* Custom Schedule Options */}
                {useCustomSchedule && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="baseTime" className="block text-sm font-medium text-gray-700 mb-2">
                          Starting Time
                        </label>
                        <input
                          type="time"
                          id="baseTime"
                          value={baseTime}
                          onChange={(e) => setBaseTime(e.target.value)}
                          className="w-full text-gray-800 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="intervalTime" className="block text-sm font-medium text-gray-700 mb-2">
                          Scan Interval
                        </label>
                        <input
                          type="time"
                          id="intervalTime"
                          value={intervalTime}
                          onChange={(e) => setIntervalTime(e.target.value)}
                          min="00:10"
                          max="24:00"
                          step="60" // 1 minute steps
                          className="w-full text-gray-800 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="mt-2 text-xs text-gray-600">
                          <p className="font-medium mb-1">How to use:</p>
                          <div className="space-y-1">
                            <p>• <span className="font-mono bg-gray-100 px-1 rounded">00:10</span> = Every 10 minutes</p>
                            <p>• <span className="font-mono bg-gray-100 px-1 rounded">00:30</span> = Every 30 minutes</p>
                            <p>• <span className="font-mono bg-gray-100 px-1 rounded">01:00</span> = Every 1 hour</p>
                            <p>• <span className="font-mono bg-gray-100 px-1 rounded">02:30</span> = Every 2.5 hours</p>
                          </div>
                          <p className="mt-2 text-gray-500">Range: 10 minutes to 24 hours</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-blue-800">
                      <strong>Preview:</strong> Starting at {baseTime}, scans will run every {(() => {
                        const [hours, minutes] = intervalTime.split(':').map(Number);
                        const totalHours = hours + (minutes / 60);
                        
                        if (totalHours < 1) {
                          return `${hours * 60 + minutes} minutes`;
                        } else if (totalHours === Math.floor(totalHours)) {
                          return `${Math.floor(totalHours)} hour${Math.floor(totalHours) !== 1 ? 's' : ''}`;
                        } else {
                          return `${totalHours} hours`;
                        }
                      })()}
                      {(() => {
                        const [baseHours, baseMinutes] = baseTime.split(':').map(Number);
                        const baseTimeInMinutes = baseHours * 60 + baseMinutes;
                        
                        const [intervalHours, intervalMinutes] = intervalTime.split(':').map(Number);
                        const intervalInMinutes = intervalHours * 60 + intervalMinutes;
                        
                        if (intervalInMinutes === 0) return '';
                        
                        const times = [];
                        let currentTime = baseTimeInMinutes;
                        
                        while (currentTime < 24 * 60 && times.length < 6) {
                          const hours = Math.floor(currentTime / 60);
                          const minutes = currentTime % 60;
                          times.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
                          currentTime += intervalInMinutes;
                        }
                        
                        return times.length > 0 ? ` (${times.join(', ')}${currentTime < 24 * 60 ? '...' : ''})` : '';
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Automatic scans will use these keywords and will consume {envConfig.creditsPerJob} credits per job found.
                With the default settings, each scan typically finds {envConfig.defaultLinkedinCount + envConfig.defaultNaukriCount} jobs and costs approximately {((envConfig.defaultLinkedinCount + envConfig.defaultNaukriCount) * envConfig.creditsPerJob).toFixed(2)} credits.
                Make sure you have sufficient credits to avoid interruptions.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
              
              {useCustomSchedule && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-6 py-3 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors"
                >
                  Reset to Default
                </button>
              )}
            </div>
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
                <span className="font-medium text-gray-700">Schedule:</span>{' '}
                <span className="text-gray-600">
                  {user.useCustomSchedule ? (
                    user.baseTime ? 
                      `Custom - Starting at ${user.baseTime}, every ${(() => {
                        const totalHours = user.scanInterval;
                        if (totalHours < 1) {
                          return `${Math.round(totalHours * 60)} minutes`;
                        } else if (totalHours === Math.floor(totalHours)) {
                          return `${Math.floor(totalHours)} hour${Math.floor(totalHours) !== 1 ? 's' : ''}`;
                        } else {
                          return `${totalHours} hours`;
                        }
                      })()}` :
                      'Custom (not configured)'
                  ) : (
                    `Default (${envConfig.scanTimes.map(time => {
                      const [hours, minutes] = time.split(':').map(Number);
                      const period = hours >= 12 ? 'PM' : 'AM';
                      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
                      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                    }).join(', ')})`
                  )}
                </span>
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
          </div>
        </div>
      </main>
    </div>
  );
}
