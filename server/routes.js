import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Organization, Card, Invoice, AuditLog, PlanLimit } from './db.js';
import { authMiddleware } from './authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'streamify_super_secret_session_token';

// --- AUTH ROUTER ---

// Register User (Checks for [email, role] constraint, links to existing organization if email matches)
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required fields.' });
    }

    const activeRole = role || 'viewer';

    // Check if duplicate record for this email + role exists
    const existingRoleUser = await User.findOne({ where: { email, role: activeRole } });
    if (existingRoleUser) {
      return res.status(400).json({ error: `An account with this email address already exists for the role: ${activeRole}.` });
    }

    // Check if another user already registered this email (to share the same organization)
    let organizationId = null;
    const siblingUser = await User.findOne({ where: { email } });
    
    if (siblingUser) {
      // Re-use organization for the same email
      organizationId = siblingUser.OrganizationId;
    } else {
      // Create new organization for new email signup
      const newOrg = await Organization.create({
        name: `${email.split('@')[0]}'s Workspace`,
        plan: 'Basic (Ads)',
        billingCycle: 'monthly',
        subStatus: 'active',
        seats: 1,
        downloads: 0,
        hoursStreamed: 0,
        yearlyDiscount: 20
      });
      organizationId = newOrg.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: passwordHash,
      role: activeRole,
      OrganizationId: organizationId
    });

    // Create seed log
    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `System: Registered user account ${email} with role: ${activeRole}.`,
      OrganizationId: organizationId,
      UserId: newUser.id
    });

    // Sign Token
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error during registration process.' });
  }
});

// Login User (Looks up matching password for same email records)
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find all users with this email (might have multiple roles)
    const users = await User.findAll({ where: { email } });
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid login email or password.' });
    }

    // Find the one matching the password hash
    let matchedUser = null;
    for (const u of users) {
      const isMatch = await bcrypt.compare(password, u.password);
      if (isMatch) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: 'Invalid login email or password.' });
    }

    const token = jwt.sign(
      { id: matchedUser.id, email: matchedUser.email, role: matchedUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: matchedUser.id, email: matchedUser.email, role: matchedUser.role } });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login process.' });
  }
});

// Get Profile Me details
router.get('/auth/me', authMiddleware, async (req, res) => {
  // Returns merged user role details with shared organization limits
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    // Organization shared fields
    organizationName: req.organization.name,
    plan: req.organization.plan,
    billingCycle: req.organization.billingCycle,
    subStatus: req.organization.subStatus,
    trialEnds: req.organization.trialEnds,
    seats: req.organization.seats,
    downloads: req.organization.downloads,
    hoursStreamed: req.organization.hoursStreamed,
    yearlyDiscount: req.organization.yearlyDiscount
  });
});


// --- PLAN LIMITS & PRORATION ENGINE ---

// Get Plan limits
router.get('/billing/limits', async (req, res) => {
  try {
    const limits = await PlanLimit.findAll();
    const limitsMap = {};
    limits.forEach(l => {
      limitsMap[l.planName] = {
        seats: l.seats,
        downloads: l.downloads,
        resolution: l.resolution,
        price: l.price
      };
    });

    res.json({ planLimits: limitsMap });
  } catch (error) {
    console.error('Fetch Limits Error:', error);
    res.status(500).json({ error: 'Server error fetching plan limits.' });
  }
});

// Admin-only: Save configurations
router.post('/billing/limits', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only Administrator profiles can modify master subscription limits.' });
    }

    const { planLimits, yearlyDiscount } = req.body;

    if (planLimits) {
      for (const [planName, values] of Object.entries(planLimits)) {
        await PlanLimit.update(
          {
            seats: parseInt(values.seats),
            downloads: parseInt(values.downloads),
            resolution: values.resolution,
            price: parseFloat(values.price)
          },
          { where: { planName } }
        );
      }
    }

    if (yearlyDiscount !== undefined) {
      // Save global discount rate at organization level
      req.organization.yearlyDiscount = parseInt(yearlyDiscount);
      await req.organization.save();
    }

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `Admin (${req.user.email}): Master plan pricing rates and limits updated on server.`,
      OrganizationId: req.organization.id,
      UserId: req.user.id
    });

    res.json({ success: true, message: 'Limits saved successfully.' });
  } catch (error) {
    console.error('Update Limits Error:', error);
    res.status(500).json({ error: 'Server error updating plan configurations.' });
  }
});

