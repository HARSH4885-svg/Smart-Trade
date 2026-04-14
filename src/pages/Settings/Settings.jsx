import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { 
  User, Moon, Sun, DollarSign, Shield, 
  Bell, Globe, RotateCcw, Info, ExternalLink 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

import { SUPPORTED_CURRENCIES } from '../../constants';

const Settings = () => {
  const { user, resetAccount, updateProfile } = useAuth();
  const { theme, toggleTheme, currency, setCurrency, forceMarketOpen, setForceMarketOpen } = useTheme();
  const { resetPortfolio } = usePortfolio();
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [displayName, setDisplayName] = React.useState(user?.name || '');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleReset = () => {
    resetAccount();
    resetPortfolio();
    setShowResetConfirm(false);
    toast.success('Portfolio reset successfully');
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }
    
    setIsSaving(true);
    const result = await updateProfile({ name: displayName });
    setIsSaving(false);

    if (result.success) {
      toast.success('Profile updated successfully');
    } else {
      toast.error(result.message || 'Failed to update profile');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="card max-w-md w-full p-6 space-y-6 shadow-2xl border-danger/20">
            <div className="flex items-center space-x-3 text-danger">
              <RotateCcw size={24} />
              <h3 className="text-xl font-bold">Reset Portfolio?</h3>
            </div>
            <p className="text-text-secondary">
              Are you sure you want to reset your portfolio? This will clear all holdings, transaction history, and reset your balance to $100,000. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleReset}
                className="flex-1 bg-danger hover:bg-danger/90 text-white font-bold py-2 rounded-lg transition-colors"
              >
                Yes, Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-text-secondary">Manage your account preferences and application settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <h3 className="font-bold">Profile</h3>
          <p className="text-xs text-text-secondary">Your personal information and account details.</p>
        </div>
        <div className="md:col-span-2 card p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
              {user?.name?.[0]}
            </div>
            <div>
              <h4 className="text-lg font-bold">{user?.name}</h4>
              <p className="text-sm text-text-secondary">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Display Name</label>
              <input 
                type="text" 
                className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Email Address</label>
              <input 
                type="email" 
                className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 opacity-50 cursor-not-allowed"
                defaultValue={user?.email}
                disabled
              />
            </div>
          </div>
          <button 
            onClick={handleSaveProfile}
            disabled={isSaving || displayName === user?.name}
            className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="h-px bg-border"></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <h3 className="font-bold">Preferences</h3>
          <p className="text-xs text-text-secondary">Customize your experience and display options.</p>
        </div>
        <div className="md:col-span-2 card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-background border border-border rounded-lg">
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                <p className="font-bold">Appearance</p>
                <p className="text-xs text-text-secondary">Switch between dark and light mode</p>
              </div>
            </div>
            <button 
              onClick={toggleTheme}
              className="bg-background border border-border rounded-full p-1 flex items-center w-12 transition-all"
            >
              <div className={cn(
                "w-5 h-5 rounded-full shadow-sm transition-all",
                theme === 'dark' ? "translate-x-5 bg-primary" : "translate-x-0 bg-text-secondary"
              )}></div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-background border border-border rounded-lg">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="font-bold">Default Currency</p>
                <p className="text-xs text-text-secondary">Choose your preferred currency symbol</p>
              </div>
            </div>
            <select 
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-background border border-border rounded-lg">
                <Shield size={20} />
              </div>
              <div>
                <p className="font-bold">Market Simulation</p>
                <p className="text-xs text-text-secondary">Force market to be open for testing</p>
              </div>
            </div>
            <button 
              onClick={() => setForceMarketOpen(!forceMarketOpen)}
              className="bg-background border border-border rounded-full p-1 flex items-center w-12 transition-all"
            >
              <div className={cn(
                "w-5 h-5 rounded-full shadow-sm transition-all",
                forceMarketOpen ? "translate-x-5 bg-success" : "translate-x-0 bg-text-secondary"
              )}></div>
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-border"></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <h3 className="font-bold text-danger">Danger Zone</h3>
          <p className="text-xs text-text-secondary">Irreversible actions for your account data.</p>
        </div>
        <div className="md:col-span-2 card p-6 border-danger/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-danger/10 text-danger rounded-lg">
                <RotateCcw size={20} />
              </div>
              <div>
                <p className="font-bold">Reset Portfolio</p>
                <p className="text-xs text-text-secondary">Clear all holdings and start with $100,000</p>
              </div>
            </div>
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="btn-secondary border-danger/50 text-danger hover:bg-danger/10"
            >
              Reset Data
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6 bg-surface/30 border-dashed">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Info className="text-text-secondary" size={20} />
            <p className="text-sm text-text-secondary">SmartTrade Platform v1.0.4 • Hackathon Build</p>
          </div>
          <a href="#" className="text-xs text-primary flex items-center space-x-1 hover:underline">
            <span>Documentation</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Settings;
