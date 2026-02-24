// Prisma Client Singleton for Next.js with PostgreSQL adapter
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = global;

// Create PostgreSQL pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma client with adapter
const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
