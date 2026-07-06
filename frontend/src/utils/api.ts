// Client-side localStorage Mock API Client
// This replaces the backend server for a zero-server browser-only deployment on Vercel.

const getStorageItem = (key: string, defaultVal: any) => {
  const val = localStorage.getItem(key);
  if (!val) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
};

const setStorageItem = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// Seed default data if not present
const seedData = () => {
  getStorageItem('shop_users', [
    { id: 1, username: 'admin', password: 'admin123', role: 'Admin' },
    { id: 2, username: 'staff', password: 'staff123', role: 'Staff' }
  ]);
  getStorageItem('shop_customers', [
    { id: 1, name: 'John Doe', mobile: '9876543210', address: '123 Main Street, City', gst_number: '27AAAAA1111A1Z1' },
    { id: 2, name: 'Jane Smith', mobile: '8765432109', address: '456 Oak Avenue, Metro', gst_number: '' }
  ]);
  getStorageItem('shop_vendors', [
    { id: 1, name: 'Wholesale Corp', mobile: '9998887776', address: '789 Industrial Area, Hub', gst_number: '27BBBBB2222B2Z2' },
    { id: 2, name: 'Primary Distributors', mobile: '8887776665', address: '101 Trade Plaza, Center', gst_number: '' }
  ]);
  getStorageItem('shop_sales', []);
  getStorageItem('shop_purchases', []);
  getStorageItem('shop_bank_entries', []);
};
seedData();

// Date helpers for reports
const getWeekRange = (refDateStr: string) => {
  const ref = new Date(refDateStr);
  const day = ref.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = ref.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(ref.setDate(diff));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};

