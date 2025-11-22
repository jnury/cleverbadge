const { PrismaClient } = require('@prisma/client');

// Create a single PrismaClient instance for the entire application
// This prevents exhausting the database connection pool
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle graceful shutdown for all termination scenarios
const shutdown = async (signal) => {
  try {
    await prisma.$disconnect();
    if (signal) {
      console.log(`Received ${signal}, gracefully shutting down`);
      process.exit(0);
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('beforeExit', () => shutdown());
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = prisma;
