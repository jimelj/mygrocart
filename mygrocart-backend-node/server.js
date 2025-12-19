const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Note: SSL certificate handling is now done in database.js with proper SSL configuration

// Import GraphQL schema and resolvers
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./resolvers');
const { getUser } = require('./middleware/auth');
const { connectDB } = require('./config/database');

// Import Redis configuration
const { initializeRedis, closeRedis, getCacheStats } = require('./config/redis');
const cacheService = require('./services/CacheService');

// Import all models to ensure associations are set up
const models = require('./models');

// Import API routes
const scrapingRoutes = require('./routes/scraping');

async function startServer() {
  // Create Express app
  const app = express();
  const httpServer = http.createServer(app);

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    introspection: true, // Enable GraphQL Playground in development
    playground: true
  });

  // Start Apollo Server
  await server.start();

  // Configure rate limiters
  const graphqlLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 requests per 15 min in production, 1000 in dev
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 50 : 500, // 50 requests per 15 min in production, 500 in dev
    message: 'Too many API requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 failed attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
  });

  // Apply global middleware
  app.use(cors({
    origin: process.env.NODE_ENV === 'development'
      ? true // Allow all origins in development (for mobile app testing)
      : [
          'https://mygrocart-frontend.onrender.com',
          'https://mygrocart.onrender.com',
          'https://www.mygrocart.com',
          'https://mygrocart.com'
        ], // Only production domains in production
    credentials: true
  }));
  app.use(express.json()); // Parse JSON bodies for all routes

  // Apply GraphQL middleware with rate limiting
  app.use(
    '/graphql',
    graphqlLimiter, // Apply rate limiting to GraphQL endpoint
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Get user from token for authentication
        const user = await getUser(req);
        return { user };
      },
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'MyGroCart Backend is running!' });
  });

  // Cache statistics endpoint
  app.get('/api/cache/stats', async (req, res) => {
    try {
      const stats = cacheService.getStats();
      const redisStats = await getCacheStats();
      res.json({
        cacheService: stats,
        redis: redisStats
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get cache stats' });
    }
  });

  // API Routes with rate limiting
  app.use('/api/scraping', apiLimiter, scrapingRoutes);

  // Serve static files (for potential frontend deployment)
  app.use(express.static('public'));

  // Connect to database (optional for development)
  try {
    await connectDB();
    console.log('Database connected for user authentication');
  } catch (error) {
    console.log('Database connection failed, using sample data for development');
  }

  // Initialize Redis cache
  try {
    const redisClient = await initializeRedis();
    if (redisClient) {
      await cacheService.initialize();
      console.log('Redis cache initialized successfully');
    } else {
      console.log('Redis not configured - caching disabled (application will continue without cache)');
    }
  } catch (error) {
    console.log('Redis initialization failed - caching disabled:', error.message);
  }

  // Start HTTP server
  const PORT = process.env.PORT || 5000;
  
  await new Promise((resolve) => httpServer.listen({ port: PORT, host: '0.0.0.0' }, resolve));
  
  console.log(`🚀 MyGroCart Backend ready!`);
  console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🎮 GraphQL Playground: http://localhost:${PORT}/graphql`);
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await closeRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await closeRedis();
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

