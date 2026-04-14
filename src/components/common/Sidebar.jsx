import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Briefcase, 
  Star, 
  History, 
  PieChart, 
  Settings, 
  LogOut,
  Zap,
  Target
} from 'lucide-react';
import { cn } from '../../lib/utils';

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: TrendingUp, label: 'Market', path: '/market' },
    { icon: Briefcase, label: 'Portfolio', path: '/portfolio' },
    { icon: Star, label: 'Watchlist', path: '/watchlist' },
    { icon: Target, label: 'Auto Trading', path: '/auto-trade' },
    { icon: History, label: 'History', path: '/history' },
    { icon: PieChart, label: 'Charts & Insights', path: '/analytics' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col h-screen sticky top-0 hidden lg:flex">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Zap size={24} fill="currentColor" />
        </div>
        <h1 className="text-2xl font-bold tracking-tighter">SmartTrade</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-primary text-white shadow-md shadow-primary/10" 
                : "text-text-secondary hover:bg-border/50 hover:text-text-primary"
            )}
          >
            <item.icon size={20} className={cn(
              "transition-transform duration-200 group-hover:scale-110",
            )} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
            isActive 
              ? "bg-primary/10 text-primary" 
              : "text-text-secondary hover:bg-border/50 hover:text-text-primary"
          )}
        >
          <Settings size={20} />
          <span className="font-medium">Settings</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-danger hover:bg-danger/10 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
