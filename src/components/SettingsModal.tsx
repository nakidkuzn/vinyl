import React, { useState } from 'react';
import { DiscogsApiConfig } from '../types/discogs';
import { testDiscogsToken } from '../services/discogsApiService';
import { Key, CheckCircle, AlertCircle, RefreshCw, ExternalLink, ShieldCheck, Database } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DiscogsApiConfig;
  onSaveConfig: (config: DiscogsApiConfig) => void;
  onResetSampleData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetSampleData,
}) => {
  const [token, setToken] = useState(config.personalAccessToken || '');
  const [username, setUsername] = useState(config.username || '');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>(config.currency || 'USD');
  const [autoSync, setAutoSync] = useState(config.autoSyncEnabled || false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestToken = async () => {
    if (!token.trim()) {
      setTestResult({ success: false, message: 'Please enter a Discogs Personal Access Token first' });
      return;
    }
    setTesting(true);
    setTestResult(null);

    const res = await testDiscogsToken(token);
    setTesting(false);
    if (res.success) {
      if (res.username) setUsername(res.username);
      setTestResult({
        success: true,
        message: `Successfully connected to Discogs as seller @${res.username || 'authenticated'}!`,
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Connection failed. Verify your token permissions.',
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      personalAccessToken: token.trim(),
      username: username.trim(),
      currency,
      autoSyncEnabled: autoSync,
      syncIntervalHours: 24,
      lastSyncTime: config.lastSyncTime,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#101319] border border-neutral-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-[#131720]">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white font-display">
              Discogs API &amp; Store Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800"
          >
            Close
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-5 text-xs">
          {/* Discogs Personal Access Token */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white">Discogs Personal Access Token</label>
              <a
                href="https://www.discogs.com/settings/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Generate token on Discogs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Paste Discogs token (e.g. abcdef123456...)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                disabled={testing}
                onClick={handleTestToken}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                {testing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Test Connection</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-400">
              Personal Access Tokens are stored securely in your local browser sandbox and used only for direct calls to Discogs.
            </p>

            {testResult && (
              <div
                className={`p-2.5 rounded border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-800 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Currency Preference */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">Store Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'USD' | 'EUR' | 'GBP')}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="USD">USD ($) United States Dollar</option>
                <option value="EUR">EUR (€) Euro</option>
                <option value="GBP">GBP (£) British Pound</option>
              </select>
            </div>
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">Scheduled Reprice Simulation</label>
              <select
                value={autoSync ? 'daily' : 'manual'}
                onChange={(e) => setAutoSync(e.target.value === 'daily')}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="manual">Manual Batch Trigger Only</option>
                <option value="daily">Simulated Daily Cron (04:00 AM)</option>
              </select>
            </div>
          </div>

          {/* Reset Demo Database */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-neutral-300 font-semibold block">Demo Catalog Presets</span>
              <span className="text-[11px] text-neutral-500">
                Restore pre-loaded iconic records (Pink Floyd, Miles Davis, Daft Punk, etc.)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset store back to default 16 collectible releases?')) {
                  onResetSampleData();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white rounded text-xs transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Reset Sample Data</span>
            </button>
          </div>

          {/* Footer Save */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded text-xs shadow"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
