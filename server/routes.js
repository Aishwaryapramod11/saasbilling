import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Card, Invoice, AuditLog, PlanLimit } from './db.js';
import { authMiddleware } from './authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'streamify_super_secret_session_token';

// --- AUTH ROUTER ---

// Register User
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required fields.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: passwordHash,
      role: role || 'viewer', // default to viewer for self-registered users
      plan: 'Basic (Ads)',
      billingCycle: 'monthly',
      subStatus: 'active',
      seats: 1,
      downloads: 0,
      hoursStreamed: 0,
      yearlyDiscount: 20
    });

    // Create a seed log for the user
    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `System: Registered user account ${email} with role: ${newUser.role}.`,
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

// Login User
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid login email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login process.' });
  }
});

// Get profile details
router.get('/auth/me', authMiddleware, async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    plan: req.user.plan,
    billingCycle: req.user.billingCycle,
    subStatus: req.user.subStatus,
    trialEnds: req.user.trialEnds,
    seats: req.user.seats,
    downloads: req.user.downloads,
    hoursStreamed: req.user.hoursStreamed,
    yearlyDiscount: req.user.yearlyDiscount
  });
});


// --- PLAN LIMITS & PRORATION ENGINE ---

// Get all plan limits & yearly discount
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

// Admin-only: Update plan limits & prices
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
      // Update yearly discount globally for all users
      await User.update({ yearlyDiscount: parseInt(yearlyDiscount) }, { where: {} });
    }

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: 'Admin: Master plan pricing rates and limits updated on server.',
      UserId: req.user.id
    });

    res.json({ success: true, message: 'Limits saved successfully.' });
  } catch (error) {
    console.error('Update Limits Error:', error);
    res.status(500).json({ error: 'Server error updating plan configurations.' });
  }
});

// Change/Checkout Plan (Calculates proration on server and updates DB)
router.post('/billing/plan', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access Denied: Read-only viewer accounts cannot change plans.' });
    }

    const { newPlan, cycle } = req.body;
    const oldPlan = req.user.plan;
    const activeCycle = cycle || req.user.billingCycle;

    if (oldPlan === newPlan && req.user.billingCycle === activeCycle) {
      return res.status(400).json({ error: 'Selected plan and billing cycle are already active.' });
    }

    // Get pricing configurations
    const dbLimits = await PlanLimit.findAll();
    const limits = {};
    dbLimits.forEach(l => { limits[l.planName] = l; });

    const getPrice = (name, c = activeCycle) => {
      const base = limits[name].price;
      if (c === 'yearly') {
        return +(base * (1 - req.user.yearlyDiscount / 100)).toFixed(2);
      }
      return base;
    };

    // Calculate Proration Math
    const ratioRemaining = 0.50; // Day 15 of 30
    const oldPrice = getPrice(oldPlan, req.user.billingCycle);
    const newPrice = getPrice(newPlan, activeCycle);

    const credit = +(oldPrice * ratioRemaining).toFixed(2);
    const newCharge = +(newPrice * ratioRemaining).toFixed(2);
    const total = +(newCharge - credit).toFixed(2);

    // Update User model fields
    req.user.plan = newPlan;
    req.user.billingCycle = activeCycle;
    req.user.subStatus = 'active';

    // Auto-adjust seat/downloads if they exceed limits
    const targetLimits = limits[newPlan];
    req.user.seats = Math.min(req.user.seats, targetLimits.seats);
    req.user.downloads = Math.min(req.user.downloads, targetLimits.downloads);
    await req.user.save();

    // Create pro-rated invoice if there's a price diff
    if (total !== 0) {
      const defaultCard = await Card.findOne({ where: { UserId: req.user.id, isDefault: true } });
      const payMethod = defaultCard ? `${defaultCard.brand} ending in ${defaultCard.last4}` : 'System Credit';
      
      const invoiceId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      await Invoice.create({
        id: invoiceId,
        date: new Date().toISOString().split('T')[0],
        plan: `Subscription Update: ${oldPlan} ➔ ${newPlan} (Pro-rated)`,
        amount: Math.abs(total),
        status: total > 0 ? 'Paid' : 'Refunded',
        method: payMethod,
        UserId: req.user.id
      });

      await AuditLog.create({
        time: new Date().toLocaleTimeString(),
        message: `Streaming: Subscription shifted ${oldPlan} ➔ ${newPlan}. Pro-rated adjustment: ₹${total}.`,
        UserId: req.user.id
      });
    } else {
      await AuditLog.create({
        time: new Date().toLocaleTimeString(),
        message: `Streaming: Subscription shifted to ${newPlan}. No billing adjustment.`,
        UserId: req.user.id
      });
    }

    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('Plan Update Error:', error);
    res.status(500).json({ error: 'Server error processing subscription update.' });
  }
});


