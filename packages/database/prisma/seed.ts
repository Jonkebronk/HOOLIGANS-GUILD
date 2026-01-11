import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create the 3 initial teams
  const teams = [
    { name: 'TEAM NATO', description: 'NATO raid team' },
    { name: 'TEAM SWEDEN', description: 'Sweden raid team' },
    { name: 'PuG', description: 'Pick-up group raids' },
  ];

  for (const team of teams) {
    const existing = await prisma.team.findFirst({
      where: { name: team.name },
    });

    if (!existing) {
      await prisma.team.create({
        data: team,
      });
      console.log(`Created team: ${team.name}`);
    } else {
      console.log(`Team already exists: ${team.name}`);
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
