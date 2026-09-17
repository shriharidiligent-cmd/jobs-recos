'use client';

import { useEffect, useState } from 'react';

export default function TestConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        } else {
          setError(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  if (loading) return <div className="p-4">Loading config...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Environment Config Test</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">API Response:</h2>
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </div>
      
      {config && (
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <h2 className="text-lg font-semibold mb-2">Scan Times:</h2>
          <p className="mb-2">Raw: {config.scanTimes?.join(', ')}</p>
          <p>Formatted: {config.scanTimes?.map((time: string) => {
            const [hours, minutes] = time.split(':').map(Number);
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
          }).join(' | ')}</p>
        </div>
      )}
    </div>
  );
}