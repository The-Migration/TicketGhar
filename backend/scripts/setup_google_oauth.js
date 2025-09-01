const fs = require('fs');
const path = require('path');

console.log('🔧 Google OAuth Setup Guide');
console.log('==========================\n');

console.log('📋 To fix the "OAuth client was not found" error, follow these steps:\n');

console.log('1️⃣  Go to Google Cloud Console:');
console.log('   https://console.cloud.google.com/\n');

console.log('2️⃣  Create or select a project\n');

console.log('3️⃣  Enable Google+ API:');
console.log('   - Go to "APIs & Services" > "Library"');
console.log('   - Search for "Google+ API" and enable it\n');

console.log('4️⃣  Create OAuth 2.0 credentials:');
console.log('   - Go to "APIs & Services" > "Credentials"');
console.log('   - Click "Create Credentials" > "OAuth 2.0 Client IDs"');
console.log('   - Choose "Web application"');
console.log('   - Set Authorized JavaScript origins: http://localhost:3000');
console.log('   - Set Authorized redirect URIs: http://localhost:3001/api/auth/google/callback\n');

console.log('5️⃣  Copy your credentials and create a .env file in the backend directory:\n');

const envContent = `NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ticket_ghar_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=development-jwt-secret-key-change-in-production-please
JWT_EXPIRE=24h

# CORS
CORS_ORIGIN=http://localhost:3000

# Stripe (for payment processing)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info 

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=zainab.akram@themigration.com.au
SMTP_PASS=vtrmruhtysvjyznv
SMTP_FROM=TicketGhar <zainab.akram@themigration.com.au>

# Google OAuth Configuration
# Replace these with your actual Google OAuth credentials from Google Cloud Console
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here

# Facebook OAuth Configuration (if needed)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# OAuth Callback URLs
OAUTH_CALLBACK_BASE_URL=http://localhost:3001/api/auth
FRONTEND_OAUTH_REDIRECT=http://localhost:3000/auth/callback
`;

console.log('📄 Create a file named `.env` in the backend directory with this content:\n');
console.log(envContent);

console.log('\n6️⃣  Replace the placeholder values:');
console.log('   - Replace "your_actual_google_client_id_here" with your real Client ID');
console.log('   - Replace "your_actual_google_client_secret_here" with your real Client Secret\n');

console.log('7️⃣  Restart your backend server after creating the .env file\n');

console.log('🔍 Current environment check:');
console.log('==========================');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  
  const envData = fs.readFileSync(envPath, 'utf8');
  const hasGoogleId = envData.includes('GOOGLE_CLIENT_ID=') && !envData.includes('your_actual_google_client_id_here');
  const hasGoogleSecret = envData.includes('GOOGLE_CLIENT_SECRET=') && !envData.includes('your_actual_google_client_secret_here');
  
  if (hasGoogleId && hasGoogleSecret) {
    console.log('✅ Google OAuth credentials are configured');
  } else {
    console.log('❌ Google OAuth credentials need to be updated');
  }
} else {
  console.log('❌ .env file does not exist - create it using the template above');
}

console.log('\n💡 If you need help with Google Cloud Console setup, let me know!');
