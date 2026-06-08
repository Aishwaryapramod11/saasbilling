import jwt from 'jsonwebtoken';
import { User } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'streamify_super_secret_session_token';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid format.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user details from database
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User session no longer exists.' });
    }

    // Attach user information to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication Error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired login session token.' });
  }
};