// Checkout/Shift subscription plans (updates shared organization limits)
router.post('/billing/plan', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access Denied: Read-only viewer accounts cannot change plans.' });
    }

    const { newPlan, cycle } = req.body;
    const oldPlan = req.organization.plan;
    const activeCycle = cycle || req.organization.billingCycle;

    if (oldPlan === newPlan && req.organization.billingCycle === activeCycle) {
      return res.status(400).json({ error: 'Selected plan and billing cycle are already active.' });
    }

    // Get pricing configurations
    const dbLimits = await PlanLimit.findAll();
    const limits = {};
    dbLimits.forEach(l => { limits[l.planName] = l; });

    const getPrice = (name, c = activeCycle) => {
      const base = limits[name].price;
      if (c === 'yearly') {
        return +(base * (1 - req.organization.yearlyDiscount / 100)).toFixed(2);
      }
      return base;
    };

    // Calculate Proration Math
    const ratioRemaining = 0.50; // Day 15 of 30
    const oldPrice = getPrice(oldPlan, req.organization.billingCycle);
    const newPrice = getPrice(newPlan, activeCycle);

    const credit = +(oldPrice * ratioRemaining).toFixed(2);
    const newCharge = +(newPrice * ratioRemaining).toFixed(2);
    const total = +(newCharge - credit).toFixed(2);

    // Update Organization fields
    req.organization.plan = newPlan;
    req.organization.billingCycle = activeCycle;
    req.organization.subStatus = 'active';

    // Auto-adjust seat/downloads if they exceed limits
    const targetLimits = limits[newPlan];
    req.organization.seats = Math.min(req.organization.seats, targetLimits.seats);
    req.organization.downloads = Math.min(req.organization.downloads, targetLimits.downloads);
    await req.organization.save();

    // Create pro-rated invoice
    if (total !== 0) {
      const defaultCard = await Card.findOne({ where: { OrganizationId: req.organization.id, isDefault: true } });
      const payMethod = defaultCard ? `${defaultCard.brand} ending in ${defaultCard.last4}` : 'System Credit';
      
      const invoiceId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      await Invoice.create({
        id: invoiceId,
        date: new Date().toISOString().split('T')[0],
        plan: `Subscription Update: ${oldPlan} ➔ ${newPlan} (Pro-rated)`,
        amount: Math.abs(total),
        status: total > 0 ? 'Paid' : 'Refunded',
        method: payMethod,
        OrganizationId: req.organization.id
      });

      await AuditLog.create({
        time: new Date().toLocaleTimeString(),
        message: `Streaming: Subscription shifted ${oldPlan} ➔ ${newPlan} by ${req.user.email}. Pro-rated adjustment: ₹${total}.`,
        OrganizationId: req.organization.id,
        UserId: req.user.id
      });
    } else {
      await AuditLog.create({
        time: new Date().toLocaleTimeString(),
        message: `Streaming: Subscription shifted to ${newPlan} by ${req.user.email}. No billing adjustment.`,
        OrganizationId: req.organization.id,
        UserId: req.user.id
      });
    }

    res.json({ success: true, organization: req.organization });
  } catch (error) {
    console.error('Plan Update Error:', error);
    res.status(500).json({ error: 'Server error processing subscription update.' });
  }
});


// --- CARDS ROUTER (Organization level) ---

