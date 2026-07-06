import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './database.js';

// Route imports
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import vendorRoutes from './routes/vendors.js';
import salesRoutes from './routes/sales.js';
import purchaseRoutes from './routes/purchases.js';
import bankingRoutes from './routes/banking.js';
import reportRoutes from './routes/reports.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/reports', reportRoutes);

// Serve Static Frontend Assets in Production Mode
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  
  // React Router History Fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Shop ERP Backend API is running in Development Mode.');
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error occurred' });
});

// Initialize Database then Start Listening
async function startServer() {
  try {
    console.log('Initializing SQLite database...');
    await initDb();
    console.log('Database initialized successfully.');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
