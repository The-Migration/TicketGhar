# Docker Setup for TicketGhar

This guide will help you set up PostgreSQL and Redis containers for the TicketGhar application using Docker.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose installed

## Quick Start

### 1. Start Database Services Only (Recommended for Development)

```bash
# Start PostgreSQL and Redis containers
docker-compose -f docker-compose.dev.yml up -d

# Check if containers are running
docker-compose -f docker-compose.dev.yml ps
```

### 2. Start All Services (Including Backend)

```bash
# Start all services (PostgreSQL, Redis, and Backend)
docker-compose up -d

# Check if all containers are running
docker-compose ps
```

## Services Overview

### Database Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Main database |
| Redis | 6379 | Cache and session store |
| pgAdmin | 5050 | Database management UI |
| Redis Commander | 8081 | Redis management UI |

### Access Information

#### PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **Database**: ticket_ghar_dev
- **Username**: postgres
- **Password**: postgres123

#### Redis
- **Host**: localhost
- **Port**: 6379
- **Password**: (none)

#### pgAdmin (Database Management)
- **URL**: http://localhost:5050
- **Email**: admin@ticketghar.com
- **Password**: admin123

#### Redis Commander (Redis Management)
- **URL**: http://localhost:8081

## Backend Configuration

### 1. Create Environment File

```bash
# Copy the example environment file
cp backend/env.example backend/.env

# Edit the .env file with your configuration
```

### 2. Update Backend Environment Variables

For Docker setup, update your `backend/.env` file:

```env
# Database Configuration (for Docker)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticket_ghar_dev
DB_USER=postgres
DB_PASSWORD=postgres123

# Redis Configuration (for Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Useful Commands

### Container Management

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Restart services
docker-compose -f docker-compose.dev.yml restart

# Remove all containers and volumes
docker-compose -f docker-compose.dev.yml down -v
```

### Database Management

```bash
# Connect to PostgreSQL container
docker exec -it ticket-ghar-postgres-dev psql -U postgres -d ticket_ghar_dev

# Connect to Redis container
docker exec -it ticket-ghar-redis-dev redis-cli

# Backup database
docker exec ticket-ghar-postgres-dev pg_dump -U postgres ticket_ghar_dev > backup.sql

# Restore database
docker exec -i ticket-ghar-postgres-dev psql -U postgres ticket_ghar_dev < backup.sql
```

### Health Checks

```bash
# Check PostgreSQL health
docker exec ticket-ghar-postgres-dev pg_isready -U postgres

# Check Redis health
docker exec ticket-ghar-redis-dev redis-cli ping
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -ano | findstr :5432
   
   # Kill the process or change ports in docker-compose.yml
   ```

2. **Permission Issues**
   ```bash
   # Reset Docker volumes
   docker-compose -f docker-compose.dev.yml down -v
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Database Connection Issues**
   - Ensure containers are healthy: `docker-compose ps`
   - Check logs: `docker-compose logs postgres`
   - Verify environment variables in `.env` file

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose -f docker-compose.dev.yml down -v

# Remove all Docker images (optional)
docker system prune -a

# Start fresh
docker-compose -f docker-compose.dev.yml up -d
```

## Sample Data

The database initialization scripts include:
- Database schema creation
- Sample users (admin and regular user)
- Sample events with different categories
- Sample ticket types
- Sample orders

### Default Admin User
- **Email**: admin@ticketghar.com
- **Password**: admin123 (you'll need to hash this properly in production)

## Production Considerations

For production deployment:

1. **Change default passwords**
2. **Use environment-specific configuration**
3. **Enable SSL/TLS for database connections**
4. **Set up proper backup strategies**
5. **Use Docker secrets for sensitive data**
6. **Configure proper resource limits**

## Next Steps

1. Start the database services: `docker-compose -f docker-compose.dev.yml up -d`
2. Update your backend `.env` file with the correct database credentials
3. Start your backend server: `cd backend && npm start`
4. Start your frontend: `cd frontend && npm start`
5. Access the application at http://localhost:3000