// --- CARDS ROUTER ---

// Get User's Cards
router.get('/cards', authMiddleware, async (req, res) => {
  try {
    const cards = await Card.findAll({ where: { UserId: req.user.id } });
    res.json(cards);
  } catch (error) {
    console.error('Fetch Cards Error:', error);
    res.status(500).json({ error: 'Server error loading billing cards.' });
  }
});

// Add New Card
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
    const existingCards = await Card.findAll({ where: { UserId: req.user.id } });

    // If making this one default, set all other cards default field to false
    if (isDefault || existingCards.length === 0) {
      await Card.update({ isDefault: false }, { where: { UserId: req.user.id } });
    }

    const newCard = await Card.create({
      id: `c-${Date.now()}`,
      brand: brand || 'Visa',
      last4,
      expMonth: parseInt(expMonth),
      expYear: parseInt(expYear),
      cardholder: cardholder || 'Cardholder',
      isDefault: isDefault || existingCards.length === 0,
      UserId: req.user.id
    });

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `CardManager: Added new ${newCard.brand} ending in ${newCard.last4} to profile.`,
      UserId: req.user.id
    });

    res.status(201).json(newCard);
  } catch (error) {
    console.error('Add Card Error:', error);
    res.status(500).json({ error: 'Server error registering billing card.' });
  }
});

// Set Card as Default
router.post('/cards/:id/default', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access Denied: Viewer accounts cannot modify default cards.' });
    }

    const card = await Card.findOne({ where: { id: req.params.id, UserId: req.user.id } });
    if (!card) {
      return res.status(404).json({ error: 'Billing card not found.' });
    }

    await Card.update({ isDefault: false }, { where: { UserId: req.user.id } });
    card.isDefault = true;
    await card.save();

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `CardManager: Set card ${card.brand} ending in ${card.last4} as default.`,
      UserId: req.user.id
    });

    res.json({ success: true, card });
  } catch (error) {
    console.error('Set Default Card Error:', error);
    res.status(500).json({ error: 'Server error updating payment priorities.' });
  }
});

// Delete Card
router.delete('/cards/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Access Denied: Viewer accounts cannot delete payment methods.' });
    }

    const card = await Card.findOne({ where: { id: req.params.id, UserId: req.user.id } });
    if (!card) {
      return res.status(404).json({ error: 'Billing card not found.' });
    }

    const wasDefault = card.isDefault;
    await card.destroy();

    // Re-assign default card if deleted default
    if (wasDefault) {
      const remaining = await Card.findOne({ where: { UserId: req.user.id } });
      if (remaining) {
        remaining.isDefault = true;
        await remaining.save();
      }
    }

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `CardManager: Removed payment card ${card.brand} ending in ${card.last4}.`,
      UserId: req.user.id
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete Card Error:', error);
    res.status(500).json({ error: 'Server error deleting billing card.' });
  }
});


// --- INVOICES & HISTORY ---

// Get Invoices
router.get('/invoices', authMiddleware, async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      where: { UserId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices);
  } catch (error) {
    console.error('Fetch Invoices Error:', error);
    res.status(500).json({ error: 'Server error loading invoice history.' });
  }
});


