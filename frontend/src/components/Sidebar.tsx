import React from 'react';
import { 
  LayoutDashboard, 
  CircleDollarSign, 
  ShoppingCart, 
  Landmark, 
  FileBarChart2, 
  Users, 
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen
}) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', name: 'Sales', icon: CircleDollarSign },
    { id: 'purchase', name: 'Purchase', icon: ShoppingCart },
    { id: 'banking', name: 'Banking', icon: Landmark },
    { id: 'reports', name: 'Reports', icon: FileBarChart2 },
    { id: 'contacts', name: 'Vendors / Customers', icon: Users },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false); // Close mobile drawer on click
  };

  return (
    <>
      {/* Mobile Sidebar Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col w-64 bg-white dark:bg-[#0c0c0f] border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300 lg:translate-x-0 lg:static ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header Branding */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-zinc-150 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-600/20">
              S
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              ShopManager
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm uppercase">
              {user?.username?.substring(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {user?.username}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                {user?.role} Role
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Footer Section */}
        <div className="p-4 border-t border-zinc-150 dark:border-zinc-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
