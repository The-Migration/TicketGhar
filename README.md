# Ticket Ghar - Advanced Queue Management System

A comprehensive queue management system for fair ticket sales with real-time updates, anti-bot measures, and secure payment processing.

## Features

### Core Features
- **Real-time Queue Management**: Fair queue system with real-time position updates
- **Anti-Bot Protection**: Advanced measures to prevent automated ticket purchases
- **Secure Payment Processing**: Integrated with Stripe for secure transactions
- **User Authentication**: JWT-based authentication with role management
- **Event Management**: Create and manage events with ticket allocation
- **Real-time Updates**: WebSocket-based real-time communication
- **Order Management**: Complete order tracking and history

### Technical Features
- **Microservices Architecture**: Scalable backend with separate services
- **Redis Queue System**: High-performance queue management
- **PostgreSQL Database**: Robust data persistence
- **React Frontend**: Modern, responsive user interface
- **TypeScript**: Type-safe development
- **Docker Support**: Containerized deployment
- **RESTful API**: Clean API design
- **Real-time Communication**: WebSocket integration

## Project Structure

```
Ticket_Ghar/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── config/             # Configuration files
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Redux store
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # CSS/styled-components
│   ├── public/            # Static assets
│   └── package.json
├── docker-compose.yml      # Docker services
└── README.md

```

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Docker and Docker Compose
- PostgreSQL (if running locally)
- Redis (if running locally)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Ticket_Ghar
```

2. Install dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables
```bash
# Copy example environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. Start services with Docker
```bash
docker-compose up -d
```

5. Run database migrations
```bash
cd backend
npm run migrate
```

### Development

**Start backend:**
```bash
cd backend
npm run dev
```

**Start frontend:**
```bash
cd frontend
npm start
```

**Start with Docker:**
```bash
docker-compose up --build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create new event (admin)
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event (admin)

### Queue
- `POST /api/queue/join` - Join event queue
- `GET /api/queue/position` - Get queue position
- `DELETE /api/queue/leave` - Leave queue

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/ticket_ghar
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_SOCKET_URL=http://localhost:3001
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License. 