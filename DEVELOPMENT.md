# Development Guide

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Docker Desktop (optional, for database services)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd Ticket_Ghar
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Environment Setup
```bash
# Copy environment files
cp backend/env.example backend/.env
```

### 4. Start Services

#### Option A: With Docker (Recommended)
```bash
# Start database services
docker-compose up -d postgres redis

# Start backend (in separate terminal)
cd backend
npm run dev

# Start frontend (in separate terminal)
cd frontend
npm start
```

#### Option B: Manual Setup
1. Install and start PostgreSQL locally
2. Install and start Redis locally
3. Update database connection in `backend/.env`
4. Run backend and frontend as above

### 5. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Health Check: http://localhost:3001/health
- pgAdmin (optional): http://localhost:8080

## Development Commands

### Backend
```bash
cd backend
npm run dev          # Start development server
npm start           # Start production server
npm test            # Run tests
npm run migrate     # Run database migrations
npm run seed        # Seed database with sample data
```

### Frontend
```bash
cd frontend
npm start           # Start development server
npm run build       # Build for production
npm test            # Run tests
```

### Docker
```bash
# Start all services
docker-compose up -d

# Start with tools (pgAdmin)
docker-compose --profile tools up -d

# View logs
docker-compose logs -f [service-name]

# Stop services
docker-compose down

# Clean up
docker-compose down -v
```

## Project Structure

```
Ticket_Ghar/
├── backend/                    # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/       # API controllers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utility functions
│   │   └── server.js         # Main server file
│   ├── config/               # Configuration files
│   ├── .env                  # Environment variables
│   └── package.json
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store
│   │   ├── utils/           # Utility functions
│   │   ├── styles/          # Styling
│   │   └── App.tsx          # Main app component
│   ├── public/              # Static assets
│   └── package.json
├── docker-compose.yml        # Docker services
├── README.md                 # Project documentation
└── DEVELOPMENT.md           # This file
```

## Database Access

### Using pgAdmin (Docker)
1. Start with tools profile: `docker-compose --profile tools up -d`
2. Access pgAdmin at http://localhost:8080
3. Login with:
   - Email: admin@ticketghar.com
   - Password: admin
4. Add new server:
   - Host: localhost
   - Port: 5432
   - Database: ticket_ghar_dev
   - Username: postgres
   - Password: postgres

### Using Command Line
```bash
# Connect to PostgreSQL
docker exec -it ticket_ghar_postgres psql -U postgres -d ticket_ghar_dev

# Connect to Redis
docker exec -it ticket_ghar_redis redis-cli
```

## API Testing

### Health Check
```bash
# Windows PowerShell
Invoke-RestMethod -Uri http://localhost:3001/health

# Linux/Mac
curl http://localhost:3001/health
```

### API Endpoints
- `GET /health` - Health check
- `GET /api` - API information
- Future endpoints will be documented here

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Check if services are already running
   - Use different ports in environment variables

2. **Database connection failed**
   - Ensure PostgreSQL is running
   - Check connection string in `.env`

3. **Redis connection failed**
   - Ensure Redis is running
   - Check Redis URL in `.env`

4. **Frontend compilation errors**
   - Clear node_modules and reinstall
   - Check for TypeScript errors

### Reset Development Environment
```bash
# Stop all services
docker-compose down -v

# Remove node_modules
rm -rf backend/node_modules frontend/node_modules

# Reinstall dependencies
cd backend && npm install
cd ../frontend && npm install

# Start fresh
docker-compose up -d
```

## Next Steps

1. Implement authentication system
2. Add database models and migrations
3. Create API routes for events and queue management
4. Implement real-time WebSocket communication
5. Add payment integration
6. Create comprehensive frontend components

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request 