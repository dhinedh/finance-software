import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// Get all customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const customers = await db.all('SELECT * FROM customers ORDER BY name ASC');
    res.json(customers);
  } catch (error) {
    console.error('Fetch customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Add a new customer
router.post('/', authenticateToken, async (req, res) => {
  const { name, mobile, address, gst_number } = req.body;

  if (!name || !mobile || !address) {
    return res.status(400).json({ error: 'Name, mobile, and address are required' });
  }

  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO customers (name, mobile, address, gst_number) VALUES (?, ?, ?, ?)',
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
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer details
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, mobile, address, gst_number } = req.body;

  if (!name || !mobile || !address) {
    return res.status(400).json({ error: 'Name, mobile, and address are required' });
  }

  try {
    const db = await getDb();
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await db.run(
      'UPDATE customers SET name = ?, mobile = ?, address = ?, gst_number = ? WHERE id = ?',
      [name, mobile, address, gst_number || '', id]
    );

    res.json({ id: parseInt(id), name, mobile, address, gst_number: gst_number || '' });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    
    // Check for linked sales
    const linkedSales = await db.get('SELECT COUNT(*) as count FROM sales WHERE customer_id = ?', [id]);
    if (linkedSales.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer: Linked transactions exist. Delete those sales records first.' 
      });
    }

    const result = await db.run('DELETE FROM customers WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Get linked transaction history for a customer
router.get('/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    const customer = await db.get('SELECT name FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const history = await db.all(
      'SELECT id, bill_no, date, payment_type, total_amount, payment_status, paid_amount, balance_amount, notes, due_date FROM sales WHERE customer_id = ? ORDER BY date DESC, id DESC',
      [id]
    );

    res.json({ customerName: customer.name, history });
  } catch (error) {
    console.error('Fetch customer history error:', error);
    res.status(500).json({ error: 'Failed to fetch customer history' });
  }
});

export default router;
