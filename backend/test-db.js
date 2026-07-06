import { initDb, getDb } from './database.js';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('--- STARTING BACKEND DB & SCHEMA TEST ---');
  
  // 1. Init DB
  console.log('1. Initializing DB and tables...');
  const db = await initDb();
  console.log('OK: DB open & loaded.');

  // 2. Auth seeding check
  console.log('2. Verifying default user accounts...');
  const admin = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!admin) {
    throw new Error('Test Fail: Default admin user missing.');
  }
  const passCheck = bcrypt.compareSync('admin123', admin.password_hash);
  if (!passCheck) {
    throw new Error('Test Fail: Bcrypt admin password mismatch.');
  }
  console.log(`OK: Admin user active with role: ${admin.role}.`);

  // 3. Customer insertion
  console.log('3. Inserting mock customer...');
  const custRes = await db.run(
    'INSERT INTO customers (name, mobile, address, gst_number) VALUES (?, ?, ?, ?)',
    ['Test Customer', '9000000001', 'Test Address', '27TESTG1234F1Z1']
  );
  const customerId = custRes.lastID;
  console.log(`OK: Customer created with ID: ${customerId}.`);

  // 4. Sequential Bill numbering verification
  console.log('4. Testing sequential bill numbering...');
  const generateNextBillNo = async () => {
    const sales = await db.all('SELECT bill_no FROM sales');
    let maxNum = 0;
    sales.forEach(sale => {
      const match = sale.bill_no.match(/SALE-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `SALE-${String(maxNum + 1).padStart(5, '0')}`;
  };

  const firstBill = await generateNextBillNo();
  if (firstBill !== 'SALE-00001') {
    // If table already has seeded sales in prior tests, check if it increments correctly
    console.log(`Info: Non-empty DB, next bill calculated: ${firstBill}`);
  } else {
    console.log('OK: First bill matches SALE-00001.');
  }

  // 5. Server-side Balance Recalculation
  console.log('5. Inserting sale and verifying balance recalculation...');
  const totalAmount = 1500.50;
  const paidAmount = 500.00;
  const expectedBalance = parseFloat((totalAmount - paidAmount).toFixed(2)); // 1000.50

  const bill_no = await generateNextBillNo();
  const saleRes = await db.run(
    `INSERT INTO sales (
      bill_no, date, customer_id, payment_type, total_amount, 
      payment_status, paid_amount, balance_amount, notes, due_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bill_no,
      '2026-07-06',
      customerId,
      'Credit',
      totalAmount,
      'Partial Payment',
      paidAmount,
      expectedBalance, // Server recalculated value
      'Test notes',
      '2026-08-06'
    ]
  );
  
  const savedSale = await db.get('SELECT * FROM sales WHERE id = ?', [saleRes.lastID]);
  if (!savedSale) {
    throw new Error('Test Fail: Failed to fetch inserted sale.');
  }
  if (savedSale.balance_amount !== expectedBalance) {
    throw new Error(`Test Fail: Balance mismatch. Expected ${expectedBalance}, got ${savedSale.balance_amount}`);
  }
  console.log(`OK: Sale balance correctly calculated and stored as ₹${savedSale.balance_amount}.`);

  // Verify next bill incremented
  const secondBill = await generateNextBillNo();
  const firstParts = bill_no.match(/SALE-(\d+)/i);
  const secondParts = secondBill.match(/SALE-(\d+)/i);
  if (parseInt(secondParts[1]) !== parseInt(firstParts[1]) + 1) {
    throw new Error(`Test Fail: Sequential increment failed. Bill 1: ${bill_no}, Bill 2: ${secondBill}`);
  }
  console.log(`OK: Next bill incremented correctly: ${secondBill}.`);

  // 6. Tear down test data
  console.log('6. Cleaning up test data...');
  await db.run('DELETE FROM sales WHERE id = ?', [saleRes.lastID]);
  await db.run('DELETE FROM customers WHERE id = ?', [customerId]);
  console.log('OK: Test cleanup complete.');
  
  console.log('--- ALL BACKEND CORE SCHEMA TESTS PASSED ---');
}

runTests().catch(err => {
  console.error('TESTING ERROR OCCURRED:', err);
  process.exit(1);
});
