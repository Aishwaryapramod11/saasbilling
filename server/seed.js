import { sequelize, Organization, User, Card, Invoice, AuditLog, PlanLimit } from './db.js';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    console.log('Seeding SQLite database with Organization model...');
    await sequelize.sync({ force: true }); // Reset tables
    console.log('Database synced. Seeding records...');

    // 1. Seed Plan Limits
    const defaultPlans = [
      { planName: 'Basic (Ads)', seats: 1, downloads: 0, resolution: '720p HD Quality', price: 5.99 },
      { planName: 'Standard (HD)', seats: 2, downloads: 100, resolution: '1080p Full HD', price: 15.49 },
      { planName: 'Premium (4K)', seats: 6, downloads: 1000, resolution: '4K Ultra HD + HDR', price: 22.99 }
    ];
    await PlanLimit.bulkCreate(defaultPlans);
    console.log('Plan limits seeded.');

    // 2. Create Shared Organization
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
    console.log('Shared Organization created.');

    // 3. Hash Passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const viewerPassword = await bcrypt.hash('viewer123', 10);

    // 4. Create Users under the SAME email but DIFFERENT roles and passwords
    const adminUser = await User.create({
      email: 'user@streamify.com',
      password: adminPassword,
      role: 'admin',
      OrganizationId: sharedOrg.id
    });

    const managerUser = await User.create({
      email: 'user@streamify.com',
      password: managerPassword,
      role: 'billing_manager',
      OrganizationId: sharedOrg.id
    });

    const viewerUser = await User.create({
      email: 'user@streamify.com',
      password: viewerPassword,
      role: 'viewer',
      OrganizationId: sharedOrg.id
    });

    console.log('Users created with email user@streamify.com (Admin, Manager, Viewer).');

    // 5. Seed Credit Card (shared at organization level)
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

    console.log('Shared Organization payment cards seeded.');

    // 6. Seed Invoices (shared at organization level)
    const orgInvoices = [
      { id: 'INV-1092', date: '2026-04-08', plan: 'Basic (Ads) Plan', amount: 5.99, status: 'Paid', method: 'Visa ending in 4242', OrganizationId: sharedOrg.id },
      { id: 'INV-2041', date: '2026-05-08', plan: 'Standard (HD) Plan', amount: 15.49, status: 'Paid', method: 'Visa ending in 4242', OrganizationId: sharedOrg.id },
      { id: 'INV-3184', date: '2026-06-08', plan: 'Standard (HD) Plan', amount: 15.49, status: 'Paid', method: 'Visa ending in 4242', OrganizationId: sharedOrg.id }
    ];
    await Invoice.bulkCreate(orgInvoices);
    console.log('Shared Organization invoices seeded.');

    // 7. Seed Audit Logs (linked to organization and mapped to actors)
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

    console.log('Audit logs seeded.');
    console.log('SQLite seeding successfully finished.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seed();
