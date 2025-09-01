const express = require('express');
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const passport = require('../services/passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/verify-otp', require('../controllers/authController').verifyOtp);
router.post('/resend-otp', require('../controllers/authController').resendOtp);
router.post('/forgot-password', require('../controllers/authController').forgotPassword);
router.post('/reset-password/:token', require('../controllers/authController').resetPassword);

// Google OAuth (must be public)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.redirect(`${process.env.FRONTEND_OAUTH_REDIRECT || 'http://localhost:3000/auth/callback'}?token=${token}`);
});
// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), (req, res) => {
  const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.redirect(`${process.env.FRONTEND_OAUTH_REDIRECT || 'http://localhost:3000/auth/callback'}?token=${token}`);
});

// Protected routes
router.use(authenticate); // All routes below this will require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

module.exports = router; 