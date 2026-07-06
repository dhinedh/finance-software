import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Page components
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Purchase from './pages/Purchase';
import Banking from './pages/Banking';
import Reports from './pages/Reports';
import VendorsCustomers from './pages/VendorsCustomers';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Full-screen Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex flex-col items-center justify-center space-y-4 select-none">
        <svg className="animate-spin h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 animate-pulse">
          Loading ShopManager ERP...
        </span>
      </div>
    );
  }

  // 2. Unauthenticated User State (Show Login Page)
  if (!user) {
    return <Login />;
  }

  // 3. Authenticated User State (Show Dashboard Shell)
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'sales':
        return <Sales />;
      case 'purchase':
        return <Purchase />;
      case 'banking':
        return <Banking />;
      case 'reports':
        return <Reports />;
      case 'contacts':
        return <VendorsCustomers />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-[#09090b]">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar 
          activeTab={activeTab} 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />

        {/* Scrollable Workspace Pages */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-[#09090b]">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
