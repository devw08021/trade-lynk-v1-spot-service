# Trade-Lynk User Service

A microservice for user authentication, management, and KYC in the Trade-Lynk platform.

## Tech Stack

- **Runtime**: [Bun.js](https://bun.sh/)
- **Framework**: [Hono](https://honojs.dev/)
- **Database**: MongoDB
- **Caching/Messaging**: Redis
- **Validation**: Zod
- **Authentication**: JWT (jose)

## Features

- User registration and authentication
- Profile management
- Two-factor authentication support
- KYC submission and status checking
- Redis caching for improved performance
- Inter-service communication via Redis Pub/Sub

## API Endpoints

### Public Endpoints

- `POST /api/user/register` - Register a new user
- `POST /api/user/login` - Authenticate a user

### Protected Endpoints (Require Authentication)

- `GET /api/user/me` - Get current user profile
- `PUT /api/user/me` - Update user profile
- `POST /api/user/kyc/submit` - Submit KYC information

## Setup and Installation

1. Install dependencies:
   ```
   bun install
   ```

2. Configure environment variables:
   Create a `.env` file in the root directory with the following:
   ```
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/trade-lynk
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-secret-key
   NODE_ENV=development
   ```

3. Start the service:
   ```
   bun run dev
   ```

## Development

- `bun run dev` - Start the service in development mode with hot reloading
- `bun run build` - Build the project
- `bun run start` - Start the service in production mode

## Inter-Service Communication

The service uses Redis Pub/Sub for event-based communication with other microservices. Events are published to the `user-events` channel in the following format:

```json
{
  "eventType": "user.created | user.updated | user.kyc.submitted",
  "timestamp": "2023-09-01T12:00:00Z",
  "data": {
    // Event-specific data
  }
}
```

## Docker

To run this service with Docker:

```bash
docker build -t trade-lynk-user-service .
docker run -p 3001:3001 trade-lynk-user-service
``` 