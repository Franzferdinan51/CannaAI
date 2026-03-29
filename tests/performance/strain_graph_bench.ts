
console.log('Starting Benchmark: StrainGraph Physics Loop');

// Setup
const numNodes = 200; // Increased to make the difference more visible
const iterations = 1000;
console.log(`Nodes: ${numNodes}, Iterations: ${iterations}`);

const nodesBaseline = Array.from({ length: numNodes }, (_, i) => ({
  id: i,
  x: Math.random() * 800,
  y: Math.random() * 600,
  vx: 0,
  vy: 0
}));

// Clone for fair comparison
const nodesOptimized = JSON.parse(JSON.stringify(nodesBaseline));

// Baseline
console.time('Naive O(N^2)');
for (let iter = 0; iter < iterations; iter++) {
  nodesBaseline.forEach(node => {
    nodesBaseline.forEach(other => {
      if (node === other) return;
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const minDist = 300;

      if (dist < minDist) {
         const force = 1500 / (dist * dist + 10);
         node.vx += (dx/dist) * force;
         node.vy += (dy/dist) * force;
      }
    });
  });
}
console.timeEnd('Naive O(N^2)');

// Optimized
console.time('Optimized O(N^2/2) + Early Rejection');
for (let iter = 0; iter < iterations; iter++) {
  // 1. Force Accumulation
  for (let i = 0; i < nodesOptimized.length; i++) {
    const node = nodesOptimized[i];
    for (let j = i + 1; j < nodesOptimized.length; j++) {
      const other = nodesOptimized[j];
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const distSq = dx * dx + dy * dy;
      const minDistSq = 300 * 300;

      if (distSq < minDistSq) {
         const dist = Math.sqrt(distSq) || 1;
         const force = 1500 / (distSq + 10);
         const fx = (dx/dist) * force;
         const fy = (dy/dist) * force;

         node.vx += fx;
         node.vy += fy;
         other.vx -= fx; // Symmetric force
         other.vy -= fy;
      }
    }
  }
}
console.timeEnd('Optimized O(N^2/2) + Early Rejection');
