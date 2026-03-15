import React, { createContext, useContext, useState, useCallback } from 'react';

/* ── Permission keys ── */
export const ALL_PERMISSIONS = [
  'access_billing',
  'access_inventory',
  'access_vendors',
  'access_banking',
  'access_expenses',
  'access_reports',
  'access_settings',
];

/* ── Role defaults (mirror backend) ── */
export const ROLE_DEFAULTS = {
  Owner:              Object.fromEntries(ALL_PERMISSIONS.map(p => [p, true])),
  Admin:              Object.fromEntries(ALL_PERMISSIONS.map(p => [p, true])),
  Accountant:         Object.fromEntries(ALL_PERMISSIONS.map(p => [p, p !== 'access_settings'])),
  Manager:            Object.fromEntries(ALL_PERMISSIONS.map(p => [p, p !== 'access_settings'])),
  'Billing Operator': { access_billing:true, access_inventory:true, access_vendors:false,
                        access_banking:false, access_expenses:false, access_reports:false, access_settings:false },
  Staff:              { access_billing:true, access_inventory:true, access_vendors:false,
                        access_banking:false, access_expenses:false, access_reports:false, access_settings:false },
};

/* ── Human-readable labels ── */
export const PERMISSION_LABELS = {
  access_billing:   'Billing & Invoice',
  access_inventory: 'Inventory & Services',
  access_vendors:   'Vendors & Purchases',
  access_banking:   'Banking',
  access_expenses:  'Expenses',
  access_reports:   'Reports',
  access_settings:  'Settings',
};

const SESSION_KEY = 'invooice_session';

const AuthContext = createContext(null);

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => loadSession());

  const login = useCallback(async (email, password) => {
    const res = await window.db.settings.login(email, password);
    if (!res.success) throw new Error(res.error || 'Login failed');
    saveSession(res.user);
    setCurrentUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    saveSession(null);
    setCurrentUser(null);
  }, []);

  /**
   * Check if the current user has a given permission key.
   * Owner/Admin always return true regardless of stored permissions.
   */
  const hasPermission = useCallback((permKey) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Owner' || currentUser.role === 'Admin') return true;
    return currentUser.permissions?.[permKey] === true;
  }, [currentUser]);

  /**
   * Refresh permissions for the current user from the backend.
   * Called after an Owner updates another user's permissions.
   */
  const refreshPermissions = useCallback(async () => {
    if (!currentUser) return;
    try {
      const perms = await window.db.settings.getUserPermissions(currentUser.id);
      const updated = { ...currentUser, permissions: perms };
      saveSession(updated);
      setCurrentUser(updated);
    } catch { /* ignore */ }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, hasPermission, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
