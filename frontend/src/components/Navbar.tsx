import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  onMenuClick: () => void;
  pendingSalesCount?: number;
  pendingPurchasesCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onMenuClick,
  pendingSalesCount = 0,
  pendingPurchasesCount = 0
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'sales': return 'Sales Transactions';
      case 'purchase': return 'Purchase Transactions';
      case 'banking': return 'Bank Book Ledger';
      case 'reports': return 'Business Reports';
      case 'contacts': return 'Vendor & Customer Directory';
      case 'pending': return 'Pending Collections / Payments';
      default: return 'Shop ERP';
    }
  };

  return (
    <header className="h-16 px-6 bg-white dark:bg-[#0c0c0f] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-35 select-none">
      <div className="flex items-center gap-4">
        {/* Toggle menu button on mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {getTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-3.5">
        {/* Quick Pending Alerts Badge (only show on dashboard or general view if there are items) */}
        {(pendingSalesCount > 0 || pendingPurchasesCount > 0) && (
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>Action Required</span>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-200"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Short Role Indicator */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Logged in as</span>
          <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
            user?.role === 'Admin' 
              ? 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}>
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
