// One-time script to clear all sessions on deploy
// This forces all users to re-login with fresh sessions
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearSessions() {
  console.log('Clearing all sessions...');
  const result = await prisma.session.deleteMany({});
  console.log(`Cleared ${result.count} sessions. All users will need to log in again.`);
  await prisma.$disconnect();
}

clearSessions().catch((e) => {
  console.error('Failed to clear sessions:', e);
  process.exit(1);
});
