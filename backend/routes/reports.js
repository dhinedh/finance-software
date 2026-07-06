import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// Helper to get date ranges in Node.js to keep SQLite queries simple
function getWeekRange(refDateStr) {
  const ref = new Date(refDateStr);
  const day = ref.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = ref.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const start = new Date(ref.setDate(diff));
  
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

function getMonthRange(refDateStr) {
  const parts = refDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-indexed
  
  const start = `${parts[0]}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${parts[0]}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  return { start, end };
}

// 1. GET /api/reports/dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  const today = req.query.today || new Date().toISOString().split('T')[0];

  try {
    const db = await getDb();

    // Today's Sales
    const todaySales = await db.get(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE date = ?",
      [today]
    );

    // Today's Purchases
    const todayPurchases = await db.get(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE date = ?",
      [today]
    );

    // Today's Bank Deposit
    const todayBankDeposits = await db.get(
      "SELECT COALESCE(SUM(amount), 0) as total FROM bank_entries WHERE date = ? AND transaction_type = 'Deposit'",
      [today]
    );

    // Pending Sales (Total Receivables)
    const pendingSales = await db.get(
      "SELECT COALESCE(SUM(balance_amount), 0) as total FROM sales WHERE balance_amount > 0"
    );

    // Pending Purchases (Total Payables)
    const pendingPurchases = await db.get(
      "SELECT COALESCE(SUM(balance_amount), 0) as total FROM purchases WHERE balance_amount > 0"
    );

    // Cash Balance Calculation:
    // Cash Sales Paid + Bank Withdrawals - Cash Purchases Paid - Bank Deposits
    const cashSalesPaid = await db.get("SELECT COALESCE(SUM(paid_amount), 0) as total FROM sales WHERE payment_type = 'Cash'");
    const cashPurchasesPaid = await db.get("SELECT COALESCE(SUM(paid_amount), 0) as total FROM purchases WHERE purchase_type = 'Cash'");
    const bankWithdrawals = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM bank_entries WHERE transaction_type = 'Withdrawal'");
    const bankDeposits = await db.get("SELECT COALESCE(SUM(amount), 0) as total FROM bank_entries WHERE transaction_type = 'Deposit'");

    const cashBalance = parseFloat(
      (cashSalesPaid.total + bankWithdrawals.total - cashPurchasesPaid.total - bankDeposits.total).toFixed(2)
    );

    // Bank Balance Calculation:
    // Bank Deposits - Bank Withdrawals
    const bankBalance = parseFloat(
      (bankDeposits.total - bankWithdrawals.total).toFixed(2)
    );

    res.json({
      todaySales: todaySales.total,
      todayPurchases: todayPurchases.total,
      todayBankDeposit: todayBankDeposits.total,
      pendingSales: pendingSales.total,
      pendingPurchases: pendingPurchases.total,
      cashBalance,
      bankBalance
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to compute dashboard metrics' });
  }
});

// 2. GET /api/reports/summary
// Generates summary cards and trend data based on report tab (daily, weekly, monthly)
router.get('/summary', authenticateToken, async (req, res) => {
  const { type, date } = req.query; // type: daily, weekly, monthly; date: YYYY-MM-DD
  if (!type || !date) {
    return res.status(400).json({ error: 'Type and date query parameters are required' });
  }

  try {
    const db = await getDb();
    let start, end;
    let trendQuery = '';
    let trendParams = [];

    if (type === 'daily') {
      start = date;
      end = date;
      
      // Daily Report: Last 7 days trend
      const sevenDaysAgo = new Date(date);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const startTrend = sevenDaysAgo.toISOString().split('T')[0];

      trendQuery = `
        SELECT date, 
               COALESCE(SUM(sales_total), 0) as sales,
               COALESCE(SUM(purchases_total), 0) as purchases
        FROM (
          SELECT date, total_amount as sales_total, 0 as purchases_total FROM sales WHERE date BETWEEN ? AND ?
          UNION ALL
          SELECT date, 0 as sales_total, total_amount as purchases_total FROM purchases WHERE date BETWEEN ? AND ?
        )
        GROUP BY date
        ORDER BY date ASC
      `;
      trendParams = [startTrend, date, startTrend, date];

    } else if (type === 'weekly') {
      const range = getWeekRange(date);
      start = range.start;
      end = range.end;

      // Weekly Report: Trend for days within this week
      trendQuery = `
        SELECT date, 
               COALESCE(SUM(sales_total), 0) as sales,
               COALESCE(SUM(purchases_total), 0) as purchases
        FROM (
          SELECT date, total_amount as sales_total, 0 as purchases_total FROM sales WHERE date BETWEEN ? AND ?
          UNION ALL
          SELECT date, 0 as sales_total, total_amount as purchases_total FROM purchases WHERE date BETWEEN ? AND ?
        )
        GROUP BY date
        ORDER BY date ASC
      `;
      trendParams = [start, end, start, end];

    } else if (type === 'monthly') {
      const range = getMonthRange(date);
      start = range.start;
      end = range.end;

      // Monthly Report: Aggregated day-by-day trend in that month
      trendQuery = `
        SELECT date, 
               COALESCE(SUM(sales_total), 0) as sales,
               COALESCE(SUM(purchases_total), 0) as purchases
        FROM (
          SELECT date, total_amount as sales_total, 0 as purchases_total FROM sales WHERE date BETWEEN ? AND ?
          UNION ALL
          SELECT date, 0 as sales_total, total_amount as purchases_total FROM purchases WHERE date BETWEEN ? AND ?
        )
        GROUP BY date
        ORDER BY date ASC
      `;
      trendParams = [start, end, start, end];
    } else {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    // Metrics for the selected date range
    const totalSales = await db.get(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE date BETWEEN ? AND ?",
      [start, end]
    );

    const totalPurchases = await db.get(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE date BETWEEN ? AND ?",
      [start, end]
    );

    const totalBankDeposits = await db.get(
      "SELECT COALESCE(SUM(amount), 0) as total FROM bank_entries WHERE transaction_type = 'Deposit' AND date BETWEEN ? AND ?",
      [start, end]
    );

    const cashReceived = await db.get(
      "SELECT COALESCE(SUM(paid_amount), 0) as total FROM sales WHERE payment_type = 'Cash' AND date BETWEEN ? AND ?",
      [start, end]
    );

    const cashPaid = await db.get(
      "SELECT COALESCE(SUM(paid_amount), 0) as total FROM purchases WHERE purchase_type = 'Cash' AND date BETWEEN ? AND ?",
      [start, end]
    );

    const pendingCollection = await db.get(
      "SELECT COALESCE(SUM(balance_amount), 0) as total FROM sales WHERE date BETWEEN ? AND ? AND balance_amount > 0",
      [start, end]
    );

    const rawTrend = await db.all(trendQuery, trendParams);
    
    // Ensure trend has all dates in the range to display clean charts on the front end
    const trendMap = {};
    rawTrend.forEach(t => {
      trendMap[t.date] = { sales: t.sales, purchases: t.purchases };
    });

    const trend = [];
    let curr = new Date(start);
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

    const customerBreakdown = await db.all(
      `SELECT c.name as name, 
              COALESCE(SUM(s.total_amount), 0) as total,
              COALESCE(SUM(s.paid_amount), 0) as paid,
              COALESCE(SUM(s.balance_amount), 0) as balance
       FROM sales s
       JOIN customers c ON s.customer_id = c.id
       WHERE s.date BETWEEN ? AND ?
       GROUP BY s.customer_id
       ORDER BY total DESC`,
      [start, end]
    );

    const vendorBreakdown = await db.all(
      `SELECT v.name as name, 
              COALESCE(SUM(p.total_amount), 0) as total,
              COALESCE(SUM(p.paid_amount), 0) as paid,
              COALESCE(SUM(p.balance_amount), 0) as balance
       FROM purchases p
       JOIN vendors v ON p.vendor_id = v.id
       WHERE p.date BETWEEN ? AND ?
       GROUP BY p.vendor_id
       ORDER BY total DESC`,
      [start, end]
    );

    res.json({
      summary: {
        totalSales: totalSales.total,
        totalPurchase: totalPurchases.total,
        bankDeposit: totalBankDeposits.total,
        cashReceived: cashReceived.total,
        cashPaid: cashPaid.total,
        pendingCollection: pendingCollection.total,
        profit: parseFloat((totalSales.total - totalPurchases.total).toFixed(2))
      },
      trend,
      customerBreakdown,
      vendorBreakdown
    });

  } catch (error) {
    console.error('Fetch reports summary error:', error);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

// 3. GET /api/reports/pending
// Pending Payments Report
router.get('/pending', authenticateToken, async (req, res) => {
  const { filter } = req.query; // 'today', 'week', 'month', or 'all'
  const today = new Date().toISOString().split('T')[0];

  try {
    const db = await getDb();
    let dateFilter = '';
    let params = [];

    if (filter === 'today') {
      dateFilter = "AND due_date = ?";
      params = [today];
    } else if (filter === 'week') {
      const range = getWeekRange(today);
      dateFilter = "AND due_date BETWEEN ? AND ?";
      params = [range.start, range.end];
    } else if (filter === 'month') {
      const range = getMonthRange(today);
      dateFilter = "AND due_date BETWEEN ? AND ?";
      params = [range.start, range.end];
    }

    // Pending Sales (Receivables)
    const salesPending = await db.all(`
      SELECT s.id, s.bill_no, s.date, s.total_amount, s.paid_amount, s.balance_amount, s.due_date,
             c.name as customer_name, c.mobile as customer_mobile
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      WHERE s.balance_amount > 0 ${dateFilter}
      ORDER BY s.due_date ASC, s.id DESC
    `, params);

    // Pending Purchases (Payables)
    const purchasesPending = await db.all(`
      SELECT p.id, p.bill_no, p.date, p.total_amount, p.paid_amount, p.balance_amount, p.due_date,
             v.name as vendor_name, v.mobile as vendor_mobile
      FROM purchases p
      JOIN vendors v ON p.vendor_id = v.id
      WHERE p.balance_amount > 0 ${dateFilter}
      ORDER BY p.due_date ASC, p.id DESC
    `, params);

    res.json({
      salesPending,
      purchasesPending
    });
  } catch (error) {
    console.error('Fetch pending reports error:', error);
    res.status(500).json({ error: 'Failed to load pending payments' });
  }
});

export default router;