// Get Organization's cards
router.get('/cards', authMiddleware, async (req, res) => {
  try {
    const cards = await Card.findAll({ where: { OrganizationId: req.organization.id } });
    res.json(cards);
  } catch (error) {
    console.error('Fetch Cards Error:', error);
    res.status(500).json({ error: 'Server error loading billing cards.' });
  }
});

// Add card to Organization
router.post('/cards', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access Denied: Read-only viewer accounts cannot add payment details.' });
    }

    const { brand, number, expMonth, expYear, cardholder, isDefault } = req.body;
    if (!number || !expMonth || !expYear) {
      return res.status(400).json({ error: 'Card number, expiration month, and year are required.' });
    }

    const last4 = number.slice(-4);
    const existingCards = await Card.findAll({ where: { OrganizationId: req.organization.id } });

    // Set other cards default state to false
    if (isDefault || existingCards.length === 0) {
      await Card.update({ isDefault: false }, { where: { OrganizationId: req.organization.id } });
    }

    const newCard = await Card.create({
      id: `c-${Date.now()}`,
      brand: brand || 'Visa',
      last4,
      expMonth: parseInt(expMonth),
      expYear: parseInt(expYear),
      cardholder: cardholder || 'Cardholder',
      isDefault: isDefault || existingCards.length === 0,
      OrganizationId: req.organization.id
    });

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `CardManager: Added new ${newCard.brand} ending in ${newCard.last4} by ${req.user.email}.`,
      OrganizationId: req.organization.id,
      UserId: req.user.id
    });

    res.status(201).json(newCard);
  } catch (error) {
    console.error('Add Card Error:', error);
    res.status(500).json({ error: 'Server error registering billing card.' });
  }
});

// Set default card
router.post('/cards/:id/default', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access Denied: Viewer accounts cannot modify default cards.' });
    }

    const card = await Card.findOne({ where: { id: req.params.id, OrganizationId: req.organization.id } });
    if (!card) {
      return res.status(404).json({ error: 'Billing card not found.' });
    }

    await Card.update({ isDefault: false }, { where: { OrganizationId: req.organization.id } });
    card.isDefault = true;
    await card.save();

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `CardManager: Default card set to ${card.brand} ending in ${card.last4} by ${req.user.email}.`,
      OrganizationId: req.organization.id,
      UserId: req.user.id
    });

    res.json({ success: true, card });
  } catch (error) {
    console.error('Set Default Card Error:', error);
    res.status(500).json({ error: 'Server error updating payment priorities.' });
  }
});

// Delete card
router.delete('/cards/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access Denied: Viewer accounts cannot delete payment methods.' });
    }

    const card = await Card.findOne({ where: { id: req.params.id, OrganizationId: req.organization.id } });
    if (!card) {
      return res.status(404).json({ error: 'Billing card not found.' });
    }

    const wasDefault = card.isDefault;
    await card.destroy();

    // Re-assign default
    if (wasDefault) {
      const remaining = await Card.findOne({ where: { OrganizationId: req.organization.id } });
      if (remaining) {
        remaining.isDefault = true;
        await remaining.save();
      }
    }

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `CardManager: Removed payment card ${card.brand} ending in ${card.last4} by ${req.user.email}.`,
      OrganizationId: req.organization.id,
      UserId: req.user.id
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete Card Error:', error);
    res.status(500).json({ error: 'Server error deleting billing card.' });
  }
});


// --- INVOICES (Organization level) ---

router.get('/invoices', authMiddleware, async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      where: { OrganizationId: req.organization.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices);
  } catch (error) {
    console.error('Fetch Invoices Error:', error);
    res.status(500).json({ error: 'Server error loading invoice history.' });
  }
});


// --- AUDIT LOGS (Organization level) ---

router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      where: { OrganizationId: req.organization.id },
      order: [['createdAt', 'DESC']],
      include: [{ model: User, attributes: ['email', 'role'] }]
    });
    res.json(logs);
  } catch (error) {
    console.error('Fetch Logs Error:', error);
    res.status(500).json({ error: 'Server error loading audit feed.' });
  }
});

