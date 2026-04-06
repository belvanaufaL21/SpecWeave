// FILE: server/index.js

// Suppress all warnings FIRST before any imports
process.removeAllListeners('warning');
process.on('warning', () => {}); // Ignore all warnings

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import clean logger
import cleanLogger from './src/config/cleanLogging.js';

// Import router yang ada di folder src/routes
import routes from './src/routes/index.js'; 
import { 
  errorHandlerMiddleware,
  requestIdMiddleware,
  errorLoggingMiddleware,
  errorRecoveryMiddleware,
  notFoundHandler
} from './src/middlewares/errorHandler.js';
import { performanceMiddleware } from './src/middleware/performanceMiddleware.js';
import { errorMonitoringMiddleware } from './src/middleware/errorMonitoringMiddleware.js';
import responseFormatter from './src/middlewares/shared/responseFormatter.js';
// import backendIntegrationService from './src/services/backendIntegrationService.js'; // Disabled - causing hang

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003;

// Startup message
cleanLogger.startup();

// Request ID middleware (first)
app.use(requestIdMiddleware);

// Response formatter middleware (adds res.success, res.error, etc.)
app.use(responseFormatter);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://specweave-client-production.up.railway.app',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control',
    'X-Fast-Request',
    'X-Force-Refresh',
    'X-Timestamp',
    'X-Health-Check',
    'X-Bulk-Health-Check'
  ]
}));
app.use(express.json());

// Performance monitoring middleware (before routes)
app.use(performanceMiddleware);

// Root endpoint (health check)
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'SpecWeave API Server',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
    }
  });
});

// Favicon endpoint
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Routes Utama (Prefix: /api)
// Request ke /api/gherkin akan diarahkan ke routes
app.use('/api', routes);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Error handling middleware chain
app.use(errorLoggingMiddleware);
app.use(errorMonitoringMiddleware);
app.use(errorRecoveryMiddleware);
app.use(errorHandlerMiddleware);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  cleanLogger.info('SIGTERM received, shutting down gracefully...');
  
  // Flush any pending error logs
  const errorLoggingService = await import('./src/services/errorLoggingService.js');
  await errorLoggingService.default.flush();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  cleanLogger.info('SIGINT received, shutting down gracefully...');
  
  // Flush any pending error logs
  const errorLoggingService = await import('./src/services/errorLoggingService.js');
  await errorLoggingService.default.flush();
  
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  cleanLogger.error('Unhandled Promise Rejection', reason);
  // Don't exit the process, let the error handler deal with it
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  cleanLogger.error('Uncaught Exception', error.message);
  // Exit the process for uncaught exceptions
  process.exit(1);
});

// Memory management - force GC periodically if available
if (global.gc) {
  setInterval(() => {
    try {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = before - after;
      
      if (freed > 10 * 1024 * 1024) { // Only log if freed > 10MB
        cleanLogger.info(`GC freed ${Math.round(freed / 1024 / 1024)}MB`);
      }
    } catch (e) {
      // GC failed, ignore
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ SpecWeave Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🔗 JIRA endpoints ready`);
});