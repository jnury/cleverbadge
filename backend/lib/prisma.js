const { PrismaClient } = require('@prisma/client');

// Create a single PrismaClient instance for the entire application
// This prevents exhausting the database connection pool
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
