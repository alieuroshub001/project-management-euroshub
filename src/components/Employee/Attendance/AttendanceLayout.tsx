// components/employee/attendance/AttendanceLayout.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Spin, Alert } from 'antd';
import CurrentAttendance from './CurrentAttendance';
import AttendanceHistory from './AttendanceHistory';
import AttendanceStats from './AttendanceStats';
import {
  AttendanceRecord,
  AttendanceResponse,
  AttendanceStats as StatsType,
} from './types';

export default function AttendanceLayout() {
  const { data: session } = useSession();
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<StatsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const fetchAttendanceRecords = useCallback(
    async (params?: Record<string, string>) => {
      setLoading(true);
      setError(null);
      try {
        const searchParams = new URLSearchParams(params);
        const response = await fetch(`/api/employee/attendance?${searchParams}`);

        if (!response.ok) {
          throw new Error('Failed to fetch attendance records');
        }

        const data: AttendanceResponse = await response.json();

        if (data.data) {
          setRecords(data.data);
          setStats(data.stats);

          // Find the most recent active record for today (one without checkOut)
          const today = new Date();
          const todayRecords = data.data.filter((record: AttendanceRecord) => {
            const recordDate = new Date(record.date);
            return isSameDay(recordDate, today);
          });

          const activeRecord =
            todayRecords
              .filter((record) => !record.checkOut)
              .sort(
                (a, b) =>
                  new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()
              )[0] || null;

          setCurrentRecord(activeRecord);
        }
      } catch (error) {
        console.error('Failed to fetch attendance records:', error);
        setError('Failed to load attendance data. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [] // no external deps; safe
  );

  useEffect(() => {
    if (session?.user?.id) {
      fetchAttendanceRecords();
    }
  }, [session, fetchAttendanceRecords]);

  // --- Handlers ---
  const handleCheckInSuccess = (record: AttendanceRecord) => {
    setCurrentRecord(record);
    setRecords((prevRecords) => {
      const filteredRecords = prevRecords.filter((r) => r.id !== record.id);
      return [record, ...filteredRecords];
    });
    setTimeout(() => {
      fetchAttendanceRecords();
    }, 500);
  };

  const handleCheckOutSuccess = () => {
    setCurrentRecord(null);
    fetchAttendanceRecords();
  };

  const handleRecordUpdate = (updatedRecord: AttendanceRecord) => {
    setCurrentRecord(updatedRecord);
    setRecords((prevRecords) =>
      prevRecords.map((record) =>
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );
  };

  const getTodayRecords = () => {
    const today = new Date();
    return records.filter((record) => isSameDay(new Date(record.date), today));
  };

  if (loading && records.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Attendance Management</h1>

      {error && (
        <Alert
          message={error}
          type="error"
          closable
          className="mb-6"
          onClose={() => setError(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <CurrentAttendance
            currentRecord={currentRecord}
            setCurrentRecord={setCurrentRecord}
            onCheckInSuccess={handleCheckInSuccess}
            onCheckOutSuccess={handleCheckOutSuccess}
            onRecordUpdate={handleRecordUpdate}
            loading={loading}
            allTodayRecords={getTodayRecords()}
          />
        </div>
        <div>
          <AttendanceStats stats={stats} loading={loading} />
        </div>
      </div>

      <AttendanceHistory
        records={records}
        loading={loading}
        onFilter={fetchAttendanceRecords}
      />
    </div>
  );
}
