import React, { useState, useRef } from 'react';
import { Bell, User } from 'lucide-react';
import { useAuth }           from '../context/AuthContext.jsx';
import { useNotifications }  from '../context/NotificationContext.jsx';
import NotificationPanel     from './NotificationPanel.jsx';
import GlobalSearch          from './GlobalSearch.jsx';

export default function TopBar({ title, subtitle, actions }) {
  const { currentUser } = useAuth();
  const { total }       = useNotifications();
  const [showPanel, setShowPanel] = useState(false);
  const bellRef = useRef(null);

  /* Build avatar initials from logged-in user */
  const initials = (() => {
    if (!currentUser?.name) return '';
    const parts = currentUser.name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : currentUser.name.slice(0, 2).toUpperCase();
  })();

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between flex-shrink-0 relative z-40">
      {/* Left: page title */}
      <div>
        <h1 className="text-lg font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {actions}

        {/* Quick search */}
        <GlobalSearch />

        {/* Bell + notification panel */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setShowPanel(p => !p)}
            className={`relative p-1.5 rounded-lg transition-colors
              ${showPanel
                ? 'bg-gray-900 text-white'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            title="Notifications"
          >
            <Bell size={17} />

            {/* Badge — shows real count */}
            {total > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5
                           bg-red-500 rounded-full flex items-center justify-center
                           text-white text-[9px] font-extrabold leading-none
                           ring-2 ring-white"
              >
                {total > 99 ? '99+' : total}
              </span>
            )}
          </button>

          {showPanel && (
            <NotificationPanel onClose={() => setShowPanel(false)} />
          )}
        </div>

        {/* User avatar (from logged-in session) */}
        <div
          className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center
                     text-white text-[11px] font-bold flex-shrink-0"
          title={currentUser?.name || currentUser?.email || 'User'}
        >
          {initials || <User size={14} className="text-white" />}
        </div>
      </div>
    </header>
  );
}
