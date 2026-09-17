'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DebugSchedulerPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [envConfig, setEnvConfig] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchSchedulerStatus();
    fetchEnvConfig();
  }, []);

  const fetchEnvConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config = await res.json();
        setEnvConfig(config);
      }
    } catch (error) {
      console.error('Failed to fetch env config:', error);
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/init-scheduler');
      const data = await response.json();
      setSchedulerStatus(data);
    } catch (error) {
      setSchedulerStatus({ error: 'Failed to get scheduler status' });
    }
  };

  const manageScheduler = async (action: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/init-scheduler?action=${action}`, {
        method: 'GET',
      });
      const data = await response.json();
      setSchedulerStatus(data);
      setResult({ ...data, action });
    } catch (error) {
      setResult({ error: `Failed to ${action} scheduler` });
    } finally {
      setLoading(false);
    }
  };

  const triggerManualScan = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/manual-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to execute manual scan' });
    } finally {
      setLoading(false);
    }
  };

  const triggerScan = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/trigger-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ scanType: 'test' }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to trigger scan test' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">🔧 Scheduler Debug & Control</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor, control, and test the automatic scan scheduler
            </p>
          </div>

          <div className="p-6 space-y-6">

            {/* Instructions */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-indigo-900 mb-3">📚 How to Fix Cron Job Issues</h3>
              <div className="text-sm text-indigo-800 space-y-2">
                <div className="font-medium">🔄 When SCAN_TIMES is changed:</div>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Update SCAN_TIMES in .env.local file</li>
                  <li>Click "Restart Scheduler" button below</li>
                  <li>Verify new times appear in "Current Configuration"</li>
                  <li>Use "Test User Eligibility" to check without affecting users</li>
                  <li>Use "Run Manual Scan Now" to force immediate execution</li>
                </ol>
                <div className="mt-3 p-2 bg-indigo-100 rounded">
                  <div className="font-medium">⚠️ Common Issues:</div>
                  <ul className="list-disc list-inside ml-4">
                    <li>Scheduler not restarted after env changes</li>
                    <li>Invalid time format (use HH:MM like 09:00)</li>
                    <li>Users with insufficient credits or no keywords</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Environment Configuration */}
            {envConfig && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">📋 Current Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-blue-800">Scan Times:</p>
                    <p className="text-blue-700">{envConfig.scanTimes?.join(', ')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">Credits per Job:</p>
                    <p className="text-blue-700">{envConfig.creditsPerJob}</p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">Default Results:</p>
                    <p className="text-blue-700">LinkedIn: {envConfig.defaultLinkedinCount}, Naukri: {envConfig.defaultNaukriCount}</p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">Last Updated:</p>
                    <p className="text-blue-700">{new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Scheduler Status */}
            {schedulerStatus && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">⚡ Scheduler Status</h3>
                <div className="text-sm">
                  <p className="mb-2">
                    <span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${schedulerStatus.running !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {schedulerStatus.running !== false ? 'Running' : 'Stopped'}
                    </span>
                  </p>
                  <p className="mb-2">
                    <span className="font-medium">Last Action:</span> {schedulerStatus.action || 'Unknown'}
                  </p>
                  <p className="mb-2">
                    <span className="font-medium">Timestamp:</span> {schedulerStatus.timestamp || 'Unknown'}
                  </p>
                  <p>
                    <span className="font-medium">Message:</span> {schedulerStatus.message || 'No message'}
                  </p>
                </div>
              </div>
            )}

            {/* Scheduler Controls */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-yellow-900 mb-3">🎛️ Scheduler Controls</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => manageScheduler('restart')}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳' : '🔄'} Restart Scheduler
                </button>
                <button
                  onClick={() => manageScheduler('stop')}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳' : '🛑'} Stop Scheduler
                </button>
                <button
                  onClick={fetchSchedulerStatus}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳' : '📊'} Check Status
                </button>
              </div>
              <p className="mt-2 text-xs text-yellow-800">
                ⚠️ Use "Restart Scheduler" after changing SCAN_TIMES in environment variables
              </p>
            </div>

            {/* Test Controls */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-900 mb-3">🧪 Test Controls</h3>
              <div className="flex space-x-3">
                <button
                  onClick={triggerScan}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Testing...' : '🧪 Test User Eligibility'}
                </button>
                <button
                  onClick={triggerManualScan}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Running...' : '⚡ Run Manual Scan Now'}
                </button>
              </div>
              <div className="mt-2 text-xs text-green-800">
                <p>• Test User Eligibility: Check which users would be processed</p>
                <p>• Run Manual Scan Now: Actually execute scans for current time</p>
              </div>
            </div>

            {/* Results Display */}
            {result && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Results</h3>
                
                {result.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800">❌ Error: {result.error}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
                      <p className="text-sm text-blue-800">{result.message}</p>
                      {result.currentTime && (
                        <p className="text-sm text-blue-800">Current Time: {result.currentTime}</p>
                      )}
                      {result.timestamp && (
                        <p className="text-sm text-blue-800">Timestamp: {new Date(result.timestamp).toLocaleString()}</p>
                      )}
                      {result.summary && (
                        <div className="mt-2 text-sm text-blue-800">
                          <p>Total Users: {result.summary.total}</p>
                          <p>Eligible: {result.summary.eligible}</p>
                          <p>Ineligible: {result.summary.ineligible}</p>
                        </div>
                      )}
                    </div>

                    {/* User Results */}
                    {result.results && result.results.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">User Analysis</h4>
                        {result.results.map((user: any, index: number) => (
                          <div
                            key={index}
                            className={`border rounded-md p-3 ${
                              user.processed 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-red-200 bg-red-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {user.email} ({user.scanType})
                                </p>
                                <p className="text-xs text-gray-600">
                                  Credits: {user.credits} | Keywords: {user.keywords?.length || 0}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-2 py-1 text-xs rounded ${
                                  user.processed 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {user.processed ? 'Eligible' : 'Ineligible'}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-700 mt-1">{user.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Raw JSON for debugging */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        View Raw JSON
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}

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