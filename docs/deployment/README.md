# Deployment Guide

This guide provides instructions for deploying the VideoConf Platform to various environments.

## Table of Contents
1. [Local Development](#local-development)
2. [Production Deployment](#production-deployment)
   - [Option 1: Vercel (Frontend) + Node.js Hosting (Backend)](#option-1-vercel-frontend--nodejs-hosting-backend)
   - [Option 2: Docker Compose Production](#option-2-docker-compose-production)
   - [Option 3: Kubernetes](#option-3-kubernetes)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Scaling Considerations](#scaling-considerations)

## Local Development

For local development, we use Docker Compose to run Redis and LiveKit, while connecting to a Supabase project for database and authentication.

### Prerequisites
- Docker and Docker Compose
- Node.js (v18 or higher)
- npm or yarn
- A Supabase account

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/videoconf-platform.git
   cd videoconf-platform
   ```

2. **Set up Supabase**:
   - Create a new project in [Supabase](https://supabase.com)
   - Note your project URL and anon/public key
   - In Supabase Settings → API, note the service_role_key
   - In Supabase Settings → Database, note the connection string

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase and LiveKit credentials:
   ```
   # Supabase
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Database (provided by Supabase)
   DATABASE_URL=your_supabase_database_url
   DIRECT_URL=your_supabase_direct_url
   
   # LiveKit (using Docker Compose)
   LIVEKIT_URL=ws://localhost:7880
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=devsecret
   
   # Application URLs
   FRONTEND_URL=http://localhost:3000
   BACKEND_URL=http://localhost:4000
   ```

4. **Start infrastructure services**:
   ```bash
   cd infra/docker
   docker-compose up -d
   ```
   This starts Redis and LiveKit containers.

5. **Install dependencies**:
   ```bash
   # Backend
   cd ../backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

6. **Prisma setup** (generate client):
   ```bash
   cd ../backend
   npx prisma generate
   ```

7. **Start development servers**:
   ```bash
   # In one terminal - backend
   cd backend
   npm run dev
   
   # In another terminal - frontend
   cd frontend
   npm run dev
   ```

8. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - API Docs: http://localhost:4000/api-docs (if enabled)

### Development Tips
- The backend will hot-reload on file changes
- The frontend will hot-reload on file changes
- Prisma Studio: `npx prisma studio` to visualize and edit data
- To reset Docker volumes: `docker-compose down -v`

## Production Deployment

### Option 1: Vercel (Frontend) + Node.js Hosting (Backend)

This is the recommended deployment option for most users.

#### Frontend Deployment (Vercel)
1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Import the project in Vercel:
   - New Project → Import Git Repository
   - Select the `frontend` directory as the root
   - Vercel will automatically detect it's a Next.js project
3. Configure environment variables in Vercel:
   - Go to Settings → Environment Variables
   - Add:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     # Note: Never expose the service role key to the frontend!
     ```
4. Deploy! Vercel will build and deploy your frontend.

#### Backend Deployment (Node.js Hosting)
Choose any Node.js hosting platform (AWS Elastic Beanstalk, DigitalOcean App Platform, Render, Railway, etc.)

1. Push your backend code to a Git repository
2. Configure your hosting platform:
   - Set the start command: `npm start` or `node dist/server.js` (if building)
   - Set Node.js version to 18 or higher
   - Allocate sufficient resources (at least 1GB RAM recommended)
3. Configure environment variables:
   ```
   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Database
   DATABASE_URL=your_supabase_database_url
   DIRECT_URL=your_supabase_direct_url
   
   # LiveKit (self-hosted or managed service)
   LIVEKIT_URL=wss://your-livekit-domain.com
   LIVEKIT_API_KEY=your_livekit_api_key
   LIVEKIT_API_SECRET=your_livekit_api_secret
   
   # Application
   FRONTEND_URL=https://your-frontend-domain.com
   BACKEND_URL=https://your-backend-domain.com
   NODE_ENV=production
   ```
4. Deploy and start the backend service.

#### Required Infrastructure
You'll still need to run:
- **Redis**: For caching and Socket.IO (can use managed Redis like AWS Elasticache, Redis Labs, etc.)
- **LiveKit**: For video SFU (can self-host or use a managed LiveKit service)

### Option 2: Docker Compose Production

For simpler deployments, you can use Docker Compose in production.

1. **Create a production Docker Compose file** (`infra/docker/docker-compose.prod.yml`):
   ```yaml
   version: '3.8'
   
   services:
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
       command: redis-server --appendonly yes
       networks:
         - videoconf_network
   
     livekit:
       image: livekit/livekit-server:latest
       ports:
         - "7880:7880"
         - "7881:7881"
         - "7980:7980/udp"
       environment:
         - LIVEKIT_HOST=your-domain.com
         - LIVEKIT_KEY=${LIVEKIT_API_KEY}
         - LIVEKIT_SECRET=${LIVEKIT_API_SECRET}
         - LIVEKIT_PORT=7880
         - LIVEKIT_NODE_ID=prod-node
       volumes:
         - ./livekit.yaml:/livekit/conf/livekit.yaml:ro
       networks:
         - videoconf_network
   
     backend:
       build: ../../backend
       ports:
         - "4000:4000"
       env_file:
         - ../../.env
       volumes:
         - ../../backend:/app
         - /app/node_modules
       depends_on:
         - redis
       networks:
         - videoconf_network
   
     frontend:
       build: ../../frontend
       ports:
         - "3000:3000"
       env_file:
         - ../../.env
       volumes:
         - ../../frontend:/app
         - /app/node_modules
       depends_on:
         - backend
       networks:
         - videoconf_network
   
   networks:
     videoconf_network:
       driver: bridge
   
   volumes:
     redis_data:
     livekit_data:
   ```

2. **Create a LiveKit configuration file** (`infra/docker/livekit.yaml`):
   ```yaml
   # LiveKit configuration
   # See https://docs.livekit.io/reference/config-file/
   
   host: true
   bind: 0.0.0.0:7880
   
   rtcp_mux: false
   
   # UDP port range for media
   port_range_start: 7000
   port_range_end: 8000
   
   # Logging
   log_level: info
   
   # RTC configuration
   # turn_usage_turn: true
   # turn_username: ""
   # turn_credential: ""
   
   # Redis configuration (for clustering)
   redis:
     host: redis
     port: 6379
   ```

3. **Deploy**:
   ```bash
   cd infra/docker
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Option 3: Kubernetes

For scalable deployments, Kubernetes is recommended.

1. **Create Kubernetes manifests** in `infra/k8s/`
2. **Use Helm charts** for complex deployments
3. **Configure ingress** for external access
4. **Set up horizontal pod autoscaling** based on CPU/memory usage
5. **Use persistent volumes** for Redis data if needed

## Environment Variables

Here's a complete list of environment variables used by the platform:

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xyzcompany.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | `public-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) | `service-role-key` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:password@db.xyzcompany.supabase.co:5432/postgres` |
| `DIRECT_URL` | Direct database connection (for migrations) | `postgres://postgres:password@db.xyzcompany.supabase.co:5432/postgres?pgbouncer=true` |
| `LIVEKIT_URL` | LiveKit WebSocket URL | `ws://livekit.example.com:7880` |
| `LIVEKIT_API_KEY` | LiveKit API key | `livekit-key` |
| `LIVEKIT_API_SECRET` | LiveKit API secret | `livekit-secret` |
| `FRONTEND_URL` | Frontend application URL | `https://videoconf.example.com` |
| `BACKEND_URL` | Backend API URL | `https://api.videoconf.example.com` |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `development` |
| `PORT` | Backend port | `4000` |
| `FRONTEND_PORT` | Frontend port | `3000` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for JWT signing (if not using Supabase) | Randomly generated |
| `JWT_EXPIRES_IN` | JWT expiration time | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiration | `7d` |
| `RATE_LIMIT_WINDOW` | Rate limit window in ms | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `MAX_UPLOAD_SIZE` | Max file upload size in bytes | `10485760` (10MB) |
| `MESSAGE_RATE_LIMIT` | Max messages per user per minute | `30` |
| `FOCUS_DETECTION_INTERVAL` | AI detection interval in ms | `1000` |
| `ENABLE_AI_FOCUS` | Enable AI focus detection | `true` |
| `ENABLE_RECORDING` | Enable meeting recording | `true` |
| `ENABLE_WAITING_ROOM` | Enable waiting room by default | `true` |

## Database Setup

The platform uses Supabase PostgreSQL as the primary database.

### Initial Setup
1. Create a new Supabase project
2. Copy the connection string from Settings → Database
3. Set `DATABASE_URL` and `DIRECT_URL` environment variables
4. Run Prisma migrations:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

### Schema Management
- All schema changes should be made via Prisma migrations
- To create a migration: `npx prisma migrate dev --name migration-name`
- To apply migrations to production: `npx prisma migrate deploy`
- Never edit the migration files directly

### Backups
- Supabase provides automated backups
- For additional safety, consider setting up manual backups:
  ```bash
  # Using pg_dump
  pg_dump $DATABASE_URL > backup.sql
  
  # Using Supabase CLI
  supabase db dump
  ```

### Performance Tuning
- Consider adding read replicas for heavy read workloads
- Use connection pooling (Supabase includes PgBouncer)
- Monitor slow queries in Supabase dashboard
- Consider caching frequent queries in Redis

## Monitoring and Logging

### Application Monitoring
- **Health Checks**: The `/health` endpoint provides basic liveness/readiness
- **Metrics**: Consider integrating with Prometheus/Grafana for custom metrics
- **Error Tracking**: Use Sentry or similar for error tracking
- **Performance Monitoring**: Use tools like Datadog, New Relic, or open-source alternatives

### Logging
- **Structured Logging**: Consider using Winston or Pino for structured logs
- **Log Storage**: Use ELK stack, Loki, or cloud logging solutions
- **Log Levels**: 
  - `error`: Critical issues requiring immediate attention
  - `warn`: Potential issues that don't break functionality
  - `info`: General operational information
  - `debug`: Detailed information for troubleshooting
- **Security Logging**: All authentication and authorization events should be logged

### Specific Metrics to Monitor
1. **System Metrics**:
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network throughput
2. **Application Metrics**:
   - Active meetings
   - Concurrent users
   - Message throughput
   - Recording count
   - Focus detection requests
3. **Business Metrics**:
   - Daily active users
   - Meeting duration averages
   - Feature usage (screen share, recording, etc.)
   - Moderation actions

## Scaling Considerations

### Vertical Scaling (Scale Up)
- Increase instance size (more CPU/RAM)
- Upgrade database plan
- Increase Redis memory

### Horizontal Scaling (Scale Out)
#### Backend
- Use a load balancer to distribute traffic
- Share Redis instance for session/cache sharing
- Ensure stateless backend instances
- Use shared storage for file uploads (if implemented)

#### Frontend
- Vercel automatically scales
- For self-hosted: use CDN and load balancer
- Cache static assets aggressively

#### Database
- Use read replicas for read-heavy workloads
- Consider connection pooling
- Monitor and optimize slow queries
- Partition large tables if needed (messages, analytics)

#### LiveKit
- LiveKit supports clustering for horizontal scaling
- Use LiveKit's built-in clustering with Redis
- Consider geographic distribution for global users

#### Redis
- Use Redis clustering for high throughput
- Consider Redis persistence settings
- Monitor memory usage and eviction policies

### Bottlenecks to Watch
1. **Database Connections**: Ensure pool size matches expected concurrent users
2. **WebSocket Connections**: Each meeting participant creates multiple WebSocket connections
3. **CPU Usage**: AI focus detection can be CPU-intensive if done server-side (we do it client-side)
4. **Bandwidth**: Video conferencing is bandwidth-intensive; consider adaptive bitrate
5. **Storage**: Recordings and file shares can consume significant storage

## Specific Service Scaling

### Redis
- Use as a cache for frequently accessed data
- Store Socket.IO adapters for horizontal scaling
- Consider TTL values to prevent memory buildup

### LiveKit
- Monitor CPU and bandwidth usage per SFU
- Use LiveKit's built-in metrics
- Consider geographic routing for global users
- Monitor packet loss and jitter

### Supabase
- Monitor database connections and query performance
- Consider upgrading plan as needed
- Use Supabase's built-in metrics
- Monitor auth rate limits

## CI/CD Pipeline

### Recommended Setup
1. **GitHub Actions** or similar CI/CD platform
2. **Automated Testing** on every push
3. **Staging Deployments** for testing
4. **Production Deployments** on merge to main
5. **Rollback Procedures** for failed deployments

### Sample GitHub Actions Workflow
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test
    # Add frontend and backend test commands

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - # Deploy frontend to Vercel staging
    - # Deploy backend to staging environment

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - # Deploy frontend to Vercel production
    - # Deploy backend to production environment
```

## Troubleshooting

### Common Issues
1. **Connection Refused Errors**
   - Check if Docker containers are running: `docker ps`
   - Verify environment variables point to correct services
   - Check firewall/security group settings

2. **Authentication Failures**
   - Verify Supabase URLs and keys are correct
   - Check that service role key is only used in backend
   - Ensure JWT secrets match between frontend and backend

3. **Video/Media Issues**
   - Check LiveKit server logs
   - Verify UDP ports are open (7000-8000 for media)
   - Check browser console for WebRTC errors
   - Ensure TURN server is configured if needed (for symmetric NAT)

4. **Database Connection Errors**
   - Verify Supabase is not paused (free tier)
   - Check connection string format
   - Ensure IP allowlist includes your servers (if enabled)
   - Verify pgbouncer settings if using

5. **Performance Issues**
   - Monitor CPU/memory usage
   - Check database query performance
   - Look for N+1 query problems
   - Verify caching is working effectively

### Debugging Tips
- Enable debug logging in development: `DEBUG=* npm run dev`
- Use Docker logs: `docker-compose logs -f`
- Check Supabase dashboard for real-time metrics
- Use browser DevTools for frontend debugging
- Test API endpoints directly with curl or Postman

## Conclusion

This deployment guide covers the essential steps to get the VideoConf Platform running in various environments. Whether you're developing locally, deploying to production, or scaling to meet demand, the platform is designed to be flexible and robust.

Remember to:
- Keep your dependencies updated
- Monitor your systems regularly
- Back up your data
- Test your disaster recovery procedures
- Stay informed about security updates

For the most up-to-date information, always refer to the official documentation of the technologies used:
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [LiveKit Documentation](https://docs.livekit.io/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Docker Documentation](https://docs.docker.com/)