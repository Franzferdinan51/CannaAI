
import { MetricPoint, LogMessage, ExperienceItem } from '../types';

export const generateMockMetrics = (step: number): MetricPoint => {
  const baseReward = 0.4 + Math.min(step * 0.005, 0.5); // Gradual increase
  const randomFluctuation = (Math.random() - 0.5) * 0.1;

  return {
    step,
    reward: Math.max(0, Math.min(1, baseReward + randomFluctuation)),
    success_rate: Math.max(0, Math.min(1, (baseReward * 0.8) + (Math.random() * 0.05))),
    loss: Math.max(0, 2.0 * Math.exp(-step * 0.01) + (Math.random() * 0.2)),
  };
};

export const generateMockLog = (step: number): LogMessage => {
  const types: ('INFO' | 'DEBUG' | 'WARNING')[] = ['INFO', 'INFO', 'INFO', 'DEBUG'];
  const msgs = [
    `Processing step ${step}...`,
    `Agent executing action: click(element_74)`,
    `Reward received: ${Math.random().toFixed(4)}`,
    `Updating weights via GRPO...`,
    `ReMe service: Storing trajectory #${1000 + step}`,
  ];

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleTimeString(),
    level: types[Math.floor(Math.random() * types.length)],
    message: msgs[Math.floor(Math.random() * msgs.length)]
  };
};

export const MOCK_EXPERIENCE: ExperienceItem[] = [
  {
    id: 'exp-001',
    task: 'Find a red mechanical keyboard under $100',
    trajectory: 'Search -> Filter Price -> Click Item 3 -> Verify Color -> Buy',
    outcome: 'Success',
    reflection: 'Filtering by price first significantly reduces search space.',
    timestamp: '10:42 AM',
    reward: 0.95,
    environment: 'WebShop',
    tags: ['ecommerce', 'search', 'optimal']
  },
  {
    id: 'exp-002',
    task: 'Book a flight to Tokyo on JAL',
    trajectory: 'Search Flights -> Select Date -> Scroll -> Timeout',
    outcome: 'Failure',
    reflection: 'Need to handle pagination more efficiently to avoid timeout.',
    timestamp: '10:45 AM',
    reward: 0.10,
    environment: 'AppWorld',
    tags: ['timeout', 'navigation', 'retry']
  },
  {
    id: 'exp-003',
    task: 'Find the capital of Bhutan',
    trajectory: 'Search "Bhutan Capital" -> Read snippet -> Answer "Thimphu"',
    outcome: 'Success',
    reflection: 'Direct query is effective for factual retrieval.',
    timestamp: '10:48 AM',
    reward: 1.0,
    environment: 'WebShop',
    tags: ['qa', 'factoid', 'fast']
  },
  {
    id: 'exp-004',
    task: 'Optimize Database Query',
    trajectory: 'Analyze Schema -> Identify Index -> Rewrite Query -> Test',
    outcome: 'Success',
    reflection: 'Adding compound index reduced latency by 40%.',
    timestamp: '11:15 AM',
    reward: 0.88,
    environment: 'SWE-Bench-Lite',
    tags: ['coding', 'sql', 'optimization']
  },
  {
    id: 'exp-005',
    task: 'Defend against SQL Injection',
    trajectory: 'Scan Logs -> Identify Pattern -> Apply WAF Rule -> Fail',
    outcome: 'Failure',
    reflection: 'WAF rule was too permissive; need strict input validation.',
    timestamp: '11:30 AM',
    reward: -0.5,
    environment: 'CyberSecSim',
    tags: ['security', 'defense', 'failed-attempt']
  }
];
