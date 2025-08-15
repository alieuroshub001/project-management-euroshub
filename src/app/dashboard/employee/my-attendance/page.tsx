// app/dashboard/employee/attendance/page.tsx
'use client';

import React from 'react';
import AttendanceLayout from '@/components/Employee/Attendance/AttendanceLayout';

export default function AttendancePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Attendance</h1>
        <AttendanceLayout />
      </div>
    </div>
  );
}