#!/bin/bash

echo "🚀 Starting TicketGhar Database Services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Start the database services
echo "📦 Starting PostgreSQL and Redis containers..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose.dev.yml ps

# Display connection information
echo ""
echo "✅ Database services are ready!"
echo ""
echo "📊 Connection Information:"
echo "  PostgreSQL: localhost:5432"
echo "  Redis: localhost:6379"
echo "  pgAdmin: http://localhost:5050"
echo "  Redis Commander: http://localhost:8081"
echo ""
echo "🔑 Database Credentials:"
echo "  Database: ticket_ghar_dev"
echo "  Username: postgres"
echo "  Password: postgres123"
echo ""
echo "📝 Next steps:"
echo "  1. Update your backend .env file with these credentials"
echo "  2. Start your backend server: cd backend && npm start"
echo "  3. Start your frontend: cd frontend && npm start"
echo ""
echo "🛑 To stop services: docker-compose -f docker-compose.dev.yml down"
