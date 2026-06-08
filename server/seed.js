import { sequelize, User, Card, Invoice, AuditLog, PlanLimit } from './db.js';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    console.log('Seeding SQLite database...');
    await sequelize.sync({ force: true }); // Reset database tables
    console.log('Database synced. Creating records...');

    // 1. Seed Plan Limits
    const defaultPlans = [
      { planName: 'Basic (Ads)', seats: 1, downloads: 0, resolution: '720p HD Quality', price: 5.99 },
      { planName: 'Standard (HD)', seats: 2, downloads: 100, resolution: '1080p Full HD', price: 15.49 },
      { planName: 'Premium (4K)', seats: 6, downloads: 1000, resolution: '4K Ultra HD + HDR', price: 22.99 }
    ];
    await PlanLimit.bulkCreate(defaultPlans);
    console.log('Plan limits seeded.');

    // 2. Hash Passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const viewerPassword = await bcrypt.hash('viewer123', 10);

    // 3. Create Users
    const adminUser = await User.create({
      email: 'admin@streamify.com',
      password: adminPassword,
      role: 'admin',
      plan: 'Standard (HD)',
      billingCycle: 'monthly',
      subStatus: 'active',
      seats: 2,
      downloads: 42,
      hoursStreamed: 120,
      yearlyDiscount: 20
    });

    const managerUser = await User.create({
      email: 'manager@streamify.com',
      password: managerPassword,
      role: 'billing_manager',
      plan: 'Basic (Ads)',
      billingCycle: 'monthly',
      subStatus: 'active',
      seats: 1,
      downloads: 0,
      hoursStreamed: 10,
      yearlyDiscount: 20
    });

    const viewerUser = await User.create({
      email: 'viewer@streamify.com',
      password: viewerPassword,
      role: 'viewer',
      plan: 'Premium (4K)',
      billingCycle: 'yearly',
      subStatus: 'active',
      seats: 5,
      downloads: 85,
      hoursStreamed: 210,
      yearlyDiscount: 20
    });

    console.log('Users seeded successfully (admin, manager, viewer).');

    // 4. Create Credit Cards
    await Card.create({
      id: 'c1',
      brand: 'Visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2028,
      cardholder: 'Aishwarya R',
      isDefault: true,
      UserId: adminUser.id
    });

    await Card.create({
      id: 'c2',
      brand: 'Mastercard',
      last4: '9876',
      expMonth: 8,
      expYear: 2027,
      cardholder: 'Manager User',
      isDefault: true,
      UserId: managerUser.id
    });

    await Card.create({
      id: 'c3',
      brand: 'Amex',
      last4: '8431',
      expMonth: 5,
      expYear: 2029,
      cardholder: 'Viewer User',
      isDefault: true,
      UserId: viewerUser.id
    });

    console.log('Payment cards seeded.');

    // 5. Create Invoices
    const adminInvoices = [
      { id: 'INV-1092', date: '2026-04-08', plan: 'Basic (Ads) Plan', amount: 5.99, status: 'Paid', method: 'Visa ending in 4242', UserId: adminUser.id },
      { id: 'INV-2041', date: '2026-05-08', plan: 'Standard (HD) Plan', amount: 15.49, status: 'Paid', method: 'Visa ending in 4242', UserId: adminUser.id },
      { id: 'INV-3184', date: '2026-06-08', plan: 'Standard (HD) Plan', amount: 15.49, status: 'Paid', method: 'Visa ending in 4242', UserId: adminUser.id }
    ];
    await Invoice.bulkCreate(adminInvoices);

    const managerInvoices = [
      { id: 'INV-5011', date: '2026-06-01', plan: 'Basic (Ads) Plan', amount: 5.99, status: 'Paid', method: 'Mastercard ending in 9876', UserId: managerUser.id }
    ];
    await Invoice.bulkCreate(managerInvoices);

    const viewerInvoices = [
      { id: 'INV-7023', date: '2026-01-01', plan: 'Premium (4K) Plan (Yearly)', amount: 220.70, status: 'Paid', method: 'Amex ending in 8431', UserId: viewerUser.id }
    ];
    await Invoice.bulkCreate(viewerInvoices);

    console.log('Invoices seeded.');

    // 6. Create Audit Logs
    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: 'System: SQLite Database initialized.',
      UserId: adminUser.id
    });
    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: 'Streaming: Subscription active on Standard (HD) tier.',
      UserId: adminUser.id
    });

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: 'System: SQLite Database initialized.',
      UserId: managerUser.id
    });

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: 'System: SQLite Database initialized.',
      UserId: viewerUser.id
    });

    console.log('Audit logs seeded.');
    console.log('SQLite Seeding Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seed();