const getMonthRange = (refDateStr: string) => {
  const parts = refDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const start = `${parts[0]}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${parts[0]}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

const api = {
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} }
  },
  defaults: {
    headers: {
      common: {}
    }
  },

  get: async <T = any>(url: string): Promise<{ data: T }> => {
    const [path, queryPart] = url.split('?');
    const queryParams: Record<string, string> = {};
    if (queryPart) {
      queryPart.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        queryParams[k] = decodeURIComponent(v);
      });
    }

    await new Promise(r => setTimeout(r, 100));

    const checkAuth = () => {
      if (!localStorage.getItem('token')) {
        const err: any = new Error('Unauthorized');
        err.response = { status: 401, data: { error: 'Unauthorized' } };
        throw err;
      }
    };

    if (path === '/auth/me') {
      checkAuth();
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return { data: user } as any;
    }

    if (path === '/customers') {
      checkAuth();
      return { data: getStorageItem('shop_customers', []) } as any;
    }

    if (path === '/vendors') {
      checkAuth();
      return { data: getStorageItem('shop_vendors', []) } as any;
    }

    if (path === '/sales/next-bill-no') {
      checkAuth();
      const sales = getStorageItem('shop_sales', []);
      let maxNum = 0;
      sales.forEach((sale: any) => {
        const match = sale.bill_no.match(/SALE-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const nextNum = maxNum + 1;
      return { data: { nextBillNo: `SALE-${String(nextNum).padStart(5, '0')}` } } as any;
    }

    if (path === '/purchases/next-bill-no') {
      checkAuth();
      const purchases = getStorageItem('shop_purchases', []);
      let maxNum = 0;
      purchases.forEach((pur: any) => {
        const match = pur.bill_no.match(/PUR-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const nextNum = maxNum + 1;
      return { data: { nextBillNo: `PUR-${String(nextNum).padStart(5, '0')}` } } as any;
    }

    if (path === '/sales') {
      checkAuth();
      const sales = getStorageItem('shop_sales', []);
      const customers = getStorageItem('shop_customers', []);
      const mapped = sales.map((s: any) => {
        const c = customers.find((cust: any) => cust.id === s.customer_id);
        return {
          ...s,
          customer_name: c ? c.name : 'Unknown',
          customer_mobile: c ? c.mobile : '',
          customer_address: c ? c.address : ''
        };
      });
      return { data: mapped } as any;
    }

    if (path === '/purchases') {
      checkAuth();
      const purchases = getStorageItem('shop_purchases', []);
      const vendors = getStorageItem('shop_vendors', []);
      const mapped = purchases.map((p: any) => {
        const v = vendors.find((vend: any) => vend.id === p.vendor_id);
        return {
          ...p,
          vendor_name: v ? v.name : 'Unknown',
          vendor_mobile: v ? v.mobile : ''
        };
      });
      return { data: mapped } as any;
    }

    if (path === '/banking') {
      checkAuth();
      return { data: getStorageItem('shop_bank_entries', []) } as any;
    }

    // Customer history: /customers/:id/history
    if (path.startsWith('/customers/') && path.endsWith('/history')) {
      checkAuth();
      const id = parseInt(path.split('/')[2], 10);
      const sales = getStorageItem('shop_sales', []);
      const history = sales.filter((s: any) => s.customer_id === id).map((s: any) => ({
        id: s.id,
        bill_no: s.bill_no,
        date: s.date,
        payment_type: s.payment_type,
        total_amount: s.total_amount,
        payment_status: s.payment_status,
        paid_amount: s.paid_amount,
        balance_amount: s.balance_amount,
        due_date: s.due_date,
        notes: s.notes
      }));
      return { data: { history } } as any;
    }

    // Vendor history: /vendors/:id/history
    if (path.startsWith('/vendors/') && path.endsWith('/history')) {
      checkAuth();
      const id = parseInt(path.split('/')[2], 10);
      const purchases = getStorageItem('shop_purchases', []);
      const history = purchases.filter((p: any) => p.vendor_id === id).map((p: any) => ({
        id: p.id,
        bill_no: p.bill_no,
        date: p.date,
        purchase_type: p.purchase_type,
        total_amount: p.total_amount,
        payment_status: p.payment_status,
        paid_amount: p.paid_amount,
        balance_amount: p.balance_amount,
        due_date: p.due_date
      }));
      return { data: { history } } as any;
    }

    if (path === '/reports/dashboard') {
      checkAuth();
      const today = queryParams.today || new Date().toISOString().split('T')[0];
      const sales = getStorageItem('shop_sales', []);
      const purchases = getStorageItem('shop_purchases', []);
      const bankEntries = getStorageItem('shop_bank_entries', []);

      const todaySales = sales.filter((s: any) => s.date === today).reduce((sum: number, s: any) => sum + s.total_amount, 0);
      const todayPurchases = purchases.filter((p: any) => p.date === today).reduce((sum: number, p: any) => sum + p.total_amount, 0);
      const todayBankDeposits = bankEntries.filter((b: any) => b.date === today && b.transaction_type === 'Deposit').reduce((sum: number, b: any) => sum + b.amount, 0);
      
      const pendingSales = sales.reduce((sum: number, s: any) => sum + s.balance_amount, 0);
      const pendingPurchases = purchases.reduce((sum: number, p: any) => sum + p.balance_amount, 0);

      const cashSalesPaid = sales.filter((s: any) => s.payment_type === 'Cash').reduce((sum: number, s: any) => sum + s.paid_amount, 0);
      const cashPurchasesPaid = purchases.filter((p: any) => p.purchase_type === 'Cash').reduce((sum: number, p: any) => sum + p.paid_amount, 0);
      const bankWithdrawals = bankEntries.filter((b: any) => b.transaction_type === 'Withdrawal').reduce((sum: number, b: any) => sum + b.amount, 0);
      const bankDeposits = bankEntries.filter((b: any) => b.transaction_type === 'Deposit').reduce((sum: number, b: any) => sum + b.amount, 0);

      const cashBalance = parseFloat((cashSalesPaid + bankWithdrawals - cashPurchasesPaid - bankDeposits).toFixed(2));
      const bankBalance = parseFloat((bankDeposits - bankWithdrawals).toFixed(2));

      return {
        data: {
          todaySales,
          todayPurchases,
          todayBankDeposit: todayBankDeposits,
          pendingSales,
          pendingPurchases,
          cashBalance,
          bankBalance
        }
      } as any;
    }

    if (path === '/reports/summary') {
      checkAuth();
      const type = queryParams.type; // daily, weekly, monthly
      const date = queryParams.date;

      let start = '';
      let end = '';
      let trendStart = '';

      if (type === 'daily') {
        start = date;
        end = date;
        const ref = new Date(date);
        ref.setDate(ref.getDate() - 6);
        trendStart = ref.toISOString().split('T')[0];
      } else if (type === 'weekly') {
        const range = getWeekRange(date);
        start = range.start;
        end = range.end;
        trendStart = start;
      } else {
        const range = getMonthRange(date);
        start = range.start;
        end = range.end;
        trendStart = start;
      }

      const sales = getStorageItem('shop_sales', []);
      const purchases = getStorageItem('shop_purchases', []);
      const bankEntries = getStorageItem('shop_bank_entries', []);
      const customers = getStorageItem('shop_customers', []);
      const vendors = getStorageItem('shop_vendors', []);

      // Summary stats in [start, end]
      const rangeSales = sales.filter((s: any) => s.date >= start && s.date <= end);
      const rangePurchases = purchases.filter((p: any) => p.date >= start && p.date <= end);
      const rangeBank = bankEntries.filter((b: any) => b.date >= start && b.date <= end);

      const totalSales = rangeSales.reduce((sum: number, s: any) => sum + s.total_amount, 0);
      const totalPurchase = rangePurchases.reduce((sum: number, p: any) => sum + p.total_amount, 0);
      const bankDeposit = rangeBank.filter((b: any) => b.transaction_type === 'Deposit').reduce((sum: number, b: any) => sum + b.amount, 0);
      const cashReceived = rangeSales.filter((s: any) => s.payment_type === 'Cash').reduce((sum: number, s: any) => sum + s.paid_amount, 0);
      const cashPaid = rangePurchases.filter((p: any) => p.purchase_type === 'Cash').reduce((sum: number, p: any) => sum + p.paid_amount, 0);
      const pendingCollection = rangeSales.reduce((sum: number, s: any) => sum + s.balance_amount, 0);

      // Trend data in [trendStart, end]
      const trendMap: Record<string, { sales: number; purchases: number }> = {};
      sales.filter((s: any) => s.date >= trendStart && s.date <= end).forEach((s: any) => {
        if (!trendMap[s.date]) trendMap[s.date] = { sales: 0, purchases: 0 };
        trendMap[s.date].sales += s.total_amount;
      });
      purchases.filter((p: any) => p.date >= trendStart && p.date <= end).forEach((p: any) => {
        if (!trendMap[p.date]) trendMap[p.date] = { sales: 0, purchases: 0 };
        trendMap[p.date].purchases += p.total_amount;
      });

      const trend = [];
      let curr = new Date(trendStart);
      const stop = new Date(end);
      while (curr <= stop) {
        const dStr = curr.toISOString().split('T')[0];
        trend.push({
          date: dStr,
          sales: trendMap[dStr]?.sales || 0,
          purchases: trendMap[dStr]?.purchases || 0
        });
        curr.setDate(curr.getDate() + 1);
      }

      // Customer breakdown in [start, end]
      const custMap: Record<number, { name: string; total: number; paid: number; balance: number }> = {};
      rangeSales.forEach((s: any) => {
        if (!custMap[s.customer_id]) {
          const c = customers.find((cust: any) => cust.id === s.customer_id);
          custMap[s.customer_id] = { name: c ? c.name : 'Unknown', total: 0, paid: 0, balance: 0 };
        }
        custMap[s.customer_id].total += s.total_amount;
        custMap[s.customer_id].paid += s.paid_amount;
        custMap[s.customer_id].balance += s.balance_amount;
      });
      const customerBreakdown = Object.values(custMap).sort((a, b) => b.total - a.total);

      // Vendor breakdown in [start, end]
      const vendMap: Record<number, { name: string; total: number; paid: number; balance: number }> = {};
      rangePurchases.forEach((p: any) => {
        if (!vendMap[p.vendor_id]) {
          const v = vendors.find((vend: any) => vend.id === p.vendor_id);
          vendMap[p.vendor_id] = { name: v ? v.name : 'Unknown', total: 0, paid: 0, balance: 0 };
        }
        vendMap[p.vendor_id].total += p.total_amount;
        vendMap[p.vendor_id].paid += p.paid_amount;
        vendMap[p.vendor_id].balance += p.balance_amount;
      });
      const vendorBreakdown = Object.values(vendMap).sort((a, b) => b.total - a.total);

      return {
        data: {
          summary: {
            totalSales,
            totalPurchase,
            bankDeposit,
            cashReceived,
            cashPaid,
            pendingCollection,
            profit: parseFloat((totalSales - totalPurchase).toFixed(2))
          },
          trend,
          customerBreakdown,
          vendorBreakdown
        }
      } as any;
    }

    if (path === '/reports/pending') {
      checkAuth();
      const filter = queryParams.filter;
      const today = new Date().toISOString().split('T')[0];

      let start = '';
      let end = '';
      let hasFilter = false;

      if (filter === 'today') {
        start = today;
        end = today;
        hasFilter = true;
      } else if (filter === 'week') {
        const range = getWeekRange(today);
        start = range.start;
        end = range.end;
        hasFilter = true;
      } else if (filter === 'month') {
        const range = getMonthRange(today);
        start = range.start;
        end = range.end;
        hasFilter = true;
      }

      const sales = getStorageItem('shop_sales', []);
      const purchases = getStorageItem('shop_purchases', []);
      const customers = getStorageItem('shop_customers', []);
      const vendors = getStorageItem('shop_vendors', []);

      let salesPending = sales.filter((s: any) => s.balance_amount > 0);
      let purchasesPending = purchases.filter((p: any) => p.balance_amount > 0);

      if (hasFilter) {
        salesPending = salesPending.filter((s: any) => s.due_date >= start && s.due_date <= end);
        purchasesPending = purchasesPending.filter((p: any) => p.due_date >= start && p.due_date <= end);
      }

      const salesPendingMapped = salesPending.map((s: any) => {
        const c = customers.find((cust: any) => cust.id === s.customer_id);
        return {
          id: s.id,
          bill_no: s.bill_no,
          date: s.date,
          total_amount: s.total_amount,
          paid_amount: s.paid_amount,
          balance_amount: s.balance_amount,
          due_date: s.due_date,
          customer_name: c ? c.name : 'Unknown',
          customer_mobile: c ? c.mobile : ''
        };
      });

      const purchasesPendingMapped = purchasesPending.map((p: any) => {
        const v = vendors.find((vend: any) => vend.id === p.vendor_id);
        return {
          id: p.id,
          bill_no: p.bill_no,
          date: p.date,
          total_amount: p.total_amount,
          paid_amount: p.paid_amount,
          balance_amount: p.balance_amount,
          due_date: p.due_date,
          vendor_name: v ? v.name : 'Unknown',
          vendor_mobile: v ? v.mobile : ''
        };
      });

      return {
        data: {
          salesPending: salesPendingMapped,
          purchasesPending: purchasesPendingMapped
        }
      } as any;
    }

    const err: any = new Error('Not Found');
    err.response = { status: 404, data: { error: 'Endpoint not found' } };
    throw err;
  },

  post: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    const [path] = url.split('?');
    await new Promise(r => setTimeout(r, 100));

    const checkAuth = () => {
      if (!localStorage.getItem('token')) {
        const err: any = new Error('Unauthorized');
        err.response = { status: 401, data: { error: 'Unauthorized' } };
        throw err;
      }
    };

    if (path === '/auth/login') {
      const { username, password } = body || {};
      const users = getStorageItem('shop_users', []);
      const user = users.find((u: any) => u.username === username && u.password === password);
      if (user) {
        localStorage.setItem('token', 'mock-token-' + Date.now());
        const userSession = { username: user.username, role: user.role };
        localStorage.setItem('user', JSON.stringify(userSession));
        return { data: { token: 'mock-token', user: userSession } } as any;
      } else {
        const err: any = new Error('Invalid credentials');
        err.response = { status: 401, data: { error: 'Invalid username or password' } };
        throw err;
      }
    }

    if (path === '/customers') {
      checkAuth();
      const list = getStorageItem('shop_customers', []);
      const newCust = {
        id: list.length > 0 ? Math.max(...list.map((c: any) => c.id)) + 1 : 1,
        name: body.name,
        mobile: body.mobile,
        address: body.address,
        gst_number: body.gst_number || ''
      };
      list.push(newCust);
      setStorageItem('shop_customers', list);
      return { data: newCust } as any;
    }

    if (path === '/vendors') {
      checkAuth();
      const list = getStorageItem('shop_vendors', []);
      const newVend = {
        id: list.length > 0 ? Math.max(...list.map((v: any) => v.id)) + 1 : 1,
        name: body.name,
        mobile: body.mobile,
        address: body.address,
        gst_number: body.gst_number || ''
      };
      list.push(newVend);
      setStorageItem('shop_vendors', list);
      return { data: newVend } as any;
    }

    if (path === '/sales') {
      checkAuth();
      const list = getStorageItem('shop_sales', []);
      const newSale = {
        id: list.length > 0 ? Math.max(...list.map((s: any) => s.id)) + 1 : 1,
        bill_no: body.bill_no,
        date: body.date,
        customer_id: body.customer_id,
        payment_type: body.payment_type,
        total_amount: body.total_amount,
        payment_status: body.payment_status,
        paid_amount: body.paid_amount,
        balance_amount: body.balance_amount,
        notes: body.notes || '',
        due_date: body.due_date || null
      };
      list.push(newSale);
      setStorageItem('shop_sales', list);
      return { data: newSale } as any;
    }

    if (path === '/purchases') {
      checkAuth();
      const list = getStorageItem('shop_purchases', []);
      const newPurchase = {
        id: list.length > 0 ? Math.max(...list.map((p: any) => p.id)) + 1 : 1,
        bill_no: body.bill_no,
        date: body.date,
        vendor_id: body.vendor_id,
        purchase_type: body.purchase_type,
        total_amount: body.total_amount,
        payment_status: body.payment_status,
        paid_amount: body.paid_amount,
        balance_amount: body.balance_amount,
        due_date: body.due_date || null
      };
      list.push(newPurchase);
      setStorageItem('shop_purchases', list);
      return { data: newPurchase } as any;
    }

    if (path === '/banking') {
      checkAuth();
      const list = getStorageItem('shop_bank_entries', []);
      const newEntry = {
        id: list.length > 0 ? Math.max(...list.map((b: any) => b.id)) + 1 : 1,
        date: body.date,
        bank_name: body.bank_name,
        account_name: body.account_name,
        amount: body.amount,
        transaction_type: body.transaction_type,
        reference_no: body.reference_no || '',
        remarks: body.remarks || ''
      };
      list.push(newEntry);
      setStorageItem('shop_bank_entries', list);
      return { data: newEntry } as any;
    }

    const err: any = new Error('Not Found');
    err.response = { status: 404, data: { error: 'Endpoint not found' } };
    throw err;
  },

  put: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    const [path] = url.split('?');
    await new Promise(r => setTimeout(r, 100));

    const checkAuth = () => {
      if (!localStorage.getItem('token')) {
        const err: any = new Error('Unauthorized');
        err.response = { status: 401, data: { error: 'Unauthorized' } };
        throw err;
      }
    };

    if (path.startsWith('/customers/')) {
      checkAuth();
      const id = parseInt(path.split('/')[2], 10);
      const list = getStorageItem('shop_customers', []);
      const index = list.findIndex((c: any) => c.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...body };
        setStorageItem('shop_customers', list);
        return { data: list[index] } as any;
      }
    }

    if (path.startsWith('/vendors/')) {
      checkAuth();
      const id = parseInt(path.split('/')[2], 10);
      const list = getStorageItem('shop_vendors', []);
      const index = list.findIndex((v: any) => v.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...body };
        setStorageItem('shop_vendors', list);
        return { data: list[index] } as any;
      }
    }

    const err: any = new Error('Not Found');
    err.response = { status: 404, data: { error: 'Endpoint not found' } };
    throw err;
  },

  delete: async <T = any>(url: string): Promise<{ data: T }> => {
    const [path] = url.split('?');
    await new Promise(r => setTimeout(r, 100));

    const checkAuth = () => {
      if (!localStorage.getItem('token')) {
        const err: any = new Error('Unauthorized');
        err.response = { status: 401, data: { error: 'Unauthorized' } };
        throw err;
      }
    };

    if (path.startsWith('/customers/')) {
      checkAuth();
      const id = parseInt(path.split('/')[2], 10);
      const list = getStorageItem('shop_customers', []);
      const filtered = list.filter((c: any) => c.id !== id);
      setStorageItem('shop_customers', filtered);
      return { data: { success: true } } as any;
    }

    if (path.startsWith('/vendors/')) {
      checkAuth();
      const id = parseInt(path.split('/')[2], 10);
      const list = getStorageItem('shop_vendors', []);
      const filtered = list.filter((v: any) => v.id !== id);
      setStorageItem('shop_vendors', filtered);
      return { data: { success: true } } as any;
    }

    if (path.startsWith('/sales/')) {
      checkAuth();
      const id = parseInt(path.split('/')[2], 10);
      const list = getStorageItem('shop_sales', []);
      const filtered = list.filter((s: any) => s.id !== id);
      setStorageItem('shop_sales', filtered);
      return { data: { success: true } } as any;
    }

    if (path.startsWith('/purchases/')) {
      checkAuth();
      const id = parseInt(path.split('/')[2], 10);
      const list = getStorageItem('shop_purchases', []);
      const filtered = list.filter((p: any) => p.id !== id);
      setStorageItem('shop_purchases', filtered);
      return { data: { success: true } } as any;
    }

    if (path.startsWith('/banking/')) {
      checkAuth();
      const id = parseInt(path.split('/')[2], 10);
      const list = getStorageItem('shop_bank_entries', []);
      const filtered = list.filter((b: any) => b.id !== id);
      setStorageItem('shop_bank_entries', filtered);
      return { data: { success: true } } as any;
    }

    const err: any = new Error('Not Found');
    err.response = { status: 404, data: { error: 'Endpoint not found' } };
    throw err;
  }
};

export default api;
