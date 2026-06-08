import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './db.js';
import routes from './routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes mounting
app.use('/api', routes);

// Database connection & startup
sequelize.authenticate()
  .then(() => {
    console.log('SQLite database connection authenticated.');
    // Start listening
    app.listen(PORT, () => {
      console.log(`Express Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Unable to connect to SQLite database:', error);
  });
