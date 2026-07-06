import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Trash2, 
  Search, 
  CheckCircle2
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import SelectSearch from '../components/SelectSearch';
import Modal from '../components/Modal';
import { generateInvoicePDF } from '../utils/pdf';

interface Customer {
  id: number;
  name: string;
  mobile: string;
  address: string;
  gst_number: string;
}

interface Sale {
  id: number;
  bill_no: string;
  date: string;
  customer_id: number;
  customer_name: string;
  customer_mobile: string;
  customer_address: string;
  payment_type: string;
  total_amount: number;
  payment_status: string;
  paid_amount: number;
  balance_amount: number;
  notes: string;
  due_date: string;
}

const Sales: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // List States
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form States
  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [paymentType, setPaymentType] = useState('Cash'); // Cash or Credit
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Full Payment'); // Full Payment or Partial Payment
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Modals & Save Feedback
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<number | null>(null);
  
  // Quick Customer Add Form States
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustGst, setNewCustGst] = useState('');

  // Last Saved Sale Details for Print/PDF promo banner
  const [lastSavedSale, setLastSavedSale] = useState<Sale | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  // Sync paid amount when payment status or total amount changes
  useEffect(() => {
    if (paymentStatus === 'Full Payment') {
      setPaidAmount(totalAmount);
    }
  }, [paymentStatus, totalAmount]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, custRes, nextBillRes] = await Promise.all([
        api.get('/sales'),
        api.get('/customers'),
        api.get('/sales/next-bill-no')
      ]);
      setSales(salesRes.data);
      setCustomers(custRes.data);
      setBillNo(nextBillRes.data.nextBillNo);
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('Error loading Sales module data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextBillNo = async () => {
    try {
      const response = await api.get('/sales/next-bill-no');
      setBillNo(response.data.nextBillNo);
    } catch (err) {
      console.error(err);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!customerId) newErrors.customerId = 'Customer is required.';
    if (!date) newErrors.date = 'Date is required.';
    
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0) {
      newErrors.totalAmount = 'Total amount must be a positive number.';
    }

    const paid = parseFloat(paidAmount || '0');
    if (isNaN(paid) || paid < 0) {
      newErrors.paidAmount = 'Paid amount must be 0 or positive.';
    } else if (total && paid > total) {
      newErrors.paidAmount = 'Paid amount cannot exceed total amount.';
    }

    if (paymentType === 'Credit' && paymentStatus !== 'Full Payment' && !dueDate) {
      newErrors.dueDate = 'Due date is required for credit transactions.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const total = parseFloat(totalAmount);
    const paid = parseFloat(paidAmount || '0');

    try {
      const payload = {
        date,
        customer_id: customerId,
        payment_type: paymentType,
        total_amount: total,
        payment_status: paymentStatus,
        paid_amount: paid,
        notes,
        due_date: paymentType === 'Credit' ? dueDate : ''
      };

      const response = await api.post('/sales', payload);
      const savedSale = response.data;
      
      showToast('Sale invoice recorded successfully!', 'success');
      
      // Update UI list
      setSales(prev => [savedSale, ...prev]);
      setLastSavedSale(savedSale);

      // Reset form fields
      setCustomerId('');
      setTotalAmount('');
      setPaidAmount('');
      setNotes('');
      setDueDate('');
      setPaymentType('Cash');
      setPaymentStatus('Full Payment');
      setErrors({});

      // Fetch next bill number
      fetchNextBillNo();
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.error || 'Failed to save sales transaction.', 'error');
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustName.trim() || !newCustMobile.trim() || !newCustAddress.trim()) {
      showToast('Name, mobile, and address are required.', 'warning');
      return;
    }

    try {
      const response = await api.post('/customers', {
        name: newCustName.trim(),
        mobile: newCustMobile.trim(),
        address: newCustAddress.trim(),
        gst_number: newCustGst.trim()
      });

      const newCustomer = response.data;
      setCustomers(prev => [...prev, newCustomer]);
      setCustomerId(newCustomer.id);
      
      showToast('New customer added successfully!', 'success');
      
      // Reset Modal
      setNewCustName('');
      setNewCustMobile('');
      setNewCustAddress('');
      setNewCustGst('');
      setIsCustomerModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Failed to add customer.', 'error');
    }
  };

  const handleDeleteClick = (id: number) => {
    setSaleToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    try {
      await api.delete(`/sales/${saleToDelete}`);
      setSales(prev => prev.filter(s => s.id !== saleToDelete));
      showToast('Sale invoice deleted successfully', 'success');
      if (lastSavedSale && lastSavedSale.id === saleToDelete) {
        setLastSavedSale(null);
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.error || 'Failed to delete sale transaction', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setSaleToDelete(null);
    }
  };

  const handleDownloadPDF = (sale: Sale) => {
    generateInvoicePDF(
      sale,
      sale.customer_name,
      sale.customer_mobile,
      sale.customer_address,
      true
    );
  };

  const handlePrint = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Invoice ${sale.bill_no}</title>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .table th { background-color: #f5f5f5; }
            .totals { float: right; width: 300px; }
            .totals table { width: 100%; }
            .totals td { padding: 5px 0; }
            .totals .bold { font-weight: bold; }
          </style>
        </head>
        <body onload="window.print();window.close();">
          <div class="header">
            <h2>MY GENERAL STORE INC.</h2>
            <p>123 Market Square, Central City | GSTIN: 27ABCDE1234F1Z1</p>
          </div>
          <div class="meta">
            <div>
              <h3>BILL TO:</h3>
              <p><strong>${sale.customer_name}</strong></p>
              <p>Mobile: ${sale.customer_mobile || 'N/A'}</p>
              <p>Address: ${sale.customer_address || 'N/A'}</p>
            </div>
            <div>
              <h3>INVOICE:</h3>
              <p><strong>Bill No:</strong> ${sale.bill_no}</p>
              <p><strong>Date:</strong> ${sale.date}</p>
              <p><strong>Mode:</strong> ${sale.payment_type}</p>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sales Settlement for Counter Goods</td>
                <td style="text-align: right;">Rs. ${sale.total_amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">Rs. ${sale.total_amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Paid Amount:</td>
                <td style="text-align: right;">Rs. ${sale.paid_amount.toFixed(2)}</td>
              </tr>
              <tr class="bold">
                <td>Balance Due:</td>
                <td style="text-align: right;">Rs. ${sale.balance_amount.toFixed(2)}</td>
              </tr>
              ${sale.due_date ? `<tr><td>Due Date:</td><td style="text-align: right; color: red;">${sale.due_date}</td></tr>` : ''}
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredSales = sales.filter(sale =>
    sale.bill_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const balance = totalAmount && paidAmount ? parseFloat(totalAmount) - parseFloat(paidAmount) : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-96 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* 1. Transaction Success Confirmation Banner */}
      {lastSavedSale && (
        <section className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-scale-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                Invoice {lastSavedSale.bill_no} saved successfully!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                Customer: {lastSavedSale.customer_name} | Total: Rs. {lastSavedSale.total_amount.toFixed(2)} | Balance: Rs. {lastSavedSale.balance_amount.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint(lastSavedSale)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100/50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Bill
            </button>
            <button
              onClick={() => handleDownloadPDF(lastSavedSale)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </div>
        </section>
      )}

      {/* 2. Stacked Layout: Form (Top) & Recent Activity (Bottom) */}
      <div className="space-y-6">
        {/* Entry Form */}
        <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-md font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            New Sales Entry
          </h3>
          
          <form onSubmit={handleSaveSale} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Bill No */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Bill No
                </label>
                <input
                  type="text"
                  value={billNo}
                  readOnly
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 font-mono focus:outline-none"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Customer Search Dropdown */}
            <SelectSearch
              label="Customer Name"
              options={customers}
              value={customerId}
              onChange={(id) => setCustomerId(id)}
              onAddNew={() => setIsCustomerModalOpen(true)}
              placeholder="Search or Select Customer"
              error={errors.customerId}
            />

            {/* Payment Type selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Payment Type
              </label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-[#0c0c0f] p-1 rounded-xl border border-zinc-250/20">
                {['Cash', 'Credit'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPaymentType(type)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      paymentType === type
                        ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {type} Sale
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing Numeric Inputs */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Amount */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Total Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="Total Amount"
                  className={`w-full bg-white dark:bg-[#09090b] border ${
                    errors.totalAmount ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500/20 focus:border-indigo-500'
                  } rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 transition-all text-zinc-950 dark:text-zinc-100`}
                />
                {errors.totalAmount && <span className="text-[10px] text-rose-500 mt-1 font-medium">{errors.totalAmount}</span>}
              </div>

              {/* Payment Status (Full/Partial) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
                >
                  <option value="Full Payment">Full Paid</option>
                  <option value="Partial Payment">Partial Paid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Paid Amount */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Paid Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  disabled={paymentStatus === 'Full Payment'}
                  placeholder="Paid Amount"
                  className={`w-full bg-white dark:bg-[#09090b] border ${
                    errors.paidAmount ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500/20 focus:border-indigo-500'
                  } rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 transition-all disabled:bg-zinc-100 dark:disabled:bg-zinc-900 disabled:text-zinc-400 text-zinc-950 dark:text-zinc-100`}
                />
                {errors.paidAmount && <span className="text-[10px] text-rose-500 mt-1 font-medium">{errors.paidAmount}</span>}
              </div>

              {/* Balance Amount (Auto-Calculated) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Balance Due (₹)
                </label>
                <input
                  type="text"
                  value={isNaN(balance) ? '0.00' : balance.toFixed(2)}
                  readOnly
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Credit Sale Due Date */}
            {paymentType === 'Credit' && paymentStatus !== 'Full Payment' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Credit Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  min={date}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full bg-white dark:bg-[#09090b] border ${
                    errors.dueDate ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-zinc-800'
                  } rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100`}
                />
                {errors.dueDate && <span className="text-[10px] text-rose-500 mt-1 font-medium">{errors.dueDate}</span>}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Remarks / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Item sizes, serials, customer remarks..."
                rows={2}
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
            >
              Save Transaction
            </button>
          </form>
        </section>

        {/* History Table */}
        <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px]">
          {/* List Toolbar */}
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/10">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 self-start sm:self-center">
              Recent Sales Invoices
            </h3>
            
            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search Bill No or Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto">
            {filteredSales.length > 0 ? (
              <>
                {/* Desktop/Tablet Table View */}
                <table className="hidden sm:table w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10 border-b border-zinc-200 dark:border-zinc-800">
                    <tr className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Bill Details</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3 text-right">Invoice Total</th>
                      <th className="px-5 py-3 text-right">Balance Due</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredSales.map(sale => {
                      const isOverdue = sale.balance_amount > 0 && sale.due_date && new Date(sale.due_date) < new Date();
                      return (
                        <tr 
                          key={sale.id}
                          className={`text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors ${
                            isOverdue ? 'bg-rose-50/20 dark:bg-rose-950/5' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5">
                            <span className="block font-mono font-bold text-zinc-900 dark:text-zinc-100">{sale.bill_no}</span>
                            <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">{sale.date}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="block font-semibold text-zinc-900 dark:text-zinc-100">{sale.customer_name}</span>
                            {sale.customer_mobile && <span className="text-[10px] text-zinc-400 block mt-0.5">{sale.customer_mobile}</span>}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                            ₹{sale.total_amount.toFixed(2)}
                          </td>
                          <td className={`px-5 py-3.5 text-right font-bold ${
                            sale.balance_amount > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-zinc-400'
                          }`}>
                            ₹{sale.balance_amount.toFixed(2)}
                            {sale.due_date && sale.balance_amount > 0 && (
                              <span className={`block text-[9px] font-medium mt-0.5 ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-zinc-400'}`}>
                                Due: {sale.due_date}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                              sale.balance_amount === 0
                                ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400'
                                : sale.paid_amount > 0
                                ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400'
                                : 'bg-rose-100 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400'
                            }`}>
                              {sale.balance_amount === 0 ? 'Fully Paid' : sale.paid_amount > 0 ? 'Partial' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handlePrint(sale)}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                title="Print Invoice"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(sale)}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {user?.role === 'Admin' && (
                                <button
                                  onClick={() => handleDeleteClick(sale.id)}
                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                  title="Delete Invoice"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mobile Cards View */}
                <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800 p-4 space-y-3">
                  {filteredSales.map(sale => {
                    const isOverdue = sale.balance_amount > 0 && sale.due_date && new Date(sale.due_date) < new Date();
                    return (
                      <div 
                        key={sale.id} 
                        className={`p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/20 dark:bg-[#0c0c0f] space-y-3 ${
                          isOverdue ? 'border-l-4 border-l-rose-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono font-bold text-zinc-950 dark:text-zinc-50">{sale.bill_no}</span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">{sale.date}</span>
                          </div>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                            sale.balance_amount === 0
                              ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800'
                              : 'bg-rose-100 dark:bg-rose-950/30 text-rose-800'
                          }`}>
                            {sale.balance_amount === 0 ? 'Paid' : 'Due'}
                          </span>
                        </div>
                        
                        <div className="text-xs space-y-1">
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200">Customer: {sale.customer_name}</p>
                          <p className="text-zinc-500">Invoice Total: <strong className="text-zinc-800 dark:text-zinc-200">₹{sale.total_amount.toFixed(2)}</strong></p>
                          <p className="text-zinc-500">Balance Due: <strong className="text-zinc-800 dark:text-zinc-200">₹{sale.balance_amount.toFixed(2)}</strong></p>
                          {sale.due_date && sale.balance_amount > 0 && (
                            <p className={`text-[10px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-zinc-400'}`}>Due Date: {sale.due_date}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <button
                            onClick={() => handlePrint(sale)}
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(sale)}
                            className="flex items-center gap-1 text-xs text-indigo-600"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                          {user?.role === 'Admin' && (
                            <button
                              onClick={() => handleDeleteClick(sale.id)}
                              className="flex items-center gap-1 text-xs text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-zinc-500">
                <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">No Sales recorded</h4>
                <p className="text-xs text-zinc-400 max-w-sm mt-1">
                  Fill in the sales entry form on the left and click "Save Transaction" to record your first sale.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Inline Customer Modal Dialog */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Add New Customer Profile"
        onConfirm={handleCreateCustomer}
        confirmLabel="Add Customer"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Mobile Number
            </label>
            <input
              type="tel"
              value={newCustMobile}
              onChange={(e) => setNewCustMobile(e.target.value)}
              placeholder="10-digit number"
              className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Address
            </label>
            <input
              type="text"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              placeholder="Street, City, State"
              className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              GST Number (Optional)
            </label>
            <input
              type="text"
              value={newCustGst}
              onChange={(e) => setNewCustGst(e.target.value)}
              placeholder="15-digit GSTIN"
              className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Sale Transaction?"
        onConfirm={confirmDeleteSale}
        confirmLabel="Yes, Delete Bill"
        type="danger"
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Are you sure you want to permanently delete this sales invoice? This action will reverse the entry in customer records and cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default Sales;
