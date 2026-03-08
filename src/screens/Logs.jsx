import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, RefreshCw } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import { useToast } from '../components/ToastContext.jsx';
import logger from '../utils/logger.js';

export default function Logs() {
  const toast = useToast();
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState(100);

  const fetchLogs = async () => {
    setLoading(true);
    logger.info('Fetching application logs', { lines });

    try {
      const logData = await window.electronAPI.getLogs(lines);
      setLogs(logData);
      logger.userAction('VIEW_LOGS', null, { lines });
    } catch (e) {
      logger.logError(e, { operation: 'fetchLogs', lines });
      toast('Failed to load logs', 'error');
      console.error(e);
    }
    setLoading(false);
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return;
    }

    logger.info('Clearing application logs');
    try {
      await window.electronAPI.clearLogs();
      setLogs('');
      logger.userAction('CLEAR_LOGS');
      toast('Logs cleared successfully', 'success');
    } catch (e) {
      logger.logError(e, { operation: 'clearLogs' });
      toast('Failed to clear logs', 'error');
    }
  };

  const downloadLogs = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accountingpro-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logger.userAction('DOWNLOAD_LOGS', null, { fileName: a.download });
    toast('Logs downloaded successfully', 'success');
  };

  useEffect(() => {
    fetchLogs();
  }, [lines]);

  const logLines = logs.split('\n').filter(line => line.trim());

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Application Logs" subtitle="Debugging and system monitoring" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Lines:</label>
              <select
                value={lines}
                onChange={(e) => setLines(Number(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>
            <span className="text-sm text-gray-500">
              Total lines: {logLines.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={downloadLogs}
              disabled={!logs}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Download size={14} />
              Download
            </button>
            <button
              onClick={clearLogs}
              disabled={!logs}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Clear Logs
            </button>
          </div>
        </div>

        {/* Log Content */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={16} />
              Application Logs
            </h3>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={24} className="animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading logs...</span>
              </div>
            ) : logs ? (
              <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg border">
                {logs}
              </pre>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No logs available</p>
                <p className="text-sm">Logs will appear here as the application runs</p>
              </div>
            )}
          </div>
        </div>

        {/* Log Levels Legend */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Log Levels</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>INFO - General information</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>WARN - Warnings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>ERROR - Errors</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>DEBUG - Debug information</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}