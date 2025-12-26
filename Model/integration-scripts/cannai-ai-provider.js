
/**
 * AI Provider Integration for CannaAI
 * Integrates local LM Studio models with the AI provider system
 */

import LMStudioModelScanner from './lmstudio-model-scanner.js';

class CannaAIProvider {
    constructor() {
        this.scanner = new LMStudioModelScanner();
        this.providers = new Map();
        this.currentProvider = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('Initializing CannaAI Provider...');

            // Scan for local LM Studio models
            await this.scanner.scanForModels();
            const models = this.scanner.getAllModels();

            console.log(`Found ${models.length} local models:`);
            models.forEach(model => {
                console.log(`  - ${model.name} (${model.sizeFormatted})`);
            });

            // Register providers for each model
            for (const model of models) {
                await this.registerModelProvider(model);
            }

            // Set default provider (prefer plant/vision models)
            this.setDefaultProvider();

            this.initialized = true;
            console.log('CannaAI Provider initialized successfully');

            return true;
        } catch (error) {
            console.error('Failed to initialize CannaAI Provider:', error);
            return false;
        }
    }

    async registerModelProvider(model) {
        const provider = {
            id: model.id,
            name: model.name,
            type: 'lmstudio-local',
            model: model,
            capabilities: model.capabilities,
            status: 'available',
            apiEndpoint: this.createLocalAPIEndpoint(model),
            metadata: model.metadata
        };

        this.providers.set(model.id, provider);

        console.log(`Registered provider: ${model.name} (${model.id})`);
    }

    createLocalAPIEndpoint(model) {
        // Create a local API endpoint for the model
        return {
            type: 'local',
            path: `/api/lmstudio/${model.id}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            modelPath: model.filepath
        };
    }

    setDefaultProvider() {
        // Prefer plant-specific or vision models
        const preferredModels = this.scanner.getModelsByCapability('vision')
            .concat(this.scanner.getModelsByCapability('classification'))
            .concat(this.scanner.getModelsByCapability('analysis'));

        if (preferredModels.length > 0) {
            const preferredProvider = this.providers.get(preferredModels[0].id);
            if (preferredProvider) {
                this.currentProvider = preferredProvider;
                console.log(`Set default provider: ${preferredProvider.name}`);
                return;
            }
        }

        // Fallback to first available model
        if (this.providers.size > 0) {
            const firstProvider = this.providers.values().next().value;
            this.currentProvider = firstProvider;
            console.log(`Set default provider: ${firstProvider.name}`);
        }
    }

    getAvailableProviders() {
        return Array.from(this.providers.values());
    }

    getCurrentProvider() {
        return this.currentProvider;
    }

    async switchProvider(providerId) {
        const provider = this.providers.get(providerId);
        if (provider) {
            this.currentProvider = provider;
            console.log(`Switched to provider: ${provider.name}`);
            return true;
        }
        return false;
    }

    async generateResponse(prompt, options = {}) {
        if (!this.initialized) {
            throw new Error('Provider not initialized. Call initialize() first.');
        }

        if (!this.currentProvider) {
            throw new Error('No provider selected.');
        }

        try {
            const response = await this.callLocalModel(prompt, options);
            return response;
        } catch (error) {
            console.error('Error generating response:', error);
            throw error;
        }
    }

    async callLocalModel(prompt, options = {}) {
        const provider = this.currentProvider;

        // Prepare request payload
        const payload = {
            model: provider.model.filepath,
            messages: [
                {
                    role: 'system',
                    content: options.systemPrompt || 'You are an expert plant health analyzer.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 512,
            stream: options.stream || false
        };

        // Add image if provided
        if (options.image) {
            payload.messages.push({
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: prompt
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: options.image
                        }
                    }
                ]
            });
        }

        try {
            // Call LM Studio local API
            const response = await fetch('http://localhost:1234/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`LM Studio API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            return {
                content: result.choices[0].message.content,
                provider: provider.name,
                model: provider.model.name,
                usage: result.usage,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            if (error.message.includes('ECONNREFUSED')) {
                throw new Error('LM Studio is not running. Please start LM Studio first.');
            }
            throw error;
        }
    }

    // Health check for LM Studio
    async checkLMStudioHealth() {
        try {
            const response = await fetch('http://localhost:1234/v1/models', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const models = await response.json();
                return {
                    status: 'healthy',
                    models: models.data || [],
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export default CannaAIProvider;
