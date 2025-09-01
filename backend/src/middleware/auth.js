const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Required authentication middleware
const authenticate = async (req, res, next) => {
  try {
    console.log('🔐 Required Auth - Starting authentication...');
    const authHeader = req.headers.authorization;
    console.log('🔐 Required Auth - Auth header:', authHeader ? 'Present' : 'Not present');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 Required Auth - No valid auth header, returning 401');
      return res.status(401).json({ message: 'Access token required' });
    }

    const token = authHeader.substring(7);
    console.log('🔐 Required Auth - Token found, verifying...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Required Auth - Token decoded:', { userId: decoded.id });
    
    const user = await User.findByPk(decoded.id);
    if (!user) {
      console.log('🔐 Required Auth - User not found in database');
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    console.log('🔐 Required Auth - User authenticated:', { id: user.id, email: user.email, role: user.role });
    next();
  } catch (error) {
    console.log('🔐 Required Auth - Error occurred:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Optional authentication middleware - sets req.user if token is provided, but doesn't fail if not
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔐 Optional Auth - Auth header:', authHeader ? 'Present' : 'Not present');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔐 Optional Auth - Token found, verifying...');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔐 Optional Auth - Token decoded:', { userId: decoded.id });
      
      const user = await User.findByPk(decoded.id);
      if (user) {
        req.user = user;
        console.log('🔐 Optional Auth - User found:', { id: user.id, email: user.email, role: user.role });
      } else {
        console.log('🔐 Optional Auth - User not found in database');
      }
    } else {
      console.log('🔐 Optional Auth - No valid auth header found');
    }
    
    // Always continue, whether or not authentication was successful
    next();
  } catch (error) {
    console.log('🔐 Optional Auth - Error occurred:', error.message);
    // Ignore authentication errors and continue without user
    next();
  }
};

// Authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

// Token authentication middleware (alias for authenticate)
const authenticateToken = authenticate;

module.exports = {
  authenticate,
  authenticateToken,
  optionalAuthenticate,
  authorize,
  requireAdmin
}; 