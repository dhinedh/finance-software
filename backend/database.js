import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'shop-erp.db');
let dbInstance = null;

export async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys support
  await dbInstance.run('PRAGMA foreign_keys = ON;');
  
  return dbInstance;
}

export async function initDb() {
  const db = await getDb();

  // Create Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Staff'
    )
  `);

  // Create Customers table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      address TEXT NOT NULL,
      gst_number TEXT
    )
  `);

  // Create Vendors table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      address TEXT NOT NULL,
      gst_number TEXT
    )
  `);

  // Create Sales table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      payment_type TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_status TEXT NOT NULL,
      paid_amount REAL NOT NULL,
      balance_amount REAL NOT NULL,
      notes TEXT,
      due_date TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT
    )
  `);

  // Create Purchases table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      vendor_id INTEGER NOT NULL,
      purchase_type TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_status TEXT NOT NULL,
      paid_amount REAL NOT NULL,
      balance_amount REAL NOT NULL,
      due_date TEXT,
      FOREIGN KEY(vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
    )
  `);

  // Create Bank Entries table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bank_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_type TEXT NOT NULL,
      reference_no TEXT,
      remarks TEXT
    )
  `);

  // Seeding default users
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const staffPasswordHash = bcrypt.hashSync('staff123', 10);
    
    await db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', adminPasswordHash, 'Admin']);
    await db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['staff', staffPasswordHash, 'Staff']);
    console.log('Seeded default admin and staff users.');
  }

  // Seeding default customers
  const customerCount = await db.get('SELECT COUNT(*) as count FROM customers');
  if (customerCount.count === 0) {
    await db.run('INSERT INTO customers (name, mobile, address, gst_number) VALUES (?, ?, ?, ?)', ['John Doe', '9876543210', '123 Main Street, City', '27AAAAA1111A1Z1']);
    await db.run('INSERT INTO customers (name, mobile, address, gst_number) VALUES (?, ?, ?, ?)', ['Jane Smith', '8765432109', '456 Oak Avenue, Metro', '']);
    console.log('Seeded default customers.');
  }

  // Seeding default vendors
  const vendorCount = await db.get('SELECT COUNT(*) as count FROM vendors');
  if (vendorCount.count === 0) {
    await db.run('INSERT INTO vendors (name, mobile, address, gst_number) VALUES (?, ?, ?, ?)', ['Wholesale Corp', '9998887776', '789 Industrial Area, Hub', '27BBBBB2222B2Z2']);
    await db.run('INSERT INTO vendors (name, mobile, address, gst_number) VALUES (?, ?, ?, ?)', ['Primary Distributors', '8887776665', '101 Trade Plaza, Center', '']);
    console.log('Seeded default vendors.');
  }

  return db;
}
