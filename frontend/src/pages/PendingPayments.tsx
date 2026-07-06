import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Search, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle
} from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { exportToCSV } from '../utils/export';

interface PendingSale {
  id: number;
  bill_no: string;
  date: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string;
  customer_name: string;
  customer_mobile: string;
}

interface PendingPurchase {
  id: number;
  bill_no: string;
  date: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string;
  vendor_name: string;
  vendor_mobile: string;
}

const PendingPayments: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');
  const [agingFilter, setAgingFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [salesPending, setSalesPending] = useState<PendingSale[]>([]);
  const [purchasesPending, setPurchasesPending] = useState<PendingPurchase[]>([]);

  useEffect(() => {
    fetchPending();
  }, [agingFilter]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/reports/pending?filter=${agingFilter}`);
      setSalesPending(response.data.salesPending);
      setPurchasesPending(response.data.purchasesPending);
    } catch (error) {
      console.error('Failed to fetch pending payments:', error);
      showToast('Error loading pending payments report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const isSales = activeTab === 'sales';
    const filename = isSales ? 'Sales_Pending_Receivables' : 'Purchase_Pending_Payables';
    
    if (isSales) {
      const headers = ['Customer Name', 'Bill No', 'Total Amount (Rs.)', 'Paid Amount (Rs.)', 'Balance Amount (Rs.)', 'Due Date'];
      const rows = filteredSales.map(s => [
        s.customer_name,
        s.bill_no,
        s.total_amount,
        s.paid_amount,
        s.balance_amount,
        s.due_date || 'N/A'
      ]);
      exportToCSV(filename, headers, rows);
    } else {
      const headers = ['Vendor Name', 'Bill No', 'Total Amount (Rs.)', 'Paid Amount (Rs.)', 'Balance Amount (Rs.)', 'Due Date'];
      const rows = filteredPurchases.map(p => [
        p.vendor_name,
        p.bill_no,
        p.total_amount,
        p.paid_amount,
        p.balance_amount,
        p.due_date || 'N/A'
      ]);
      exportToCSV(filename, headers, rows);
    }
    showToast('Pending report exported successfully', 'success');
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredSales = salesPending.filter(s =>
    s.bill_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPurchases = purchasesPending.filter(p =>
    p.bill_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summarize metrics
  const totalReceivables = useMemo(() => {
    return salesPending.reduce((acc, s) => acc + s.balance_amount, 0);
  }, [salesPending]);

  const totalPayables = useMemo(() => {
    return purchasesPending.reduce((acc, p) => acc + p.balance_amount, 0);
  }, [purchasesPending]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-96 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto select-none animate-fade-in">
      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Sales Receivables Balance */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Total Outstanding Receivables (Sales)
            </p>
            <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1.5">
              ₹{totalReceivables.toFixed(2)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Purchase Payables Balance */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Total Outstanding Payables (Purchases)
            </p>
            <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-500 mt-1.5">
              ₹{totalPayables.toFixed(2)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar filters */}
      <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Toggle Module */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-250/20 w-fit">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-5 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Sales Receivables
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-5 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'purchases'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Purchase Payables
          </button>
        </div>

        {/* Filters and search inputs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Aging Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Due Period:
            </span>
            <select
              value={agingFilter}
              onChange={(e) => setAgingFilter(e.target.value as any)}
              className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
            >
              <option value="all">All Outstanding</option>
              <option value="today">Due Today</option>
              <option value="week">Due This Week</option>
              <option value="month">Due This Month</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              placeholder="Search details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Excel Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
        </div>
      </section>

      {/* Data Table */}
      <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {activeTab === 'sales' ? (
          filteredSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Bill No</th>
                    <th className="px-5 py-3 text-right">Total Amount</th>
                    <th className="px-5 py-3 text-right">Paid Amount</th>
                    <th className="px-5 py-3 text-right">Outstanding Balance</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredSales.map(sale => {
                    const isOverdue = sale.due_date && new Date(sale.due_date) < new Date(todayStr);
                    return (
                      <tr 
                        key={sale.id}
                        className={`text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors ${
                          isOverdue ? 'bg-rose-50/20 dark:bg-rose-950/10 text-rose-900 dark:text-rose-300 font-medium' : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <span className="block font-bold">{sale.customer_name}</span>
                          {sale.customer_mobile && <span className="text-[10px] text-zinc-450 block">{sale.customer_mobile}</span>}
                        </td>
                        <td className="px-5 py-3.5 font-mono">{sale.bill_no}</td>
                        <td className="px-5 py-3.5 text-right font-semibold">₹{sale.total_amount.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-right text-zinc-500">₹{sale.paid_amount.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-rose-600 dark:text-rose-500">₹{sale.balance_amount.toFixed(2)}</td>
                        <td className="px-5 py-3.5 font-semibold">{sale.due_date || 'N/A'}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                            isOverdue
                              ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-800'
                              : 'bg-amber-100 dark:bg-amber-950/30 text-amber-800'
                          }`}>
                            {isOverdue && <AlertCircle className="w-2.5 h-2.5 shrink-0" />}
                            {isOverdue ? 'Overdue' : 'Awaiting Collection'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
              <Clock className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">No Pending sales payments</h4>
              <p className="text-xs text-zinc-400 mt-1">
                There are currently no credit sales with outstanding collections matching the selected due filters.
              </p>
            </div>
          )
        ) : (
          filteredPurchases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Vendor</th>
                    <th className="px-5 py-3">Bill No</th>
                    <th className="px-5 py-3 text-right">Total Amount</th>
                    <th className="px-5 py-3 text-right">Paid Amount</th>
                    <th className="px-5 py-3 text-right">Outstanding Balance</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredPurchases.map(pur => {
                    const isOverdue = pur.due_date && new Date(pur.due_date) < new Date(todayStr);
                    return (
                      <tr 
                        key={pur.id}
                        className={`text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors ${
                          isOverdue ? 'bg-rose-50/20 dark:bg-rose-950/10 text-rose-900 dark:text-rose-300 font-medium' : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <span className="block font-bold">{pur.vendor_name}</span>
                          {pur.vendor_mobile && <span className="text-[10px] text-zinc-450 block">{pur.vendor_mobile}</span>}
                        </td>
                        <td className="px-5 py-3.5 font-mono">{pur.bill_no}</td>
                        <td className="px-5 py-3.5 text-right font-semibold">₹{pur.total_amount.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-right text-zinc-500">₹{pur.paid_amount.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-amber-600 dark:text-amber-500">₹{pur.balance_amount.toFixed(2)}</td>
                        <td className="px-5 py-3.5 font-semibold">{pur.due_date || 'N/A'}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                            isOverdue
                              ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-800'
                              : 'bg-amber-100 dark:bg-amber-950/30 text-amber-800'
                          }`}>
                            {isOverdue && <AlertCircle className="w-2.5 h-2.5 shrink-0" />}
                            {isOverdue ? 'Overdue' : 'Awaiting Payment'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
              <Clock className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">No Pending vendor payments</h4>
              <p className="text-xs text-zinc-400 mt-1">
                There are currently no credit purchases with outstanding payables matching the selected due filters.
              </p>
            </div>
          )
        )}
      </section>
    </div>
  );
};

export default PendingPayments;
