const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import GraphQL schema and resolvers
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./resolvers');
const { getUser } = require('./middleware/auth');
const { connectDB } = require('./config/database');

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

  // Apply global middleware
  app.use(cors({
    origin: [
      'http://localhost:3000', 
      'http://localhost:5173',
      'https://mygrocart-frontend.onrender.com',
      'https://mygrocart.onrender.com'
    ], // Allow React dev servers and production domains
    credentials: true
  }));
  app.use(express.json()); // Parse JSON bodies for all routes

  // Apply GraphQL middleware
  app.use(
    '/graphql',
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

  // API Routes
  app.use('/api/scraping', scrapingRoutes);

  // Serve static files (for potential frontend deployment)
  app.use(express.static('public'));

  // Connect to database (optional for development)
  try {
    await connectDB();
    console.log('Database connected for user authentication');
  } catch (error) {
    console.log('Database connection failed, using sample data for development');
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
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

