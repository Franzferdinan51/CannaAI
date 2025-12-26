import { NextRequest, NextResponse } from 'next/server';
import {
  runCouncilSession,
  getAvailablePersonas,
  getPersonaById,
  getRecommendedPersonas,
  getModeDescription
} from '@/lib/ai/councilService';
import {
  extractMemoriesFromSession,
  saveMemories,
  getMemoriesForPersona,
  getMemoriesForTopic,
  searchMemories,
  getMemoryStats,
  formatMemoriesAsContext
} from '@/lib/ai/councilMemoryService';
import {
  createPredictionMarket,
  closePredictionMarket,
  getPredictionAccuracyStats,
  suggestPredictionQuestions
} from '@/lib/ai/predictionMarketService';
import {
  executeModeLogic,
  getAllModes,
  getRecommendedPersonasForMode,
  suggestModeForTopic
} from '@/lib/ai/sessionModesService';
import {
  createSwarmPipeline,
  executeSwarmPipeline,
  generateCodePackage,
  reviewPipelineResults,
  suggestAutomationTasks
} from '@/lib/ai/swarmCodingService';
import {
  extractArguments,
  evaluateArgumentStrength,
  findCounterArguments,
  synthesizeArguments,
  buildArgumentMap
} from '@/lib/ai/argumentationFrameworkService';
import {
  addDocument,
  semanticSearch,
  indexCouncilSession,
  smartQuery,
  deleteDocuments,
  getVectorStats
} from '@/lib/ai/vectorSearchService';
import {
  calculateSessionMetrics,
  analyzeAndOptimize,
  generateOptimizationReport,
  getOptimizationSuggestions
} from '@/lib/ai/adaptiveOrchestrationService';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Main AI Council API endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;
    const apiKey = body.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 });
    }

    switch (action) {
      // === Council Sessions ===
      case 'run-session': {
        const { topic, mode, personaIds, existingSession } = data;
        const session = await runCouncilSession(topic, mode, personaIds, apiKey, existingSession);

        // Extract and save memories
        const participants = personaIds.map((id: string) => getPersonaById(id)).filter(Boolean);
        const memories = extractMemoriesFromSession(session, participants);
        await saveMemories(memories);

        // Index session for search
        await indexCouncilSession(session.id, session.messages, session.topic);

        return NextResponse.json({ success: true, data: session });
      }

      case 'execute-mode': {
        const { topic, mode, personaIds } = data;
        const result = await executeModeLogic(mode, topic, personaIds, apiKey);
        return NextResponse.json({ success: true, data: result });
      }

      // === Personas ===
      case 'get-personas': {
        const personas = getAvailablePersonas();
        return NextResponse.json({ success: true, data: personas });
      }

      case 'get-persona': {
        const { id } = data;
        const persona = getPersonaById(id);
        if (!persona) {
          return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: persona });
      }

      case 'recommend-personas': {
        const { topic, mode } = data;
        const personas = mode
          ? getRecommendedPersonasForMode(mode, topic)
          : getRecommendedPersonas(topic, mode);
        return NextResponse.json({ success: true, data: personas });
      }

      // === Modes ===
      case 'get-modes': {
        const modes = getAllModes();
        return NextResponse.json({ success: true, data: modes });
      }

      case 'suggest-mode': {
        const { topic } = data;
        const suggestions = suggestModeForTopic(topic);
        return NextResponse.json({ success: true, data: suggestions });
      }

      case 'get-mode-description': {
        const { mode } = data;
        const description = getModeDescription(mode);
        return NextResponse.json({ success: true, data: { mode, description } });
      }

      // === Memory ===
      case 'get-memories': {
        const { personaId, topic } = data;
        const memories = topic
          ? await getMemoriesForTopic(topic, personaId)
          : await getMemoriesForPersona(personaId);
        return NextResponse.json({ success: true, data: memories });
      }

      case 'search-memories': {
        const { query, personaId } = data;
        const memories = await searchMemories(query, personaId);
        return NextResponse.json({ success: true, data: memories });
      }

      case 'get-memory-stats': {
        const { personaId } = data;
        const stats = await getMemoryStats(personaId);
        return NextResponse.json({ success: true, data: stats });
      }

      case 'format-memories-context': {
        const { personaId, topic } = data;
        const memories = topic
          ? await getMemoriesForTopic(topic, personaId)
          : await getMemoriesForPersona(personaId);
        const context = formatMemoriesAsContext(memories);
        return NextResponse.json({ success: true, data: { context } });
      }

      // === Prediction Market ===
      case 'create-prediction-market': {
        const { question, category, context, participantIds } = data;
        const market = await createPredictionMarket(question, category, context, apiKey, participantIds);
        return NextResponse.json({ success: true, data: market });
      }

      case 'close-prediction-market': {
        const { session, actualOutcome } = data;
        const closed = closePredictionMarket(session, actualOutcome);
        return NextResponse.json({ success: true, data: closed });
      }

      case 'suggest-prediction-questions': {
        const { context } = data;
        const questions = await suggestPredictionQuestions(context, apiKey);
        return NextResponse.json({ success: true, data: questions });
      }

      case 'get-prediction-stats': {
        const { resolvedPredictions } = data;
        const stats = getPredictionAccuracyStats(resolvedPredictions);
        return NextResponse.json({ success: true, data: stats });
      }

      // === Swarm Coding ===
      case 'create-swarm-pipeline': {
        const { task, pipelineType, participantIds } = data;
        const pipeline = createSwarmPipeline(task, pipelineType, participantIds);
        return NextResponse.json({ success: true, data: pipeline });
      }

      case 'execute-swarm-pipeline': {
        const { task, pipelineType, participantIds } = data;
        const pipeline = await executeSwarmPipeline(task, pipelineType, participantIds, apiKey);
        return NextResponse.json({ success: true, data: pipeline });
      }

      case 'generate-code-package': {
        const { pipeline } = data;
        const codePackage = generateCodePackage(pipeline);
        return NextResponse.json({ success: true, data: codePackage });
      }

      case 'review-pipeline': {
        const { pipeline } = data;
        const review = await reviewPipelineResults(pipeline, apiKey);
        return NextResponse.json({ success: true, data: review });
      }

      case 'suggest-automation-tasks': {
        const { context } = data;
        const tasks = await suggestAutomationTasks(context, apiKey);
        return NextResponse.json({ success: true, data: tasks });
      }

      // === Argumentation ===
      case 'extract-arguments': {
        const { discussion, topic } = data;
        const extractedArgs = await extractArguments(discussion, topic, apiKey);
        return NextResponse.json({ success: true, data: extractedArgs });
      }

      case 'evaluate-argument': {
        const { argument } = data;
        const evaluation = evaluateArgumentStrength(argument);
        return NextResponse.json({ success: true, data: evaluation });
      }

      case 'find-counter-arguments': {
        const { argument } = data;
        const counterArguments = await findCounterArguments(argument, apiKey);
        return NextResponse.json({ success: true, data: counterArguments });
      }

      case 'synthesize-arguments': {
        const { arguments: args, topic } = data;
        const synthesis = await synthesizeArguments(args, topic, apiKey);
        return NextResponse.json({ success: true, data: synthesis });
      }

      case 'build-argument-map': {
        const { arguments: args } = data;
        const map = buildArgumentMap(args);
        return NextResponse.json({ success: true, data: map });
      }

      // === Vector Search ===
      case 'add-document': {
        const { content, metadata } = data;
        const id = await addDocument(content, metadata);
        return NextResponse.json({ success: true, data: { id } });
      }

      case 'semantic-search': {
        const { query, options } = data;
        const results = await semanticSearch(query, options);
        return NextResponse.json({ success: true, data: results });
      }

      case 'smart-query': {
        const { query, context, limit } = data;
        const results = await smartQuery(query, context, limit);
        return NextResponse.json({ success: true, data: results });
      }

      case 'delete-documents': {
        const { filter } = data;
        const count = await deleteDocuments(filter);
        return NextResponse.json({ success: true, data: { deletedCount: count } });
      }

      case 'get-vector-stats': {
        const stats = await getVectorStats();
        return NextResponse.json({ success: true, data: stats });
      }

      // === Adaptive Orchestration ===
      case 'calculate-metrics': {
        const { session, responseTimes } = data;
        const metrics = calculateSessionMetrics(session, responseTimes);
        return NextResponse.json({ success: true, data: metrics });
      }

      case 'analyze-and-optimize': {
        const { recentSessions, recentMetrics, config } = data;
        const action = await analyzeAndOptimize(recentSessions, recentMetrics, config);
        return NextResponse.json({ success: true, data: action });
      }

      case 'generate-optimization-report': {
        const { sessions, metrics } = data;
        const report = generateOptimizationReport(sessions, metrics);
        return NextResponse.json({ success: true, data: { report } });
      }

      case 'get-optimization-suggestions': {
        const { session, metrics } = data;
        const suggestions = getOptimizationSuggestions(session, metrics);
        return NextResponse.json({ success: true, data: suggestions });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[COUNCIL API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint for council data retrieval
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'personas':
        const personas = getAvailablePersonas();
        return NextResponse.json({ success: true, data: personas });

      case 'modes':
        const modes = getAllModes();
        return NextResponse.json({ success: true, data: modes });

      case 'vector-stats':
        const stats = await getVectorStats();
        return NextResponse.json({ success: true, data: stats });

      case 'memory-stats':
        const personaId = searchParams.get('personaId') || undefined;
        const memoryStats = await getMemoryStats(personaId);
        return NextResponse.json({ success: true, data: memoryStats });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[COUNCIL API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
