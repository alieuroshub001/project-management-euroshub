'use client';

import { createContext, useContext, useState } from 'react';

type LeaveContextType = {
  refreshRequests: () => void;
};

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

export function LeaveClientWrapper({ children }: { children: React.ReactNode }) {
  const [, setRefreshTrigger] = useState(0);

  const refreshRequests = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <LeaveContext.Provider value={{ refreshRequests }}>
      {children}
    </LeaveContext.Provider>
  );
}

export function useLeaveContext() {
  const context = useContext(LeaveContext);
  if (context === undefined) {
    throw new Error('useLeaveContext must be used within a LeaveClientWrapper');
  }
  return context;
}