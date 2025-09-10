require('dotenv').config();

const config = {
  database: process.env.DB_NAME || 'ticket_ghar_dev',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  timezone: '+00:00',
  dialectOptions: {
    dateStrings: true,
    typeCast: true
  }
};

// Parse DATABASE_URL if provided (for production)
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  config.database = url.pathname.slice(1);
  config.username = url.username;
  config.password = url.password;
  config.host = url.hostname;
  config.port = url.port;
  
  // SSL configuration for production (Render requires SSL)
  if (process.env.NODE_ENV === 'production') {
    config.dialectOptions = {
      ...config.dialectOptions,
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    };
  }
}

module.exports = config; 