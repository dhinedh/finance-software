import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CircleDollarSign, 
  ShoppingCart, 
  Building2, 
  Wallet,
  Clock,
  Plus
} from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../components/Toast';

interface DashboardStats {
  todaySales: number;
  todayPurchases: number;
  todayBankDeposit: number;
  pendingSales: number;
  pendingPurchases: number;
  cashBalance: number;
  bankBalance: number;
}

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const response = await api.get(`/reports/dashboard?today=${todayStr}`);
        setStats(response.data);
      } catch (error) {
        console.error('Failed to load dashboard statistics:', error);
        showToast('Error loading dashboard statistics', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [showToast]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Quick actions skeleton */}
        <div className="h-20 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-2xl" />
        {/* KPI Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-2xl" />
          ))}
        </div>
        {/* Ledger grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Formatting helper
  const formatCur = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Quick Action Banner */}
      <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3.5">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab('sales')}
            className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Sale Bill
          </button>
          
          <button
            onClick={() => setActiveTab('purchase')}
            className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Purchase Invoice
          </button>

          <button
            onClick={() => setActiveTab('banking')}
            className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Bank entry
          </button>
        </div>
      </section>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/* Today's Sales */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Today's Sales
            </p>
            <h4 className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-1.5 truncate">
              {formatCur(stats?.todaySales || 0)}
            </h4>
          </div>
        </div>

        {/* Today's Purchases */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Today's Purchases
            </p>
            <h4 className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-1.5 truncate">
              {formatCur(stats?.todayPurchases || 0)}
            </h4>
          </div>
        </div>

        {/* Today's Bank Deposit */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Today's Deposits
            </p>
            <h4 className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-1.5 truncate">
              {formatCur(stats?.todayBankDeposit || 0)}
            </h4>
          </div>
        </div>

        {/* Pending Collections (Sales Receivables) */}
        <button
          onClick={() => setActiveTab('reports')}
          className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4 text-left hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors group cursor-pointer"
        >
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <span>Sales Pending</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </p>
            <h4 className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-1.5 truncate">
              {formatCur(stats?.pendingSales || 0)}
            </h4>
          </div>
        </button>

        {/* Pending Payments (Purchases Payables) */}
        <button
          onClick={() => setActiveTab('reports')}
          className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4 text-left hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors group cursor-pointer"
        >
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <span>Purchases Pending</span>
              <ArrowDownRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
            </p>
            <h4 className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-1.5 truncate">
              {formatCur(stats?.pendingPurchases || 0)}
            </h4>
          </div>
        </button>
      </div>

      {/* Cash & Bank Balances Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cash Balance */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Cash on Hand Balance
            </p>
            <h3 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">
              {formatCur(stats?.cashBalance || 0)}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              Calculated from Cash Sales, Cash Purchases & Bank movements.
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Wallet className="w-8 h-8" />
          </div>
        </div>

        {/* Bank Balance */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Bank Books Balance
            </p>
            <h3 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">
              {formatCur(stats?.bankBalance || 0)}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              Sum of Deposits minus Withdrawals logged in ledger.
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
