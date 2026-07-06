import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// Get all vendors
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const vendors = await db.all('SELECT * FROM vendors ORDER BY name ASC');
    res.json(vendors);
  } catch (error) {
    console.error('Fetch vendors error:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Add a new vendor
router.post('/', authenticateToken, async (req, res) => {
  const { name, mobile, address, gst_number } = req.body;

  if (!name || !mobile || !address) {
    return res.status(400).json({ error: 'Name, mobile, and address are required' });
  }

  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO vendors (name, mobile, address, gst_number) VALUES (?, ?, ?, ?)',
      [name, mobile, address, gst_number || '']
    );

    res.status(201).json({
      id: result.lastID,
      name,
      mobile,
      address,
      gst_number: gst_number || ''
    });
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// Update vendor details
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, mobile, address, gst_number } = req.body;

  if (!name || !mobile || !address) {
    return res.status(400).json({ error: 'Name, mobile, and address are required' });
  }

  try {
    const db = await getDb();
    const vendor = await db.get('SELECT * FROM vendors WHERE id = ?', [id]);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    await db.run(
      'UPDATE vendors SET name = ?, mobile = ?, address = ?, gst_number = ? WHERE id = ?',
      [name, mobile, address, gst_number || '', id]
    );

    res.json({ id: parseInt(id), name, mobile, address, gst_number: gst_number || '' });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// Delete vendor
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    
    // Check for linked purchases
    const linkedPurchases = await db.get('SELECT COUNT(*) as count FROM purchases WHERE vendor_id = ?', [id]);
    if (linkedPurchases.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vendor: Linked transactions exist. Delete those purchase records first.' 
      });
    }

    const result = await db.run('DELETE FROM vendors WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// Get linked transaction history for a vendor
router.get('/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    const vendor = await db.get('SELECT name FROM vendors WHERE id = ?', [id]);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const history = await db.all(
      'SELECT id, bill_no, date, purchase_type, total_amount, payment_status, paid_amount, balance_amount, due_date FROM purchases WHERE vendor_id = ? ORDER BY date DESC, id DESC',
      [id]
    );

    res.json({ vendorName: vendor.name, history });
  } catch (error) {
    console.error('Fetch vendor history error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor history' });
  }
});

export default router;
