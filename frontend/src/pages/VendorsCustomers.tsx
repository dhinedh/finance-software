import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  FileText, 
  MapPin, 
  Phone,
  Hash,
  ChevronLeft,
  ChevronsLeft,
  ChevronRight,
  ChevronsRight
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

interface Contact {
  id: number;
  name: string;
  mobile: string;
  address: string;
  gst_number: string;
}

interface TransactionHistory {
  id: number;
  bill_no: string;
  date: string;
  payment_type?: string;
  purchase_type?: string;
  total_amount: number;
  payment_status: string;
  paid_amount: number;
  balance_amount: number;
  due_date: string;
  notes?: string;
}

const VendorsCustomers: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'customers' | 'vendors'>('customers');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sliding Side Panel State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [history, setHistory] = useState<TransactionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Pagination for contacts
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchContacts();
    setSelectedContact(null);
    setHistory([]);
  }, [activeTab]);

  useEffect(() => {
    if (selectedContact) {
      fetchHistory(selectedContact.id);
    }
  }, [selectedContact]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'customers' ? '/customers' : '/vendors';
      const response = await api.get(endpoint);
      setContacts(response.data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      showToast('Error loading directory entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (id: number) => {
    setHistoryLoading(true);
    try {
      const endpoint = activeTab === 'customers' 
        ? `/customers/${id}/history` 
        : `/vendors/${id}/history`;
      const response = await api.get(endpoint);
      setHistory(response.data.history);
    } catch (error) {
      console.error('Failed to load transaction history:', error);
      showToast('Error loading contact history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setContactToEdit(null);
    setName('');
    setMobile('');
    setAddress('');
    setGstNumber('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening history panel on button click
    setContactToEdit(contact);
    setName(contact.name);
    setMobile(contact.mobile);
    setAddress(contact.address);
    setGstNumber(contact.gst_number);
    setIsFormModalOpen(true);
  };

  const handleSaveContact = async () => {
    if (!name.trim() || !mobile.trim() || !address.trim()) {
      showToast('Name, mobile, and address are required.', 'warning');
      return;
    }

    const payload = {
      name: name.trim(),
      mobile: mobile.trim(),
      address: address.trim(),
      gst_number: gstNumber.trim()
    };

    try {
      const endpoint = activeTab === 'customers' ? '/customers' : '/vendors';
      
      if (contactToEdit) {
        // Edit existing
        const response = await api.put(`${endpoint}/${contactToEdit.id}`, payload);
        setContacts(prev => prev.map(c => c.id === contactToEdit.id ? response.data : c));
        if (selectedContact?.id === contactToEdit.id) {
          setSelectedContact(response.data);
        }
        showToast('Profile updated successfully!', 'success');
      } else {
        // Create new
        const response = await api.post(endpoint, payload);
        setContacts(prev => [response.data, ...prev]);
        showToast('New profile created successfully!', 'success');
      }
      setIsFormModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Failed to save directory entry.', 'error');
    }
  };

  const handleDeleteClick = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setContactToDelete(contact);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    try {
      const endpoint = activeTab === 'customers' ? '/customers' : '/vendors';
      await api.delete(`${endpoint}/${contactToDelete.id}`);
      setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
      if (selectedContact?.id === contactToDelete.id) {
        setSelectedContact(null);
      }
      showToast('Directory profile deleted successfully', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.error || 'Failed to delete contact record', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setContactToDelete(null);
    }
  };

  // Filter and pagination
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.mobile.includes(searchQuery) ||
    (c.gst_number && c.gst_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col max-w-[1600px] mx-auto select-none overflow-hidden">
      {/* Directory Menu Toolbar */}
      <section className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0 mb-6">
        <div className="flex items-center gap-3">
          {/* Toggle Type */}
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-250/20">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-5 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-5 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'vendors'
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Vendors
            </button>
          </div>

          {/* Add Profile Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Profile
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-3.5 h-3.5" />
          </div>
        </div>
      </section>

      {/* Main split grid (List Table w-2/3 & Sliding Panel w-1/3) */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Contacts Table List */}
        <section className={`bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${
          selectedContact ? 'w-full lg:w-2/3' : 'w-full'
        }`}>
          {loading ? (
            <div className="p-8 space-y-4 flex-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                {paginatedContacts.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10 border-b border-zinc-200 dark:border-zinc-800">
                      <tr className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        <th className="px-5 py-3">Details Name</th>
                        <th className="px-5 py-3">Mobile</th>
                        <th className="px-5 py-3">Address</th>
                        <th className="px-5 py-3">GSTIN</th>
                        <th className="px-5 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {paginatedContacts.map(c => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedContact(c)}
                          className={`text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors ${
                            selectedContact?.id === c.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5 font-bold text-zinc-900 dark:text-zinc-50">{c.name}</td>
                          <td className="px-5 py-3.5 font-medium">{c.mobile}</td>
                          <td className="px-5 py-3.5 max-w-xs truncate">{c.address}</td>
                          <td className="px-5 py-3.5 font-mono text-xs">{c.gst_number || '-'}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={(e) => handleOpenEditModal(c, e)}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-250 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {user?.role === 'Admin' && (
                                <button
                                  onClick={(e) => handleDeleteClick(c, e)}
                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-450 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center text-zinc-500">
                    <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                    <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">No records found</h4>
                    <p className="text-xs text-zinc-400 max-w-sm mt-1">
                      No directory entries match your query. Click "Add Profile" to create a new {activeTab.slice(0,-1)}.
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination bar */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredContacts.length)} of {filteredContacts.length}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 text-zinc-500"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 text-zinc-500"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 text-zinc-500"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 text-zinc-500"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Sliding Transaction History Drawer */}
        {selectedContact && (
          <section className="hidden lg:flex w-1/3 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex-col animate-slide-in-right">
            {/* Header */}
            <div className="p-5 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
                  {selectedContact.name}
                </h3>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold tracking-wider uppercase block mt-0.5">
                  Transaction History
                </span>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info details blocks */}
            <div className="p-5 bg-zinc-50/50 dark:bg-[#0e0e13]/30 border-b border-zinc-100 dark:border-zinc-800/80 space-y-2.5 shrink-0 text-xs text-zinc-650 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{selectedContact.mobile}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{selectedContact.address}</span>
              </div>
              {selectedContact.gst_number && (
                <div className="flex items-center gap-2 font-mono">
                  <Hash className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>GST: {selectedContact.gst_number}</span>
                </div>
              )}
            </div>

            {/* History Table List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : history.length > 0 ? (
                history.map(tx => (
                  <div 
                    key={tx.id} 
                    className="p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850/60 bg-zinc-50/20 dark:bg-[#0c0c0f]/20 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{tx.bill_no}</span>
                      <span className="text-[10px] text-zinc-400">{tx.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Invoice: <strong>₹{tx.total_amount.toFixed(2)}</strong></span>
                      <span className={`font-bold ${tx.balance_amount > 0 ? 'text-rose-600 dark:text-rose-450' : 'text-emerald-600 dark:text-emerald-500'}`}>
                        {tx.balance_amount > 0 ? `Due: ₹${tx.balance_amount.toFixed(2)}` : 'Fully Paid'}
                      </span>
                    </div>
                    {tx.notes && (
                      <p className="italic text-[10px] text-zinc-450 dark:text-zinc-500 border-l border-zinc-200 pl-2">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-450 text-center py-10">
                  <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-xs">No transaction history found for this {activeTab.slice(0, -1)}.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Directory form modal (Add/Edit) */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={contactToEdit ? `Edit ${activeTab.slice(0, -1)} Details` : `Add New ${activeTab.slice(0, -1)} Profile`}
        onConfirm={handleSaveContact}
        confirmLabel={contactToEdit ? 'Save Changes' : 'Create Profile'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit phone"
              className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Billing/Office Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full mailing address"
              className="w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              GST Number (Optional)
            </label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
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
        title={`Delete ${activeTab.slice(0, -1)} Record?`}
        onConfirm={confirmDeleteContact}
        confirmLabel="Yes, Delete Profile"
        type="danger"
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Are you sure you want to permanently delete <strong>{contactToDelete?.name}</strong>? This profile cannot be removed if they have linked transactions.
        </p>
      </Modal>
    </div>
  );
};

export default VendorsCustomers;
