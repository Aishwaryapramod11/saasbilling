import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './db.js';
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
