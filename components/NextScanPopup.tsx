'use client';

import { useEffect, useState } from 'react';

interface NextScanPopupProps {
  lastScanAt: string | null;
  scanInterval: number;
  onClose: () => void;
}

export default function NextScanPopup({ lastScanAt, scanInterval, onClose }: NextScanPopupProps) {
  const [nextScanTime, setNextScanTime] = useState<string>('');
  
  const scanTimes = ['08:00', '12:00', '16:00', '20:00'];

  useEffect(() => {
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
    
    // If no scan time today, next is tomorrow at 8 AM
    setNextScanTime('08:00 (tomorrow)');
  }, []);

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
            8:00 AM | 12:00 PM | 4:00 PM | 8:00 PM
          </div>
          <p className="text-gray-600 mb-2">
            Next scan at:
          </p>
          <p className="text-2xl font-bold text-blue-600 mb-4">
            {nextScanTime}
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
