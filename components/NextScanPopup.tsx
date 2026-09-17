'use client';

import { useEffect, useState } from 'react';

interface NextScanPopupProps {
  lastScanAt: string | null;
  scanInterval: number;
  onClose: () => void;
}

export default function NextScanPopup({ lastScanAt, scanInterval, onClose }: NextScanPopupProps) {
  const [nextScanTime, setNextScanTime] = useState<string>('');
  const [scanTimes, setScanTimes] = useState<string[]>(['08:00', '12:00', '16:00', '20:00']);
  const [loading, setLoading] = useState(true);

  // Fetch scan times from environment configuration
  useEffect(() => {
    const fetchScanTimes = async () => {
      try {
        const response = await fetch('/api/config', { method: 'GET' });
        if (response.ok) {
          const config = await response.json();
          if (config.scanTimes && config.scanTimes.length > 0) {
            setScanTimes(config.scanTimes);
          }
        }
      } catch (error) {
        console.error('Failed to fetch scan times:', error);
        // Keep default times if fetch fails
      } finally {
        setLoading(false);
      }
    };

    fetchScanTimes();
  }, []);

  // Calculate next scan time whenever scan times change
  useEffect(() => {
    if (scanTimes.length === 0) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Find the next scan time
    for (const time of scanTimes) {
      const [hours, minutes] = time.split(':').map(Number);
      
      if (currentHour < hours || (currentHour === hours && currentMinute < minutes)) {
        setNextScanTime(time);
        return;
      }
    }
    
    // If no scan time today, next is tomorrow at first scan time
    const firstScanTime = scanTimes[0] || '08:00';
    setNextScanTime(`${firstScanTime} (tomorrow)`);
  }, [scanTimes]);

  // Format scan times for display (HH:MM to H:MM AM/PM)
  const formatTimeForDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formattedScanTimes = scanTimes.map(formatTimeForDisplay).join(' | ');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Automatic Job Scanning
          </h3>
          <p className="text-gray-600 mb-1">
            Your saved keywords will be scanned automatically at:
          </p>
          <div className="text-sm font-semibold text-blue-600 mb-4">
            {loading ? 'Loading...' : formattedScanTimes}
          </div>
          <p className="text-gray-600 mb-2">
            Next scan at:
          </p>
          <p className="text-2xl font-bold text-blue-600 mb-4">
            {loading ? 'Loading...' : (nextScanTime ? formatTimeForDisplay(nextScanTime.replace(' (tomorrow)', '')) + (nextScanTime.includes('tomorrow') ? ' (tomorrow)' : '') : 'Calculating...')}
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Make sure you have configured your keywords in Settings
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
