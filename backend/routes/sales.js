import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// Helper to generate the next sequential Bill No
async function generateNextBillNo(db) {
  const sales = await db.all('SELECT bill_no FROM sales');
  let maxNum = 0;
  sales.forEach(sale => {
    const match = sale.bill_no.match(/SALE-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = maxNum + 1;
  return `SALE-${String(nextNum).padStart(5, '0')}`;
}

// Get next bill number
router.get('/next-bill-no', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const nextBillNo = await generateNextBillNo(db);
    res.json({ nextBillNo });
  } catch (error) {
    console.error('Fetch next bill no error:', error);
    res.status(500).json({ error: 'Failed to generate next bill number' });
  }
});

// Get all sales with customer details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const sales = await db.all(`
      SELECT s.*, c.name as customer_name, c.mobile as customer_mobile 
      FROM sales s 
      JOIN customers c ON s.customer_id = c.id 
      ORDER BY s.date DESC, s.id DESC
    `);
    res.json(sales);
  } catch (error) {
    console.error('Fetch sales error:', error);
    res.status(500).json({ error: 'Failed to fetch sales transactions' });
  }
});

// Add a new sale
router.post('/', authenticateToken, async (req, res) => {
  const {
    date,
    customer_id,
    payment_type,
    total_amount,
    payment_status,
    paid_amount,
    notes,
    due_date
  } = req.body;

  // Validation
  if (!date || !customer_id || !payment_type || !payment_status) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  const total = parseFloat(total_amount);
  const paid = parseFloat(paid_amount);

  if (isNaN(total) || total < 0) {
    return res.status(400).json({ error: 'Total amount must be a positive number' });
  }

  if (isNaN(paid) || paid < 0) {
    return res.status(400).json({ error: 'Paid amount must be a positive number' });
  }

  if (paid > total) {
    return res.status(400).json({ error: 'Paid amount cannot exceed total amount' });
  }

  // Recalculate balance server-side
  const balance = parseFloat((total - paid).toFixed(2));

  try {
    const db = await getDb();
    
    // Check if customer exists
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customer_id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Auto-generate next sequential bill number
    const bill_no = await generateNextBillNo(db);

    const result = await db.run(
      `INSERT INTO sales (
        bill_no, date, customer_id, payment_type, total_amount, 
        payment_status, paid_amount, balance_amount, notes, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bill_no,
        date,
        customer_id,
        payment_type,
        total,
        payment_status,
        paid,
        balance,
        notes || '',
        payment_type === 'Credit' && payment_status !== 'Full Payment' ? (due_date || '') : ''
      ]
    );

    res.status(201).json({
      id: result.lastID,
      bill_no,
      date,
      customer_id,
      customer_name: customer.name,
      payment_type,
      total_amount: total,
      payment_status,
      paid_amount: paid,
      balance_amount: balance,
      notes: notes || '',
      due_date: due_date || ''
    });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Failed to create sale transaction' });
  }
});

// Delete a sale (Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only administrators can delete transactions' });
  }

  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM sales WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Sale record not found' });
    }
    
    res.json({ message: 'Sale transaction deleted successfully' });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ error: 'Failed to delete sale transaction' });
  }
});

export default router;