// Clear logs
router.delete('/logs', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only Admin profiles can truncate logs.' });
    }
    await AuditLog.destroy({ where: { OrganizationId: req.organization.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Clear Logs Error:', error);
    res.status(500).json({ error: 'Server error clearing log database.' });
  }
});


// --- SANDBOX SIMULATORS (Organization level) ---

// Simulate payment renewal failure
router.post('/sandbox/decline', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Sandbox overrides require Administrator role.' });
    }

    req.organization.subStatus = 'past_due';
    await req.organization.save();

    const defaultCard = await Card.findOne({ where: { OrganizationId: req.organization.id, isDefault: true } });
    const payMethod = defaultCard ? `${defaultCard.brand} ending in ${defaultCard.last4}` : 'No Card';

    const dbLimits = await PlanLimit.findAll();
    const limits = {};
    dbLimits.forEach(l => { limits[l.planName] = l; });

    const getPrice = (name, c = req.organization.billingCycle) => {
      const base = limits[name].price;
      if (c === 'yearly') {
        return +(base * (1 - req.organization.yearlyDiscount / 100)).toFixed(2);
      }
      return base;
    };

    const price = getPrice(req.organization.plan);
    const invoiceId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

    await Invoice.create({
      id: invoiceId,
      date: new Date().toISOString().split('T')[0],
      plan: `${req.organization.plan} Subscription Renewal (Failed)`,
      amount: price,
      status: 'Failed',
      method: payMethod,
      OrganizationId: req.organization.id
    });

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `Sandbox: Subscription payment of ₹${price} declined by ${req.user.email}. Status set to Past Due.`,
      OrganizationId: req.organization.id,
      UserId: req.user.id
    });

    res.json({ success: true, organization: req.organization });
  } catch (error) {
    console.error('Payment Decline Simulation Error:', error);
    res.status(500).json({ error: 'Server error processing payment decline simulation.' });
  }
});

// Simulate usage spike
router.post('/sandbox/spike', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Sandbox overrides require Administrator role.' });
    }

    const { enable } = req.body;
    if (enable) {
      req.organization.seats = 4;
      req.organization.downloads = 125;
      req.organization.hoursStreamed = 245;
      await req.organization.save();

      await AuditLog.create({
        time: new Date().toLocaleTimeString(),
        message: `Sandbox: Simulated stream overage spike by ${req.user.email}.`,
        OrganizationId: req.organization.id,
        UserId: req.user.id
      });
    } else {
      req.organization.seats = 2;
      req.organization.downloads = 42;
      req.organization.hoursStreamed = 120;
      await req.organization.save();

      await AuditLog.create({
        time: new Date().toLocaleTimeString(),
        message: `Sandbox: Reset streaming usage metrics to normal by ${req.user.email}.`,
        OrganizationId: req.organization.id,
        UserId: req.user.id
      });
    }

    res.json({ success: true, organization: req.organization });
  } catch (error) {
    console.error('Usage Spike Simulation Error:', error);
    res.status(500).json({ error: 'Server error simulating usage spike.' });
  }
});

// Simulate card expiry details
router.post('/sandbox/expiry', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Sandbox overrides require Administrator role.' });
    }

    const { enable } = req.body;
    const defaultCard = await Card.findOne({ where: { OrganizationId: req.organization.id, isDefault: true } });

    if (defaultCard) {
      defaultCard.expMonth = enable ? new Date().getMonth() + 1 : 12;
      defaultCard.expYear = enable ? new Date().getFullYear() : 2028;
      await defaultCard.save();
    }

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: enable 
        ? `Sandbox: Set default card expiration details to trigger header warning banner by ${req.user.email}.` 
        : `Sandbox: Reset default card expiration warning trigger by ${req.user.email}.`,
      OrganizationId: req.organization.id,
      UserId: req.user.id
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Expiry Simulation Error:', error);
    res.status(500).json({ error: 'Server error simulating card expiry.' });
  }
});

export default router;
