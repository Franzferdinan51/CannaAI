import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting benchmark setup...');

  // Cleanup existing test data if any
  await prisma.automationRule.deleteMany({ where: { type: 'benchmark_test' } });
  await prisma.trigger.deleteMany({ where: { type: 'benchmark_test' } });

  console.log('Creating triggers...');
  const triggers = [];
  for (let i = 0; i < 100; i++) {
    triggers.push({
      name: `Benchmark Trigger ${i}`,
      type: 'benchmark_test',
      conditions: {},
      enabled: true,
    });
  }

  // Create triggers and get their IDs
  // SQLite doesn't support createMany well with returning IDs easily in all prisma versions/adapters,
  // but let's try creating them one by one or mapped.
  // Actually createMany is supported but doesn't return IDs.
  // So I'll create them in a loop or transaction to get IDs.

  const createdTriggerIds: string[] = [];
  for (const t of triggers) {
    const created = await prisma.trigger.create({ data: t });
    createdTriggerIds.push(created.id);
  }

  console.log(`Created ${createdTriggerIds.length} triggers.`);

  console.log('Creating automation rules...');
  const rulesData = [];
  for (let i = 0; i < 10000; i++) {
    const randomTriggerId = createdTriggerIds[Math.floor(Math.random() * createdTriggerIds.length)];
    rulesData.push({
      name: `Benchmark Rule ${i}`,
      type: 'benchmark_test',
      conditions: {},
      actions: {},
      triggerId: randomTriggerId,
      enabled: true
    });
  }

  // createMany is faster for rules
  await prisma.automationRule.createMany({
    data: rulesData
  });

  console.log(`Created ${rulesData.length} automation rules.`);

  console.log('Running benchmark...');
  const iterations = 5;
  let totalTime = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    const results = await prisma.trigger.findMany({
      where: { type: 'benchmark_test' },
      include: {
        rules: true
      }
    });

    const end = performance.now();
    const duration = end - start;
    console.log(`Iteration ${i + 1}: ${duration.toFixed(2)}ms. Found ${results.length} triggers.`);
    totalTime += duration;
  }

  console.log(`Average time: ${(totalTime / iterations).toFixed(2)}ms`);

  console.log('Cleaning up...');
  await prisma.automationRule.deleteMany({ where: { type: 'benchmark_test' } });
  await prisma.trigger.deleteMany({ where: { type: 'benchmark_test' } });
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
