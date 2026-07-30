import { getUnifiedAI, UnifiedAI } from '@/lib/ai-providers/unified-ai';

export type MoaProvider = string | undefined;

export interface LocalMoaRequest {
  task: string;
  context?: string;
  provider?: MoaProvider;
  model?: string;
  maxAdvisorTokens?: number;
  maxAggregatorTokens?: number;
}

export interface MoaStageResult {
  role: 'planner' | 'skeptic' | 'aggregator';
  content: string;
  provider: string;
  model: string;
  latency: number;
}

export interface LocalMoaResult {
  answer: string;
  stages: MoaStageResult[];
}

const plannerInstruction = [
  'You are the planner in CannaAI\'s local Mixture-of-Agents workflow.',
  'Break the cultivation or operational task into concrete, safe next actions.',
  'Identify missing information, dependencies, ordering, and how to verify the result.',
  'Do not claim to have used tools or observed anything outside the supplied context.'
].join(' ');

const skepticInstruction = [
  'You are the technical skeptic in CannaAI\'s local Mixture-of-Agents workflow.',
  'Challenge assumptions and identify plant-safety risks, false diagnoses, missing evidence,',
  'edge cases, and verification gaps. Offer a safer or more reliable alternative where useful.',
  'Do not claim to have used tools or observed anything outside the supplied context.'
].join(' ');

export class LocalMoaAdvisors {
  constructor(private readonly ai: Pick<UnifiedAI, 'execute'> & Partial<Pick<UnifiedAI, 'refreshProviderHealth'>> = getUnifiedAI()) {}

  async run(request: LocalMoaRequest): Promise<LocalMoaResult> {
    const task = request.task.trim();
    if (!task) throw new Error('A task is required for MoA advice.');

    // Refresh before selecting so a stale startup health value cannot route
    // the entire three-stage workflow into a dead provider. Prefer the
    // currently loaded local model, then the connected agent bridges.
    const statuses = this.ai.refreshProviderHealth
      ? await this.ai.refreshProviderHealth()
      : [];
    const requestedProvider = request.provider === 'grok' ? 'openclaw' : request.provider;
    const selectedProvider = requestedProvider || [
      'lm-studio',
      'openclaw',
      'hermes',
      'openrouter',
      'gemini'
    ].find((name) => statuses.some((status) => status.name === name && status.health.status === 'healthy'));
    const selectedModel = request.model || (request.provider === 'grok' ? 'grok-4.20-0309-reasoning' : undefined);
    if (!selectedProvider) {
      throw new Error('No connected AI provider is available. Connect LM Studio, OpenClaw, or Hermes in Settings.');
    }

    const selectedRequest = { ...request, provider: selectedProvider, model: selectedModel };

    const planner = await this.runStage('planner', plannerInstruction, task, request.context, selectedRequest, request.maxAdvisorTokens || 500);
    const skeptic = await this.runStage('skeptic', skepticInstruction, task, request.context, selectedRequest, request.maxAdvisorTokens || 500);

    const synthesisPrompt = [
      'You are the final synthesizer in CannaAI\'s local Mixture-of-Agents workflow.',
      'Return one finished, actionable answer to the original task. Resolve conflicts using sound cultivation judgment.',
      'Prioritize safety, clear measurements, and observable verification steps. Do not mention the workflow unless it matters.',
      '',
      `Original task:\n${task}`,
      request.context ? `\nRelevant context:\n${request.context}` : '',
      `\nPlanner advice:\n${planner.content}`,
      `\nSkeptic review:\n${skeptic.content}`
    ].join('\n');

    const aggregator = await this.runStage(
      'aggregator',
      synthesisPrompt,
      task,
      undefined,
      selectedRequest,
      request.maxAggregatorTokens || 1400,
      true
    );

    return { answer: aggregator.content, stages: [planner, skeptic, aggregator] };
  }

  private async runStage(
    role: MoaStageResult['role'],
    instruction: string,
    task: string,
    context: string | undefined,
    request: LocalMoaRequest,
    maxTokens: number,
    isCompletePrompt = false
  ): Promise<MoaStageResult> {
    const messages = isCompletePrompt
      ? [{ role: 'user' as const, content: instruction }]
      : [
          { role: 'system' as const, content: instruction },
          { role: 'user' as const, content: [`Task:\n${task}`, context ? `\nRelevant context:\n${context}` : ''].join('\n') }
        ];
    const response = await this.ai.execute({
      type: 'chat',
      messages,
      provider: request.provider,
      model: request.model,
      temperature: role === 'skeptic' ? 0.45 : 0.3,
      maxTokens,
      quality: 'balanced',
      metadata: { workflow: 'local-moa', stage: role }
    });

    return {
      role,
      content: response.content,
      provider: response.provider,
      model: response.model,
      latency: response.metadata.latency
    };
  }
}

let localMoaAdvisors: LocalMoaAdvisors | null = null;

export function getLocalMoaAdvisors(): LocalMoaAdvisors {
  if (!localMoaAdvisors) localMoaAdvisors = new LocalMoaAdvisors();
  return localMoaAdvisors;
}
