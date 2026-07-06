import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  Search,
  BookOpen
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

interface BankEntry {
  id: number;
  date: string;
  bank_name: string;
  account_name: string;
  amount: number;
  transaction_type: 'Deposit' | 'Withdrawal';
  reference_no: string;
  remarks: string;
}

const Banking: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form States
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bankName, setBankName] = useState('SBI');
  const [customBankName, setCustomBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'Deposit' | 'Withdrawal'>('Deposit');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const popularBanks = ['SBI', 'HDFC', 'ICICI', 'Axis', 'PNB', 'Canara Bank', 'Bank of Baroda', 'Other'];

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/banking');
      setEntries(response.data);
    } catch (error) {
      console.error('Failed to load banking logs:', error);
      showToast('Error loading banking transaction history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'Date is required.';
    
    const finalBank = bankName === 'Other' ? customBankName.trim() : bankName;
    if (!finalBank) newErrors.bankName = 'Bank name is required.';
    
    if (!accountName.trim()) newErrors.accountName = 'Account name is required.';
    
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      newErrors.amount = 'Amount must be a positive number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const numAmt = parseFloat(amount);
    const finalBank = bankName === 'Other' ? customBankName.trim() : bankName;

    try {
      const payload = {
        date,
        bank_name: finalBank,
        account_name: accountName.trim(),
        amount: numAmt,
        transaction_type: transactionType,
        reference_no: referenceNo.trim(),
        remarks: remarks.trim()
      };

      const response = await api.post('/banking', payload);
      setEntries(prev => [response.data, ...prev]);
      
      showToast(`Bank ${transactionType.toLowerCase()} saved successfully!`, 'success');

      // Reset fields
      setAmount('');
      setReferenceNo('');
      setRemarks('');
      setErrors({});
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.error || 'Failed to save bank entry.', 'error');
    }
  };

  const handleDeleteClick = (id: number) => {
    setEntryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    try {
      await api.delete(`/banking/${entryToDelete}`);
      setEntries(prev => prev.filter(e => e.id !== entryToDelete));
      showToast('Bank entry reversed successfully', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.error || 'Failed to delete bank entry', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setEntryToDelete(null);
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.reference_no && entry.reference_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-96 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Daily Entry Form */}
        <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm xl:col-span-1">
          <h3 className="text-md font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-5 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            New Bank Transaction
          </h3>

          <form onSubmit={handleSaveEntry} className="space-y-4">
            {/* Transaction Type Choice */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-[#0c0c0f] p-1 rounded-xl border border-zinc-250/20">
                {(['Deposit', 'Withdrawal'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTransactionType(type)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      transactionType === type
                        ? type === 'Deposit'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-rose-600 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {type} Funds
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
                />
                {errors.date && <span className="text-[10px] text-rose-500 mt-1 font-medium">{errors.date}</span>}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  className={`w-full bg-white dark:bg-[#09090b] border ${
                    errors.amount ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-zinc-800'
                  } rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100`}
                />
                {errors.amount && <span className="text-[10px] text-rose-500 mt-1 font-medium">{errors.amount}</span>}
              </div>
            </div>

            {/* Bank Name Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Bank Name
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
              >
                {popularBanks.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              {errors.bankName && <span className="text-[10px] text-rose-500 mt-1 font-medium">{errors.bankName}</span>}
            </div>

            {/* Custom Bank Name Input */}
            {bankName === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Specify Bank Name
                </label>
                <input
                  type="text"
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  placeholder="e.g. State Bank of Mysore"
                  className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
                />
              </div>
            )}

            {/* Account Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Account Name / Holder
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Current A/c, Cash Vault A/c"
                className={`w-full bg-white dark:bg-[#09090b] border ${
                  errors.accountName ? 'border-rose-500 focus:ring-rose-500/20' : 'border-zinc-200 dark:border-zinc-800'
                } rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100`}
              />
              {errors.accountName && <span className="text-[10px] text-rose-500 mt-1 font-medium">{errors.accountName}</span>}
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Reference Number (Ref No)
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="UPI Ref, Cheque, IMPS Ref..."
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Remarks / Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100 resize-none"
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
            >
              Post Bank Entry
            </button>
          </form>
        </section>

        {/* Ledger Entries List */}
        <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm xl:col-span-2 overflow-hidden flex flex-col h-[700px]">
          {/* List Header */}
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/10">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 self-start sm:self-center">
              Bank Book Ledger Entries
            </h3>
            
            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search Bank, Account or Ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Table View */}
          <div className="flex-1 overflow-y-auto">
            {filteredEntries.length > 0 ? (
              <>
                {/* Desktop view */}
                <table className="hidden sm:table w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10 border-b border-zinc-200 dark:border-zinc-800">
                    <tr className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Bank Details</th>
                      <th className="px-5 py-3">Account</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredEntries.map(entry => {
                      const isDeposit = entry.transaction_type === 'Deposit';
                      return (
                        <tr 
                          key={entry.id} 
                          className="text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                        >
                          <td className="px-5 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">{entry.date}</td>
                          <td className="px-5 py-3.5">
                            <span className="block font-bold text-zinc-900 dark:text-zinc-100">{entry.bank_name}</span>
                            {entry.reference_no && (
                              <span className="block text-[10px] text-zinc-400 font-mono mt-0.5">Ref: {entry.reference_no}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-zinc-800 dark:text-zinc-200">{entry.account_name}</td>
                          <td className={`px-5 py-3.5 text-right font-extrabold ${isDeposit ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                            {isDeposit ? '+' : '-'}₹{entry.amount.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                              isDeposit 
                                ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400' 
                                : 'bg-rose-100 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400'
                            }`}>
                              {isDeposit ? <ArrowUpRight className="w-3 h-3 shrink-0" /> : <ArrowDownRight className="w-3 h-3 shrink-0" />}
                              <span>{entry.transaction_type}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {user?.role === 'Admin' ? (
                              <button
                                onClick={() => handleDeleteClick(entry.id)}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                title="Reverse Transaction"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-xs text-zinc-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800 p-4 space-y-3">
                  {filteredEntries.map(entry => {
                    const isDeposit = entry.transaction_type === 'Deposit';
                    return (
                      <div 
                        key={entry.id} 
                        className={`p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-zinc-50/20 dark:bg-[#0c0c0f] space-y-2`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{entry.date}</span>
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                            isDeposit 
                              ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800' 
                              : 'bg-rose-100 dark:bg-rose-950/30 text-rose-800'
                          }`}>
                            {entry.transaction_type}
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{entry.bank_name} - <span className="font-normal text-zinc-500">{entry.account_name}</span></p>
                          <p className={`font-extrabold ${isDeposit ? 'text-emerald-600' : 'text-rose-600'}`}>Amount: {isDeposit ? '+' : '-'}₹{entry.amount.toFixed(2)}</p>
                          {entry.reference_no && <p className="text-[10px] text-zinc-400 font-mono">Ref: {entry.reference_no}</p>}
                        </div>
                        {user?.role === 'Admin' && (
                          <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                              onClick={() => handleDeleteClick(entry.id)}
                              className="text-xs text-rose-600 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Entry
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-zinc-500">
                <BookOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">No bank ledger items</h4>
                <p className="text-xs text-zinc-400 max-w-sm mt-1">
                  Fill in the details on the left and submit to log cash/cheque deposits and withdrawals.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Reverse Bank entry?"
        onConfirm={confirmDeleteEntry}
        confirmLabel="Yes, Reverse Entry"
        type="danger"
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Are you sure you want to delete this bank ledger entry? This will reverse the calculated bank balances on the dashboard.
        </p>
      </Modal>
    </div>
  );
};

export default Banking;
