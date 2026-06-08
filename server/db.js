import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

// --- MODELS ---

// 1. Organization Model (Shared Billing Account)
export const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Shared Workspace'
  },
  plan: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Standard (HD)'
  },
  billingCycle: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'monthly' // monthly, yearly
  },
  subStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active' // active, past_due, canceled
  },
  trialEnds: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '2026-07-08'
  },
  seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2
  },
  downloads: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 42
  },
  hoursStreamed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 120
  },
  yearlyDiscount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20
  }
});

// 2. User Model
export const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'admin' // admin, billing_manager, viewer
  }
}, {
  // Ensure that an email can only have one user record per role
  indexes: [
    {
      unique: true,
      fields: ['email', 'role']
    }
  ]
});

// 3. Card Model (Credit Cards - Linked to Organization)
export const Card = sequelize.define('Card', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last4: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expMonth: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  expYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cardholder: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
});

// 4. Invoice Model (Billing History - Linked to Organization)
export const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  plan: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false // Paid, Refunded, Failed, Pending
  },
  method: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// 5. AuditLog Model (Linked to Organization & acting User)
export const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  time: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// 6. PlanLimit Model (Dynamic pricing configurations)
export const PlanLimit = sequelize.define('PlanLimit', {
  planName: {
    type: DataTypes.STRING,
    primaryKey: true // 'Basic (Ads)', 'Standard (HD)', 'Premium (4K)'
  },
  seats: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  downloads: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  resolution: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DOUBLE,
    allowNull: false
  }
});

// --- RELATIONSHIPS ---

Organization.hasMany(User, { onDelete: 'CASCADE' });
User.belongsTo(Organization);

Organization.hasMany(Card, { onDelete: 'CASCADE' });
Card.belongsTo(Organization);

Organization.hasMany(Invoice, { onDelete: 'CASCADE' });
Invoice.belongsTo(Organization);

Organization.hasMany(AuditLog, { onDelete: 'CASCADE' });
AuditLog.belongsTo(Organization);

User.hasMany(AuditLog, { onDelete: 'SET NULL' });
AuditLog.belongsTo(User);
