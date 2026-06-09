# Contributing to VideoConf Platform

Thank you for considering contributing to the VideoConf Platform! We welcome contributions from the community to help improve this platform.

## How to Contribute

There are many ways to contribute to the project:

1. **Report bugs** - If you find a bug, please report it with as much detail as possible
2. **Suggest features** - Have an idea for a new feature? Let us know!
3. **Improve documentation** - Help us make our documentation clearer and more comprehensive
4. **Fix bugs** - Look through the issue tracker and fix reported bugs
5. **Implement features** - Help us implement planned features
6. **Review code** - Help review pull requests from other contributors

## Getting Started

### Prerequisites

To contribute to this project, you'll need:

- Node.js (v18 or higher)
- npm or yarn
- Git
- A Supabase account (for backend development)
- Basic knowledge of:
  - TypeScript
  - React/Next.js
  - Node.js/Express
  - PostgreSQL
  - Docker

### Setting Up the Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/videoconf-platform.git
   cd videoconf-platform
   ```

3. **Install dependencies**:
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   npm install
   ```

4. **Set up environment variables**:
   - Copy `.env.example` to `.env` in the root directory
   - Fill in the required environment variables:
     ```
     # Supabase
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     
     # Database (Supabase provides this)
     DATABASE_URL=your_supabase_database_url
     DIRECT_URL=your_supabase_direct_url
     
     # LiveKit
     LIVEKIT_URL=ws://localhost:7880
     LIVEKIT_API_KEY=devkey
     LIVEKIT_API_SECRET=devsecret
     
     # Other
     FRONTEND_URL=http://localhost:3000
     BACKEND_URL=http://localhost:4000
     ```

5. **Start the development servers**:
   ```bash
   # Start Redis and LiveKit (using Docker Compose)
   cd infra/docker
   docker-compose up -d
   
   # Start backend
   cd ../../backend
   npm run dev
   
   # Start frontend (in another terminal)
   cd ../frontend
   npm run dev
   ```

### Development Workflow

1. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   or
   ```bash
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following the coding standards below

3. **Test your changes** thoroughly:
   - Write unit tests for new functionality
   - Ensure existing tests still pass
   - Test manually in the development environment

4. **Commit your changes** with clear, descriptive commit messages:
   ```bash
   git commit -m "feat: add new feature description"
   ```
   or
   ```bash
   git commit -m "fix: resolve issue with login form"
   ```

5. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** against the main repository's `main` branch

## Coding Standards

### TypeScript
- Use strict type checking (`"strict": true` in tsconfig.json)
- Prefer interfaces over types for object shapes (when augmentation is needed)
- Use type aliases for unions, primitives, and tuples
- Always specify return types for functions
- Use `const` and `let` instead of `var`
- Prefer arrow functions for callbacks
- Disable any usage of `any` unless absolutely necessary (with comment justification)

### Frontend (Next.js/React)
- Follow React best practices (hooks rules, etc.)
- Use functional components with hooks
- Leverage Next.js 15 App Router features
- Use TailwindCSS for styling
- Use shadcn/ui components as base
- Implement proper loading and error states
- Optimize images with Next.js Image component
- Follow accessibility guidelines (WCAG 2.1 AA)

### Backend (Node.js/Express)
- Use async/await instead of callbacks or promises `.then()`
- Handle errors properly with try/catch
- Validate all inputs (use Zod or similar)
- Use middleware for cross-cutting concerns (logging, validation, etc.)
- Keep controllers thin, move business logic to services
- Use dependency injection where appropriate
- Follow RESTful API design principles
- Use HTTP status codes correctly
- Implement rate limiting and security headers

### Database (Prisma)
- Keep schema.prisma well-documented with comments
- Use appropriate data types
- Add indexes for query performance
- Use enum types for fixed values
- Consider cascade behavior for relationships
- Write meaningful migration messages

### Testing
- Write unit tests for utility functions and services
- Write integration tests for API endpoints
- Use Vitest for frontend unit tests
- Use Playwright for end-to-end tests
- Mock external dependencies in tests
- Aim for high test coverage but prioritize meaningful tests

### Documentation
- Comment complex logic
- Use JSDoc for functions and classes
- Update README if adding significant features
- Keep API documentation up to date
- Document breaking changes clearly

## Pull Request Process

1. **Ensure your code passes linting** and formatting checks
2. **Run the test suite** to make sure nothing is broken
3. **Update documentation** if your change affects usage
4. **Keep your PR focused** on a single topic or feature
5. **Write a clear PR description** explaining what and why
6. **Reference any related issues** in the PR description
7. **Respond to feedback** from maintainers promptly
8. **Keep your branch updated** with the main branch if needed

### What to Include in Your PR
- A clear title describing the change
- A detailed description of what was changed and why
- Screenshots or screen recordings for UI changes
- Any relevant test results
- References to issues or discussions

### What Not to Include
- Changes to configuration files that are specific to your local setup
- Debugging console.log statements
- Commented-out code
- Large formatting changes unrelated to the functional change

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project, you agree to abide by its terms. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for more details.

## Getting Help

If you need help with your contribution:

1. **Check the documentation** - Most questions are answered in the docs/
2. **Look at existing code** - See how similar features are implemented
3. **Ask in the discussions** - Use the GitHub Discussions tab
4. **Tag maintainers** - If you're stuck, ask for help in your PR

## Recognition

Contributors will be recognized in:
- The README.md contributors section
- Release notes for significant contributions
- Project documentation for major features
- Maintainer status for consistent, high-quality contributors

## License

By contributing to the VideoConf Platform, you agree that your contributions will be licensed under the MIT License.

Thank you again for contributing to the VideoConf Platform!