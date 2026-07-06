import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// Helper to generate the next sequential Purchase Bill No
async function generateNextPurchaseBillNo(db) {
  const purchases = await db.all('SELECT bill_no FROM purchases');
  let maxNum = 0;
  purchases.forEach(pur => {
    const match = pur.bill_no.match(/PUR-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = maxNum + 1;
  return `PUR-${String(nextNum).padStart(5, '0')}`;
}

// Get next purchase bill number
router.get('/next-bill-no', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const nextBillNo = await generateNextPurchaseBillNo(db);
    res.json({ nextBillNo });
  } catch (error) {
    console.error('Fetch next purchase bill no error:', error);
    res.status(500).json({ error: 'Failed to generate next purchase bill number' });
  }
});

// Get all purchases with vendor details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const purchases = await db.all(`
      SELECT p.*, v.name as vendor_name, v.mobile as vendor_mobile 
      FROM purchases p 
      JOIN vendors v ON p.vendor_id = v.id 
      ORDER BY p.date DESC, p.id DESC
    `);
    res.json(purchases);
  } catch (error) {
    console.error('Fetch purchases error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase transactions' });
  }
});

// Add a new purchase
router.post('/', authenticateToken, async (req, res) => {
  const {
    date,
    vendor_id,
    purchase_type,
    total_amount,
    payment_status,
    paid_amount,
    due_date
  } = req.body;

  // Validation
  if (!date || !vendor_id || !purchase_type || !payment_status) {
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
    
    // Check if vendor exists
    const vendor = await db.get('SELECT * FROM vendors WHERE id = ?', [vendor_id]);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Auto-generate next sequential bill number
    const bill_no = await generateNextPurchaseBillNo(db);

    const result = await db.run(
      `INSERT INTO purchases (
        bill_no, date, vendor_id, purchase_type, total_amount, 
        payment_status, paid_amount, balance_amount, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bill_no,
        date,
        vendor_id,
        purchase_type,
        total,
        payment_status,
        paid,
        balance,
        purchase_type === 'Credit' && payment_status !== 'Full Payment' ? (due_date || '') : ''
      ]
    );

    res.status(201).json({
      id: result.lastID,
      bill_no,
      date,
      vendor_id,
      vendor_name: vendor.name,
      purchase_type,
      total_amount: total,
      payment_status,
      paid_amount: paid,
      balance_amount: balance,
      due_date: due_date || ''
    });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Failed to create purchase transaction' });
  }
});

// Delete a purchase (Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only administrators can delete transactions' });
  }

  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM purchases WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Purchase record not found' });
    }
    
    res.json({ message: 'Purchase transaction deleted successfully' });
  } catch (error) {
    console.error('Delete purchase error:', error);
    res.status(500).json({ error: 'Failed to delete purchase transaction' });
  }
});

export default router;
