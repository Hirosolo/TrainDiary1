import React, { createContext, useContext, useRef } from 'react';

interface DashboardRefreshContextType {
  triggerRefresh: () => void;
  subscribe: (cb: () => void) => () => void;
}

const DashboardRefreshContext = createContext<DashboardRefreshContextType | undefined>(undefined);

export const DashboardRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const listeners = useRef<Set<() => void>>(new Set());

  const triggerRefresh = () => {
    listeners.current.forEach(cb => cb());
  };

  const subscribe = (cb: () => void) => {
    listeners.current.add(cb);
    return () => listeners.current.delete(cb);
  };

  return (
    <DashboardRefreshContext.Provider value={{ triggerRefresh, subscribe }}>
      {children}
    </DashboardRefreshContext.Provider>
  );
};

export const useDashboardRefresh = () => {
  const ctx = useContext(DashboardRefreshContext);
  if (!ctx) throw new Error('useDashboardRefresh must be used within DashboardRefreshProvider');
  return ctx;
}; 