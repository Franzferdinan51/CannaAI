
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/plants/inventory/route';

async function benchmark() {
  console.log('Starting benchmark...');

  // 1. Create dummy data
  // Create a large JSON object to simulate row weight
  const largeMetadata = {
    history: Array(50).fill('Some long history string to make the row heavy to simulate real world usage'),
    logs: Array(50).fill({ timestamp: Date.now(), message: 'Detailed log message with enough text to matter' })
  };
  const largeImages = Array(10).fill('https://example.com/some/very/long/url/to/simulate/a/large/json/array/of/images/that/takes/space.jpg');

  const batchSize = 100;
  const totalPlants = 1000;
  console.log(`Creating ${totalPlants} dummy plants...`);

  const createdIds = [];

  for (let i = 0; i < totalPlants; i += batchSize) {
     const batch = [];
     for(let j=0; j<batchSize; j++) {
        batch.push({
            name: `Bench Plant ${i+j}`,
            stage: 'vegetative',
            isActive: (i+j) % 2 === 0,
            health: { score: Math.floor(Math.random() * 100) },
            images: largeImages,
            metadata: largeMetadata,
        });
     }
     await prisma.plant.createMany({ data: batch });
  }

  console.log('Dummy data created.');

  // 2. Measure GET performance
  // Warmup
  await GET();

  const start = performance.now();

  // We call the handler logic directly to avoid network overhead, focusing on DB/Processing
  await GET();

  const end = performance.now();
  console.log(`Inventory GET execution time: ${(end - start).toFixed(2)}ms`);

  // 3. Cleanup
  console.log('Cleaning up...');
  await prisma.plant.deleteMany({
    where: {
      name: { startsWith: 'Bench Plant' }
    }
  });
  console.log('Done.');
}

benchmark().catch(console.error);
