"use client";

import { useEffect, useState } from "react";

export default function NoConnection() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    setIsOffline(!navigator.onLine);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-6 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Интернет байхгүй байна</h2>
        <p className="text-gray-500 text-base max-w-xs">
          Интернет холболтоо шалгаад дахин оролдоно уу.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-full font-medium text-sm hover:bg-blue-700 transition"
        >
          Дахин оролдох
        </button>
      </div>
    </div>
  );
}