import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// Get all bank entries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const entries = await db.all('SELECT * FROM bank_entries ORDER BY date DESC, id DESC');
    res.json(entries);
  } catch (error) {
    console.error('Fetch banking entries error:', error);
    res.status(500).json({ error: 'Failed to fetch banking entries' });
  }
});

// Add a new bank entry
router.post('/', authenticateToken, async (req, res) => {
  const {
    date,
    bank_name,
    account_name,
    amount,
    transaction_type,
    reference_no,
    remarks
  } = req.body;

  // Validation
  if (!date || !bank_name || !account_name || !transaction_type) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  if (!['Deposit', 'Withdrawal'].includes(transaction_type)) {
    return res.status(400).json({ error: 'Transaction type must be Deposit or Withdrawal' });
  }

  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO bank_entries (
        date, bank_name, account_name, amount, transaction_type, reference_no, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        date,
        bank_name,
        account_name,
        numericAmount,
        transaction_type,
        reference_no || '',
        remarks || ''
      ]
    );

    res.status(201).json({
      id: result.lastID,
      date,
      bank_name,
      account_name,
      amount: numericAmount,
      transaction_type,
      reference_no: reference_no || '',
      remarks: remarks || ''
    });
  } catch (error) {
    console.error('Create bank entry error:', error);
    res.status(500).json({ error: 'Failed to create bank entry' });
  }
});

// Delete a bank entry (Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only administrators can delete transactions' });
  }

  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM bank_entries WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Bank entry not found' });
    }
    
    res.json({ message: 'Bank transaction deleted successfully' });
  } catch (error) {
    console.error('Delete bank entry error:', error);
    res.status(500).json({ error: 'Failed to delete bank transaction' });
  }
});

export default router;