// --- AUDIT LOG FEED ---

// Get Logs
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      where: { UserId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(logs);
  } catch (error) {
    console.error('Fetch Logs Error:', error);
    res.status(500).json({ error: 'Server error loading audit feed.' });
  }
});

// Clear Logs
router.delete('/logs', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only Admin profiles can truncate logs.' });
    }
    await AuditLog.destroy({ where: { UserId: req.user.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Clear Logs Error:', error);
    res.status(500).json({ error: 'Server error clearing log database.' });
  }
});


// --- SANDBOX SIMULATORS ROUTER ---

// Simulate Payment Failure
router.post('/sandbox/decline', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Sandbox overrides require Administrator role.' });
    }

    req.user.subStatus = 'past_due';
    await req.user.save();

    const defaultCard = await Card.findOne({ where: { UserId: req.user.id, isDefault: true } });
    const payMethod = defaultCard ? `${defaultCard.brand} ending in ${defaultCard.last4}` : 'No Card';

    const dbLimits = await PlanLimit.findAll();
    const limits = {};
    dbLimits.forEach(l => { limits[l.planName] = l; });

    const getPrice = (name, c = req.user.billingCycle) => {
      const base = limits[name].price;
      if (c === 'yearly') {
        return +(base * (1 - req.user.yearlyDiscount / 100)).toFixed(2);
      }
      return base;
    };

    const price = getPrice(req.user.plan);
    const invoiceId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

    await Invoice.create({
      id: invoiceId,
      date: new Date().toISOString().split('T')[0],
      plan: `${req.user.plan} Subscription Renewal (Failed)`,
      amount: price,
      status: 'Failed',
      method: payMethod,
      UserId: req.user.id
    });

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: `Sandbox: Subscription payment of ₹${price} declined. Status set to Past Due.`,
      UserId: req.user.id
    });

    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('Payment Decline Simulation Error:', error);
    res.status(500).json({ error: 'Server error processing payment decline simulation.' });
  }
});

// Simulate Overage Usage Spike
router.post('/sandbox/spike', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Sandbox overrides require Administrator role.' });
    }

    const { enable } = req.body;
    if (enable) {
      req.user.seats = 4; // Exceeds standard (2)
      req.user.downloads = 125; // Exceeds standard (100)
      req.user.hoursStreamed = 245;
      await req.user.save();

      await AuditLog.create({
        time: new Date().toLocaleTimeString(),
        message: 'Sandbox: Simulated stream overage spike. Seats capacity and downloads exceeded limit.',
        UserId: req.user.id
      });
    } else {
      req.user.seats = 2;
      req.user.downloads = 42;
      req.user.hoursStreamed = 120;
      await req.user.save();

      await AuditLog.create({
        time: new Date().toLocaleTimeString(),
        message: 'Sandbox: Reset streaming usage metrics to normal.',
        UserId: req.user.id
      });
    }

    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('Usage Spike Simulation Error:', error);
    res.status(500).json({ error: 'Server error simulating usage spike.' });
  }
});

// Simulate Card Expiration Warn
router.post('/sandbox/expiry', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Sandbox overrides require Administrator role.' });
    }

    const { enable } = req.body;
    const defaultCard = await Card.findOne({ where: { UserId: req.user.id, isDefault: true } });

    if (defaultCard) {
      defaultCard.expMonth = enable ? new Date().getMonth() + 1 : 12;
      defaultCard.expYear = enable ? new Date().getFullYear() : 2028;
      await defaultCard.save();
    }

    await AuditLog.create({
      time: new Date().toLocaleTimeString(),
      message: enable 
        ? 'Sandbox: Set default card expiration details to trigger header warning banner.' 
        : 'Sandbox: Reset default card expiration warning trigger.',
      UserId: req.user.id
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Expiry Simulation Error:', error);
    res.status(500).json({ error: 'Server error simulating card expiry.' });
  }
});

export default router;
