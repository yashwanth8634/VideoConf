# VideoConf Platform

A production-grade video conferencing platform built with Supabase, LiveKit, Next.js, and Node.js.

## Features

- **Authentication**: Register, login, logout, email verification, password reset, JWT authentication, refresh tokens, session management
- **Meetings**: Create meeting, join meeting, leave meeting, end meeting, waiting room, host controls
- **Video**: Camera on/off, mic on/off, screen sharing, device switching, virtual background support
- **Chat**: Meeting chat, private messages, file sharing
- **Recording**: Start recording, stop recording, download recording
- **AI Focus Detection**: Analyze eye contact, face presence, head position, blink rate to generate focus scores
- **Post Meeting Analytics**: Attention score, speaking time, join duration, participation score
- **Moderation**: Detect toxic messages, spam, profanity; warn, mute, kick users
- **Security**: Invite tokens, role-based access, rate limiting, input validation, audit logs

## Architecture

This platform follows a simplified microservices architecture where all backend services are combined into a single Node.js API for simplicity and ease of learning, while still maintaining clean separation of concerns.

### Tech Stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS, shadcn/ui, Zustand, React Query, LiveKit React SDK
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **Cache**: Redis
- **Video**: LiveKit
- **Authentication**: Supabase Auth
- **Realtime**: Socket.IO
- **AI**: MediaPipe Tasks Vision, Tensorflow.js
- **Infrastructure**: Docker, Docker Compose
- **Testing**: Vitest, Playwright

## Project Structure

```
project-root/
├── frontend/                 # Next.js 15 frontend application
├── backend/                  # Node.js Express.js backend API
├── packages/                 # Shared TypeScript packages
│   ├── shared-types/         # Shared TypeScript interfaces and types
│   └── shared-utils/         # Shared utility functions
├── infra/                    # Infrastructure configuration
│   ├── docker/               # Docker and docker-compose configuration
│   ├── nginx/                # Nginx configuration
│   ├── scripts/              # Deployment and utility scripts
│   └── k8s/                  # Kubernetes configuration (for production)
├── docs/                     # Documentation
│   ├── deployment/           # Deployment guides
│   ├── ARCHITECTURE.md       # System architecture documentation
│   ├── API.md                # API reference documentation
│   ├── DATABASE.md           # Database schema documentation
│   ├── SECURITY.md           # Security documentation
│   └── CONTRIBUTING.md       # Contributing guidelines
└── prisma/                   # Prisma ORM schema and migrations
```

## Getting Started

See the [Deployment Guide](docs/deployment/) for detailed instructions on setting up the platform locally and deploying to production.

## Contributing

Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License.