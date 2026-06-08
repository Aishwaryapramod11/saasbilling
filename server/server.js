import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { sequelize, User, Organization, Card, Invoice, AuditLog, PlanLimit } from './db.js';
import routes from './routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Serve static files from the React frontend production build folder
app.use(express.static(path.join(__dirname, '../dist')));

// 2. API Routes mounting
app.use('/api', routes);

// 3. Fallback: Any other non-API GET requests should serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Database connection, synchronization, auto-seeding & startup
sequelize.sync()
  .then(async () => {
    console.log('SQLite database synced.');

    // Auto-seed if database tables are empty
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('Database is empty. Seeding default data...');

      // Seed Plan Limits
      const defaultPlans = [
        { planName: 'Basic (Ads)', seats: 1, downloads: 0, resolution: '720p HD Quality', price: 5.99 },
        { planName: 'Standard (HD)', seats: 2, downloads: 100, resolution: '1080p Full HD', price: 15.49 },
        { planName: 'Premium (4K)', seats: 6, downloads: 1000, resolution: '4K Ultra HD + HDR', price: 22.99 }
      ];
      await PlanLimit.bulkCreate(defaultPlans);

      // Create Shared Organization
      const sharedOrg = await Organization.create({
        name: 'Streamify Shared Workspace',
        plan: 'Standard (HD)',
        billingCycle: 'monthly',
        subStatus: 'active',
        seats: 2,
        downloads: 42,
        hoursStreamed: 120,
        yearlyDiscount: 20
      });

      // Hash Passwords
      const adminPassword = await bcrypt.hash('admin123', 10);
      const managerPassword = await bcrypt.hash('manager123', 10);
      const viewerPassword = await bcrypt.hash('viewer123', 10);

      // Create Users under same email
      const adminUser = await User.create({
        email: 'user@streamify.com',
        password: adminPassword,
        role: 'admin',
        OrganizationId: sharedOrg.id
      });

      await User.create({
        email: 'user@streamify.com',
        password: managerPassword,
        role: 'billing_manager',
        OrganizationId: sharedOrg.id
      });

      await User.create({
        email: 'user@streamify.com',
        password: viewerPassword,
        role: 'viewer',
        OrganizationId: sharedOrg.id
      });

      // Seed Card
      await Card.create({
        id: 'c1',
        brand: 'Visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2028,
        cardholder: 'Aishwarya R',
        isDefault: true,
        OrganizationId: sharedOrg.id
      });

      // Seed Invoices
      const orgInvoices = [
        { id: 'INV-1092', date: '2026-04-08', plan: 'Basic (Ads) Plan', amount: 5.99, status: 'Paid', method: 'Visa ending in 4242', OrganizationId: sharedOrg.id },
        { id: 'INV-2041', date: '2026-05-08', plan: 'Standard (HD) Plan', amount: 15.49, status: 'Paid', method: 'Visa ending in 4242', OrganizationId: sharedOrg.id },
        { id: 'INV-3184', date: '2026-06-08', plan: 'Standard (HD) Plan', amount: 15.49, status: 'Paid', method: 'Visa ending in 4242', OrganizationId: sharedOrg.id }
      ];
      await Invoice.bulkCreate(orgInvoices);

      // Seed Audit Logs
      await AuditLog.create({
        time: new Date().toLocaleTimeString(),
        message: 'System: SQLite Shared Database initialized.',
        OrganizationId: sharedOrg.id,
        UserId: adminUser.id
      });
      await AuditLog.create({
        time: new Date().toLocaleTimeString(),
        message: 'Streaming: Subscription plan set to Standard (HD).',
        OrganizationId: sharedOrg.id,
        UserId: adminUser.id
      });

      console.log('Database auto-seeded successfully.');
    }

    // Start listening
    app.listen(PORT, () => {
      console.log(`Express Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Unable to synchronize database:', error);
  });
