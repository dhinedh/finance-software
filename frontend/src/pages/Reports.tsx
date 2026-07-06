import React, { useState, useEffect } from 'react';
import { 
  CircleDollarSign, 
  ShoppingCart, 
  Building2, 
  Wallet, 
  Clock, 
  TrendingUp, 
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  FileText
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import api from '../utils/api';
import { useToast } from '../components/Toast';
import { exportToCSV } from '../utils/export';

interface SummaryStats {
  totalSales: number;
  totalPurchase: number;
  bankDeposit: number;
  cashReceived: number;
  cashPaid: number;
  pendingCollection: number;
  profit: number;
}

interface TrendPoint {
  date: string;
  sales: number;
  purchases: number;
}

interface EntityBreakdown {
  name: string;
  total: number;
  paid: number;
  balance: number;
}

const Reports: React.FC = () => {
  const { showToast } = useToast();

  const [activeSection, setActiveSection] = useState<'overview' | 'sales' | 'purchase'>('overview');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [customerBreakdown, setCustomerBreakdown] = useState<EntityBreakdown[]>([]);
  const [vendorBreakdown, setVendorBreakdown] = useState<EntityBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync data on tab or date changes
  useEffect(() => {
    fetchReport();
  }, [reportType, selectedDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/reports/summary?type=${reportType}&date=${selectedDate}`);
      setSummary(response.data.summary);
      setTrendData(response.data.trend);
      setCustomerBreakdown(response.data.customerBreakdown || []);
      setVendorBreakdown(response.data.vendorBreakdown || []);
    } catch (error) {
      console.error('Failed to load report data:', error);
      showToast('Error loading report statistics', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCur = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  // Computed Sales Insights
  const salesDays = trendData.filter(t => t.sales > 0);
  const peakSalesVal = salesDays.length > 0 ? Math.max(...salesDays.map(t => t.sales)) : 0;
  const peakSalesDay = salesDays.find(t => t.sales === peakSalesVal)?.date || 'N/A';
  const avgSales = trendData.length > 0 ? (summary?.totalSales || 0) / trendData.length : 0;
  const activeSalesCount = salesDays.length;

  // Computed Purchase Insights
  const purchaseDays = trendData.filter(t => t.purchases > 0);
  const peakPurchaseVal = purchaseDays.length > 0 ? Math.max(...purchaseDays.map(t => t.purchases)) : 0;
  const peakPurchaseDay = purchaseDays.find(t => t.purchases === peakPurchaseVal)?.date || 'N/A';
  const avgPurchases = trendData.length > 0 ? (summary?.totalPurchase || 0) / trendData.length : 0;
  const activePurchaseCount = purchaseDays.length;

  const handleExportCSV = () => {
    if (!summary || trendData.length === 0) {
      showToast('No report data available to export', 'warning');
      return;
    }

    if (activeSection === 'sales') {
      const headers = ['Date', 'Sales Amount (Rs.)'];
      const rows = trendData.map(t => [t.date, t.sales]);
      rows.push([]);
      rows.push(['Total Sales', summary.totalSales]);
      rows.push(['Cash Received', summary.cashReceived]);
      rows.push(['Pending Collection', summary.pendingCollection]);
      rows.push(['Avg Daily Sales', avgSales.toFixed(2)]);
      rows.push(['Peak Sales Day', `${peakSalesDay} (${formatCur(peakSalesVal)})`]);
      
      // Add Customer breakdown section in CSV
      rows.push([]);
      rows.push(['CUSTOMER SALES BREAKDOWN (Sorted by Total)']);
      rows.push(['Customer Name', 'Total Sales (Rs.)', 'Paid Amount (Rs.)', 'Balance Due (Rs.)']);
      customerBreakdown.forEach(cust => {
        rows.push([cust.name, cust.total, cust.paid, cust.balance]);
      });

      exportToCSV(`Sales_Report_${reportType}_${selectedDate}`, headers, rows);
      showToast('Sales report exported to CSV!', 'success');
    } else if (activeSection === 'purchase') {
      const headers = ['Date', 'Purchase Amount (Rs.)'];
      const rows = trendData.map(t => [t.date, t.purchases]);
      rows.push([]);
      rows.push(['Total Purchases', summary.totalPurchase]);
      rows.push(['Cash Paid', summary.cashPaid]);
      rows.push(['Avg Daily Purchases', avgPurchases.toFixed(2)]);
      rows.push(['Peak Purchases Day', `${peakPurchaseDay} (${formatCur(peakPurchaseVal)})`]);

      // Add Vendor breakdown section in CSV
      rows.push([]);
      rows.push(['VENDOR PURCHASE BREAKDOWN (Sorted by Total)']);
      rows.push(['Vendor Name', 'Total Purchases (Rs.)', 'Paid Amount (Rs.)', 'Balance Due (Rs.)']);
      vendorBreakdown.forEach(vend => {
        rows.push([vend.name, vend.total, vend.paid, vend.balance]);
      });

      exportToCSV(`Purchase_Report_${reportType}_${selectedDate}`, headers, rows);
      showToast('Purchase report exported to CSV!', 'success');
    } else {
      const headers = ['Date', 'Sales (Rs.)', 'Purchases (Rs.)'];
      const rows = trendData.map(t => [t.date, t.sales, t.purchases]);
      
      rows.push([]);
      rows.push(['Total Sales', summary.totalSales, '']);
      rows.push(['Total Purchases', summary.totalPurchase, '']);
      rows.push(['Bank Deposit', summary.bankDeposit, '']);
      rows.push(['Cash Received', summary.cashReceived, '']);
      rows.push(['Cash Paid', summary.cashPaid, '']);
      rows.push(['Net Profit', summary.profit, '']);

      exportToCSV(`Overview_Report_${reportType}_${selectedDate}`, headers, rows);
      showToast('Report exported successfully to CSV!', 'success');
    }
  };

  // Custom Chart Tooltips
  const CombinedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-lg text-xs font-sans">
          <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1.5">{label}</p>
          <p className="text-violet-650 dark:text-violet-400 font-semibold mb-1">
            Sales: {formatCur(payload[0].value)}
          </p>
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Purchases: {formatCur(payload[1].value)}
          </p>
        </div>
      );
    }
    return null;
  };


  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      {/* Header Title & Section Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Reports & Analytics</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Track financial health, sales performance, and vendor purchase metrics.
          </p>
        </div>
        
        {/* Section Selector */}
        <div className="flex bg-zinc-150 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-250/20 w-fit">
          <button
            onClick={() => setActiveSection('overview')}
            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
              activeSection === 'overview'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveSection('sales')}
            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
              activeSection === 'sales'
                ? 'bg-white dark:bg-zinc-800 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Sales
          </button>
          <button
            onClick={() => setActiveSection('purchase')}
            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer ${
              activeSection === 'purchase'
                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Purchases
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
        {/* Tab Selection */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-250/20 w-fit">
          {(['daily', 'weekly', 'monthly'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setReportType(tab)}
              className={`px-5 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                reportType === tab
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab} Report
            </button>
          ))}
        </div>

        {/* Date Filter & Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Date:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="h-[400px] bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-2xl" />
        </div>
      ) : (
        <>
          {/* OVERVIEW SECTION */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* KPI Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {/* Sales Card */}
                <div 
                  onClick={() => setActiveSection('sales')}
                  className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 hover:border-violet-500/30 dark:hover:border-violet-500/30 cursor-pointer rounded-2xl p-5 shadow-sm flex items-start gap-4 transition-all hover:shadow-md group"
                >
                  <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-650 dark:text-violet-400 group-hover:scale-105 transition-transform">
                    <CircleDollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Total Sales
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.totalSales || 0)}
                    </h4>
                  </div>
                </div>

                {/* Purchases Card */}
                <div 
                  onClick={() => setActiveSection('purchase')}
                  className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 cursor-pointer rounded-2xl p-5 shadow-sm flex items-start gap-4 transition-all hover:shadow-md group"
                >
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Total Purchases
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.totalPurchase || 0)}
                    </h4>
                  </div>
                </div>

                {/* Deposits Card */}
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Bank Deposits
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.bankDeposit || 0)}
                    </h4>
                  </div>
                </div>

                {/* Cash Received Card */}
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Cash Received
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.cashReceived || 0)}
                    </h4>
                  </div>
                </div>

                {/* Cash Paid Card */}
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Cash Paid
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.cashPaid || 0)}
                    </h4>
                  </div>
                </div>

                {/* Pending Collection Card */}
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Pending Collections
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.pendingCollection || 0)}
                    </h4>
                  </div>
                </div>

                {/* Net Profit Card */}
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4 sm:col-span-2 xl:col-span-2">
                  <div className={`p-3 rounded-xl ${
                    (summary?.profit || 0) >= 0 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Net Balance Difference (Profit/Loss Estimate)
                    </p>
                    <h4 className={`text-lg font-extrabold mt-1 truncate ${
                      (summary?.profit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {formatCur(summary?.profit || 0)}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Combined Chart */}
              <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Transaction Trend Analysis ({reportType.toUpperCase()})
                </h3>
                
                <div className="h-[400px] w-full font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" className="dark:stroke-zinc-800/30" />
                      
                      <XAxis 
                        dataKey="date" 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10} 
                        style={{ fontSize: '10px', fill: '#888888' }} 
                      />
                      
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        dx={-5} 
                        style={{ fontSize: '10px', fill: '#888888' }} 
                      />
                      
                      <Tooltip content={<CombinedTooltip />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      
                      <Area 
                        type="monotone" 
                        name="Sales"
                        dataKey="sales" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorSales)" 
                      />
                      <Area 
                        type="monotone" 
                        name="Purchases"
                        dataKey="purchases" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorPurchases)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          )}

          {/* SALES SECTION */}
          {activeSection === 'sales' && (
            <div className="space-y-6">
              {/* Sales Specific KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-650 dark:text-violet-400">
                    <CircleDollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Total Sales
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.totalSales || 0)}
                    </h4>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Cash Received
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.cashReceived || 0)}
                    </h4>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-605 dark:text-rose-455">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Pending Collection
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.pendingCollection || 0)}
                    </h4>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Avg. Daily Sales
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(avgSales)}
                    </h4>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4 sm:col-span-2 xl:col-span-2">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Peak Sales Day
                    </p>
                    <h4 className="text-base font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(peakSalesVal)} <span className="text-xs font-medium text-zinc-400 dark:text-zinc-505 font-mono">({peakSalesDay})</span>
                    </h4>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4 sm:col-span-2 xl:col-span-2">
                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Sales Activity Ratio
                    </p>
                    <h4 className="text-base font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {activeSalesCount} of {trendData.length} Days <span className="text-xs font-medium text-zinc-400 dark:text-zinc-505">({((activeSalesCount / (trendData.length || 1)) * 100).toFixed(0)}% Active)</span>
                    </h4>
                  </div>
                </div>
              </div>

              {/* Sales Details Breakdown Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Daily Breakdown Table */}
                <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-500" />
                    Daily Sales Breakdown
                  </h3>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto border border-zinc-150 dark:border-zinc-850 rounded-xl animate-fade-in">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10 border-b border-zinc-200 dark:border-zinc-800">
                        <tr className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3 text-right">Sales Amount</th>
                          <th className="px-5 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {trendData.slice().reverse().map((day) => (
                          <tr key={day.date} className="text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                            <td className="px-5 py-3 font-mono font-medium">{day.date}</td>
                            <td className="px-5 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                              {formatCur(day.sales)}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                                day.sales > 0
                                  ? 'bg-violet-100 dark:bg-violet-950/30 text-violet-850 dark:text-violet-400'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-505'
                              }`}>
                                {day.sales > 0 ? 'Transactions' : 'No Sales'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Customer Sales Breakdown Table */}
                <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-violet-500" />
                    Sales by Customer (Sorted by Total)
                  </h3>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    {customerBreakdown.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10 border-b border-zinc-200 dark:border-zinc-800">
                          <tr className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            <th className="px-5 py-3">Customer Name</th>
                            <th className="px-5 py-3 text-right">Total Sales</th>
                            <th className="px-5 py-3 text-right">Paid</th>
                            <th className="px-5 py-3 text-right">Balance Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {customerBreakdown.map((cust, i) => (
                            <tr key={i} className="text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                              <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{cust.name}</td>
                              <td className="px-5 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                {formatCur(cust.total)}
                              </td>
                              <td className="px-5 py-3 text-right text-emerald-650 dark:text-emerald-450 font-medium">
                                {formatCur(cust.paid)}
                              </td>
                              <td className={`px-5 py-3 text-right font-bold ${cust.balance > 0 ? 'text-amber-600 dark:text-amber-505' : 'text-zinc-400'}`}>
                                {formatCur(cust.balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-505">
                        No customer transactions in this period.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* PURCHASE SECTION */}
          {activeSection === 'purchase' && (
            <div className="space-y-6">
              {/* Purchase Specific KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Total Purchases
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.totalPurchase || 0)}
                    </h4>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Cash Paid
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(summary?.cashPaid || 0)}
                    </h4>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Avg. Daily Purchase
                    </p>
                    <h4 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(avgPurchases)}
                    </h4>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4 sm:col-span-2 xl:col-span-2 flex-1">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Peak Purchases Day
                    </p>
                    <h4 className="text-base font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {formatCur(peakPurchaseVal)} <span className="text-xs font-medium text-zinc-400 dark:text-zinc-505 font-mono">({peakPurchaseDay})</span>
                    </h4>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-start gap-4 sm:col-span-2 xl:col-span-2">
                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">
                      Purchase Activity Ratio
                    </p>
                    <h4 className="text-base font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 truncate">
                      {activePurchaseCount} of {trendData.length} Days <span className="text-xs font-medium text-zinc-400 dark:text-zinc-505">({((activePurchaseCount / (trendData.length || 1)) * 105).toFixed(0)}% Active)</span>
                    </h4>
                  </div>
                </div>
              </div>

              {/* Purchase Details Breakdown Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Purchases Daily Breakdown Table */}
                <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-505" />
                    Daily Purchase Breakdown
                  </h3>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10 border-b border-zinc-200 dark:border-zinc-800">
                        <tr className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3 text-right">Purchase Amount</th>
                          <th className="px-5 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {trendData.slice().reverse().map((day) => (
                          <tr key={day.date} className="text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                            <td className="px-5 py-3 font-mono font-medium">{day.date}</td>
                            <td className="px-5 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                              {formatCur(day.purchases)}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                                day.purchases > 0
                                  ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-505'
                              }`}>
                                {day.purchases > 0 ? 'Purchased' : 'No Purchase'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Vendor Purchase Breakdown Table */}
                <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    Purchases by Vendor (Sorted by Total)
                  </h3>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    {vendorBreakdown.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10 border-b border-zinc-200 dark:border-zinc-800">
                          <tr className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            <th className="px-5 py-3">Vendor Name</th>
                            <th className="px-5 py-3 text-right">Total Purchase</th>
                            <th className="px-5 py-3 text-right">Paid</th>
                            <th className="px-5 py-3 text-right">Balance Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {vendorBreakdown.map((vend, i) => (
                            <tr key={i} className="text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                              <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{vend.name}</td>
                              <td className="px-5 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                {formatCur(vend.total)}
                              </td>
                              <td className="px-5 py-3 text-right text-rose-600 dark:text-rose-400 font-medium">
                                {formatCur(vend.paid)}
                              </td>
                              <td className={`px-5 py-3 text-right font-bold ${vend.balance > 0 ? 'text-amber-600 dark:text-amber-505' : 'text-zinc-400'}`}>
                                {formatCur(vend.balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-505">
                        No vendor transactions in this period.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
