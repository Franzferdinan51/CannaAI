/**
 * Swarm Coding Service
 * Multi-phase code generation pipeline for cultivation automation
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  SwarmPhase,
  SwarmCodingPipeline,
  CouncilPersona,
  CULTIVATION_PERSONAS
} from '../../types/council';

const getAiClient = (apiKey: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("API Key not found");
  return new GoogleGenerativeAI({ apiKey: key });
};

/**
 * Pipeline configurations
 */
export const PIPELINE_CONFIGS = {
  '6-phase': [
    { id: '1', name: 'Requirements Analysis', description: 'Analyze requirements and define specifications' },
    { id: '2', name: 'Architecture Design', description: 'Design system architecture and components' },
    { id: '3', name: 'Implementation', description: 'Write the core implementation code' },
    { id: '4', name: 'Testing', description: 'Create tests and validate functionality' },
    { id: '5', name: 'Documentation', description: 'Write documentation and usage examples' },
    { id: '6', name: 'Review', description: 'Final review and optimization' }
  ],
  '12-phase': [
    { id: '1', name: 'Requirements Analysis', description: 'Analyze requirements' },
    { id: '2', name: 'Research', description: 'Research existing solutions' },
    { id: '3', name: 'Architecture Design', description: 'Design architecture' },
    { id: '4', name: 'Component Design', description: 'Design individual components' },
    { id: '5', name: 'Implementation Core', description: 'Implement core functionality' },
    { id: '6', name: 'Implementation Features', description: 'Implement features' },
    { id: '7', name: 'Integration', description: 'Integrate components' },
    { id: '8', name: 'Unit Testing', description: 'Write unit tests' },
    { id: '9', name: 'Integration Testing', description: 'Integration tests' },
    { id: '10', name: 'Documentation', description: 'Write documentation' },
    { id: '11', name: 'Code Review', description: 'Review code quality' },
    { id: '12', name: 'Optimization', description: 'Optimize performance' }
  ],
  '24-phase': [
    // Extended pipeline with granular phases
    { id: '1', name: 'Requirements Analysis', description: 'Analyze requirements' },
    { id: '2', name: 'Stakeholder Analysis', description: 'Identify stakeholders' },
    { id: '3', name: 'Research', description: 'Research existing solutions' },
    { id: '4', name: 'Feasibility Study', description: 'Assess feasibility' },
    { id: '5', name: 'Architecture Design', description: 'Design architecture' },
    { id: '6', name: 'Database Design', description: 'Design data structures' },
    { id: '7', name: 'API Design', description: 'Design API interfaces' },
    { id: '8', name: 'UI Design', description: 'Design user interface' },
    { id: '9', name: 'Security Design', description: 'Design security measures' },
    { id: '10', name: 'Scalability Design', description: 'Plan for scalability' },
    { id: '11', name: 'Implementation Setup', description: 'Setup project structure' },
    { id: '12', name: 'Implementation Core', description: 'Implement core logic' },
    { id: '13', name: 'Implementation Models', description: 'Implement data models' },
    { id: '14', name: 'Implementation API', description: 'Implement API endpoints' },
    { id: '15', name: 'Implementation UI', description: 'Implement UI components' },
    { id: '16', name: 'Integration', description: 'Integrate all components' },
    { id: '17', name: 'Unit Testing', description: 'Write unit tests' },
    { id: '18', name: 'Integration Testing', description: 'Integration tests' },
    { id: '19', name: 'Security Testing', description: 'Security testing' },
    { id: '20', name: 'Performance Testing', description: 'Performance testing' },
    { id: '21', name: 'Documentation', description: 'Write documentation' },
    { id: '22', name: 'Code Review', description: 'Review code quality' },
    { id: '23', name: 'Optimization', description: 'Optimize performance' },
    { id: '24', name: 'Deployment Prep', description: 'Prepare for deployment' }
  ]
};

/**
 * Create a swarm coding pipeline
 */
export function createSwarmPipeline(
  task: string,
  pipelineType: '6-phase' | '12-phase' | '24-phase',
  participantIds: string[]
): SwarmCodingPipeline {
  const phaseConfigs = PIPELINE_CONFIGS[pipelineType];

  const phases: SwarmPhase[] = phaseConfigs.map((config, index) => ({
    id: `phase-${config.id}`,
    name: config.name,
    description: config.description,
    assignees: assignPhaseToPersonas(index, participantIds),
    status: index === 0 ? 'pending' : 'pending',
    output: undefined
  }));

  return {
    id: crypto.randomUUID(),
    task,
    phases,
    currentPhase: 0,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
}

/**
 * Assign phases to personas
 */
function assignPhaseToPersonas(
  phaseIndex: number,
  participantIds: string[]
): string[] {
  // Round-robin assignment
  const assignee = participantIds[phaseIndex % participantIds.length];
  return [assignee];
}

/**
 * Execute a single phase
 */
export async function executePhase(
  pipeline: SwarmCodingPipeline,
  phaseIndex: number,
  apiKey: string,
  previousOutputs?: Map<string, string>
): Promise<{ output: string; updatedPipeline: SwarmCodingPipeline }> {
  const phase = pipeline.phases[phaseIndex];
  if (!phase) {
    throw new Error(`Phase ${phaseIndex} not found`);
  }

  const assignee = CULTIVATION_PERSONAS.find(p => p.id === phase.assignees[0]);
  if (!assignee) {
    throw new Error(`Persona ${phase.assignees[0]} not found`);
  }

  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: assignee.modelId,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000
    }
  });

  // Build context from previous phases
  let context = `TASK: ${pipeline.task}\n\n`;
  context += `CURRENT PHASE: ${phase.name}\n`;
  context += `PHASE DESCRIPTION: ${phase.description}\n\n`;

  if (previousOutputs && previousOutputs.size > 0) {
    context += `PREVIOUS PHASE OUTPUT:\n\n`;
    previousOutputs.forEach((output, phaseId) => {
      context += `--- ${phaseId} ---\n${output}\n\n`;
    });
  }

  const prompt = `${assignee.systemPrompt}\n\n${context}\n\nExecute this phase. Provide detailed output that will be used in subsequent phases.`;

  try {
    const response = await model.generateContent(prompt);
    const output = response.response.text() || "Phase execution failed.";

    // Update pipeline
    const updatedPhases = [...pipeline.phases];
    updatedPhases[phaseIndex] = {
      ...phase,
      status: 'completed',
      output
    };

    const updatedPipeline: SwarmCodingPipeline = {
      ...pipeline,
      phases: updatedPhases,
      currentPhase: phaseIndex + 1,
      status: phaseIndex === pipeline.phases.length - 1 ? 'completed' : 'running'
    };

    return { output, updatedPipeline };
  } catch (error) {
    console.error(`Error executing phase ${phase.name}:`, error);
    throw error;
  }
}

