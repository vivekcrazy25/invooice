import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 60_000; // refresh every 60 seconds

const NotificationContext = createContext(null);

const EMPTY = { lowStock: [], draftInvoices: [], creditInvoices: [], total: 0 };

export function NotificationProvider({ children }) {
  const [data,    setData]    = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const res = await window.db.settings.getNotifications();
      setData(res || EMPTY);
    } catch {
      /* silently ignore — notifications are non-critical */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [refresh]);

  // Allow any component to manually trigger a refresh (e.g. after saving a product)
  const invalidate = useCallback(() => refresh(), [refresh]);

  return (
    <NotificationContext.Provider value={{ ...data, loading, refresh: invalidate }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}
