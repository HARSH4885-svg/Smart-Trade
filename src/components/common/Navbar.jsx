import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMarket } from '../../context/MarketContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { Bell, Search, User, Moon, Sun, Wallet, LogOut, Settings, Shield, ArrowLeft, Activity } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useFormatters } from '../../hooks/useFormatters';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { dataSource, marketError } = useMarket();
  const { notifications, markNotificationsRead } = usePortfolio();
  const { formatCurrency, formatDate } = useFormatters();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isHome = location.pathname === '/';
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleNotifications = () => {
    if (!showNotifications && unreadCount > 0) {
      markNotificationsRead();
    }
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  return (
    <nav className="h-16 border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between">
      <div className="flex items-center space-x-4 flex-1">
        {!isHome && (
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-border/50 rounded-lg transition-colors text-text-secondary"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Search stocks, news, or symbols..."
            className="w-full bg-background border border-border rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {marketError ? (
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full border border-danger/20 bg-danger/10 text-danger text-xs font-bold uppercase tracking-widest">
            <Shield size={12} />
            <span>{marketError}</span>
          </div>
        ) : (
          <div className={cn(
            "hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-widest transition-all",
            dataSource === 'live' 
              ? "bg-success/10 border-success/20 text-success" 
              : "bg-warning/10 border-warning/20 text-warning"
          )}>
            <Activity size={12} className={cn(dataSource === 'live' && "animate-pulse")} />
            <span>{dataSource === 'live' ? 'Live Market' : 'Simulated Data'}</span>
          </div>
        )}

        <div className="hidden lg:flex items-center space-x-2 bg-background border border-border rounded-full px-4 py-1.5">
          <Wallet size={16} className="text-primary" />
          <span className="text-base font-bold tabular-nums">
            {formatCurrency(user?.balance || 0)}
          </span>
        </div>

        <button 
          onClick={toggleTheme}
          className="p-2 hover:bg-border/50 rounded-full transition-colors text-text-secondary"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative">
          <button 
            onClick={handleToggleNotifications}
            className="p-2 hover:bg-border/50 rounded-full transition-colors text-text-secondary relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-surface"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h4 className="font-bold text-base">Notifications</h4>
                {unreadCount > 0 && (
                  <button 
                    onClick={markNotificationsRead}
                    className="text-xs text-primary font-bold uppercase tracking-widest"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-auto">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className={cn(
                      "p-4 hover:bg-border/20 border-b border-border last:border-0 transition-colors cursor-pointer relative",
                      !n.read && "bg-primary/5"
                    )}>
                      {!n.read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                      )}
                      <div className="flex justify-between items-start mb-1">
                        <p className={cn("text-base font-bold", !n.read ? "text-text-primary" : "text-text-secondary")}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-text-secondary font-medium uppercase">{formatDate(n.time)}</span>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-text-secondary italic text-sm">
                    No notifications yet.
                  </div>
                )}
              </div>
              <div className="p-3 bg-background text-center">
                <button className="text-xs text-text-secondary hover:text-text-primary transition-colors">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-border mx-2"></div>

        <div className="relative">
          <div 
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center space-x-3 cursor-pointer hover:bg-border/30 p-1 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none">{user?.name}</p>
              <p className="text-xs text-text-secondary mt-1">Premium Plan</p>
            </div>
          </div>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="text-sm font-bold">{user?.name}</p>
                <p className="text-xs text-text-secondary truncate">{user?.email}</p>
              </div>
              <div className="p-2">
                <Link to="/settings" className="flex items-center space-x-3 p-2 hover:bg-border/30 rounded-lg transition-colors text-sm" onClick={() => setShowUserMenu(false)}>
                  <User size={18} className="text-text-secondary" />
                  <span>Your Profile</span>
                </Link>
                <Link to="/settings" className="flex items-center space-x-3 p-2 hover:bg-border/30 rounded-lg transition-colors text-sm" onClick={() => setShowUserMenu(false)}>
                  <Settings size={18} className="text-text-secondary" />
                  <span>Settings</span>
                </Link>
                <Link to="/portfolio" className="flex items-center space-x-3 p-2 hover:bg-border/30 rounded-lg transition-colors text-sm" onClick={() => setShowUserMenu(false)}>
                  <Shield size={18} className="text-text-secondary" />
                  <span>Security</span>
                </Link>
              </div>
              <div className="p-2 border-t border-border">
                <button 
                  onClick={logout}
                  className="w-full flex items-center space-x-3 p-2 hover:bg-danger/10 rounded-lg transition-colors text-sm text-danger"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