/**
 * Execute entire pipeline
 */
export async function executeSwarmPipeline(
  task: string,
  pipelineType: '6-phase' | '12-phase' | '24-phase',
  participantIds: string[],
  apiKey: string,
  onProgress?: (phase: string, progress: number) => void
): Promise<SwarmCodingPipeline> {
  const pipeline = createSwarmPipeline(task, pipelineType, participantIds);
  const previousOutputs = new Map<string, string>();

  let currentPipeline = { ...pipeline, status: 'running' as const };

  for (let i = 0; i < pipeline.phases.length; i++) {
    const phase = pipeline.phases[i];

    if (onProgress) {
      onProgress(phase.name, ((i + 1) / pipeline.phases.length) * 100);
    }

    const result = await executePhase(currentPipeline, i, apiKey, previousOutputs);
    previousOutputs.set(`Phase ${i + 1}: ${phase.name}`, result.output);
    currentPipeline = result.updatedPipeline;
  }

  return currentPipeline;
}

/**
 * Generate final code package
 */
export function generateCodePackage(pipeline: SwarmCodingPipeline): {
  code: string;
  documentation: string;
  tests: string;
  metadata: any;
} {
  // Collect outputs from implementation phases
  const implementationOutputs = pipeline.phases
    .filter(p => p.name.toLowerCase().includes('implementation') || p.name.toLowerCase().includes('integration'))
    .map(p => p.output || '')
    .join('\n\n');

  const documentationOutputs = pipeline.phases
    .filter(p => p.name.toLowerCase().includes('documentation'))
    .map(p => p.output || '')
    .join('\n\n');

  const testOutputs = pipeline.phases
    .filter(p => p.name.toLowerCase().includes('testing'))
    .map(p => p.output || '')
    .join('\n\n');

  return {
    code: implementationOutputs || '// No code generated',
    documentation: documentationOutputs || '// No documentation',
    tests: testOutputs || '// No tests',
    metadata: {
      taskId: pipeline.id,
      task: pipeline.task,
      totalPhases: pipeline.phases.length,
      completedPhases: pipeline.phases.filter(p => p.status === 'completed').length,
      timestamp: pipeline.timestamp
    }
  };
}

/**
 * Review pipeline results
 */
export async function reviewPipelineResults(
  pipeline: SwarmCodingPipeline,
  apiKey: string
): Promise<{
  overallQuality: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}> {
  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.5,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          overallQuality: { type: "NUMBER" },
          strengths: { type: "ARRAY", items: { type: "STRING" } },
          weaknesses: { type: "ARRAY", items: { type: "STRING" } },
          recommendations: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["overallQuality", "strengths", "weaknesses", "recommendations"]
      }
    }
  });

  const allOutputs = pipeline.phases
    .map(p => `## ${p.name}\n${p.output || '(No output)'}`)
    .join('\n\n');

  const prompt = `Review this swarm coding pipeline output:\n\nTASK: ${pipeline.task}\n\nPIPELINE OUTPUT:\n${allOutputs}\n\nEvaluate the quality, identify strengths and weaknesses, and provide recommendations for improvement.`;

  try {
    const response = await model.generateContent(prompt);
    return JSON.parse(response.response.text());
  } catch (error) {
    console.error("Error reviewing pipeline:", error);
    return {
      overallQuality: 0.5,
      strengths: [],
      weaknesses: ['Review failed'],
      recommendations: []
    };
  }
}

/**
 * Suggest automation tasks for cultivation
 */
export async function suggestAutomationTasks(
  context: string,
  apiKey: string
): Promise<string[]> {
  const ai = getAiClient(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.8,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          tasks: {
            type: "ARRAY",
            items: { type: "STRING" }
          }
        },
        required: ["tasks"]
      }
    }
  });

  const prompt = `Based on this cultivation context:\n\n${context}\n\nSuggest 5 automation tasks that would benefit this grow operation. Examples include: nutrient dosing scripts, lighting schedules, climate control routines, data logging systems, alert systems, etc.`;

  try {
    const response = await model.generateContent(prompt);
    const result = JSON.parse(response.response.text());
    return result.tasks || [];
  } catch (error) {
    console.error("Error suggesting automation tasks:", error);
    return [];
  }
}
