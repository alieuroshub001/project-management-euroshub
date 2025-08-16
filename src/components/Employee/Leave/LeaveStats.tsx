"use client";

import { useState, useEffect } from 'react';
import { IApiResponse } from '@/types';

type LeaveTypeKey = 'vacation' | 'sick' | 'personal' | 'other';

type LeaveTypeStats = {
  approvedDays: number;
  totalDays: number;
  pendingDays: number;
};

type LeaveStatsResponse = Partial<Record<LeaveTypeKey, LeaveTypeStats>>;

export default function LeaveStats() {
  const [stats, setStats] = useState<LeaveStatsResponse>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaveStats();
  }, []);

  const fetchLeaveStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employee/leave/stats');
      const data: IApiResponse = await response.json();

      if (data.success) {
        setStats(data.data as LeaveStatsResponse);
      }
    } catch (error) {
      console.error('Failed to fetch leave stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const leaveTypes: { key: LeaveTypeKey; name: string; color: string }[] = [
    { key: 'vacation', name: 'Vacation', color: '#3b82f6' }, // blue-500
    { key: 'sick', name: 'Sick Leave', color: '#ef4444' },   // red-500
    { key: 'personal', name: 'Personal', color: '#a855f7' }, // purple-500
    { key: 'other', name: 'Other', color: '#f59e0b' },       // amber-500
  ];

  const percent = (approved: number, total: number) =>
    total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Leave Statistics</h3>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {leaveTypes.map((t) => {
          const s = stats[t.key];
          if (!s) return null;

          const p = percent(s.approvedDays, s.totalDays);

          return (
            <div key={t.key} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm text-gray-500">{t.name}</div>

              <div className="mb-3 text-2xl font-bold">
                {s.approvedDays} <span className="text-base font-medium text-gray-500">/ {s.totalDays} days</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${p}%`, backgroundColor: t.color }}
                />
              </div>

              <div className="mt-2 text-sm text-gray-500">
                Pending: <span className="font-medium text-gray-700">{s.pendingDays}</span> days
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
