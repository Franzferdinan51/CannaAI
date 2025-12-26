
/**
 * LM Studio Model Scanner for CannaAI
 * Automatically discovers and loads local LM Studio models
 */

class LMStudioModelScanner {
    constructor() {
        this.lmStudioPaths = this.detectLMStudioPaths();
        this.models = [];
        this.scanned = false;
    }

    detectLMStudioPaths() {
        const paths = [];

        // Windows paths
        if (process.platform === 'win32') {
            paths.push(
                path.join(os.homedir(), 'AppData', 'Roaming', 'LM-Studio', 'models'),
                path.join(os.homedir(), '.cache', 'lm-studio', 'models'),
                'C:\LM-Studio\models',
                'D:\LM-Studio\models'
            );
        }

        // macOS paths
        if (process.platform === 'darwin') {
            paths.push(
                path.join(os.homedir(), 'Library', 'Application Support', 'LM-Studio', 'models'),
                path.join(os.homedir(), '.cache', 'lm-studio', 'models')
            );
        }

        // Linux paths
        if (process.platform === 'linux') {
            paths.push(
                path.join(os.homedir(), '.local', 'share', 'LM-Studio', 'models'),
                path.join(os.homedir(), '.cache', 'lm-studio', 'models')
            );
        }

        return paths.filter(p => fs.existsSync(p));
    }

    async scanForModels() {
        this.models = [];

        for (const basePath of this.lmStudioPaths) {
            await this.scanDirectory(basePath);
        }

        this.scanned = true;
        return this.models;
    }

    async scanDirectory(dirPath) {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    await this.scanDirectory(fullPath);
                } else if (entry.name.endsWith('.gguf')) {
                    const model = await this.extractModelInfo(fullPath);
                    if (model) {
                        this.models.push(model);
                    }
                }
            }
        } catch (error) {
            console.warn(`Error scanning directory ${dirPath}:`, error.message);
        }
    }

    async extractModelInfo(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const fileName = path.basename(filePath, '.gguf');
            const relativePath = path.relative(this.lmStudioPaths[0] || '', filePath);

            // Extract model info from filename and path
            const modelInfo = {
                id: fileName.replace(/[^a-zA-Z0-9]/g, '_'),
                name: this.formatModelName(fileName),
                filename: fileName,
                filepath: filePath,
                relativePath: relativePath,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                modified: stats.mtime,
                provider: 'lmstudio-local',
                type: 'gguf',
                capabilities: this.detectCapabilities(fileName, filePath),
                metadata: {
                    source: 'LM Studio Local',
                    path: filePath,
                    version: '1.0.0'
                }
            };

            // Try to read additional metadata from companion files
            await this.loadAdditionalMetadata(modelInfo, filePath);

            return modelInfo;
        } catch (error) {
            console.warn(`Error extracting model info from ${filePath}:`, error.message);
            return null;
        }
    }

    formatModelName(fileName) {
        // Convert filename to readable model name
        return fileName
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace('Gguf', '')
            .replace('Q4_K_M', '(4-bit)')
            .replace('Q5_K_M', '(5-bit)')
            .replace('Q8_0', '(8-bit)')
            .replace('F16', '(FP16)')
            .trim();
    }

    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    detectCapabilities(fileName, filePath) {
        const capabilities = ['text-generation'];

        // Detect vision models
        if (fileName.toLowerCase().includes('vision') ||
            fileName.toLowerCase().includes('plant') ||
            fileName.toLowerCase().includes('image') ||
            fileName.toLowerCase().includes('cannai')) {
            capabilities.push('vision');
            capabilities.push('image-analysis');
        }

        // Detect classification models
        if (fileName.toLowerCase().includes('classifier') ||
            fileName.toLowerCase().includes('classification')) {
            capabilities.push('classification');
        }

        // Detect analysis models
        if (fileName.toLowerCase().includes('analysis') ||
            fileName.toLowerCase().includes('analyzer')) {
            capabilities.push('analysis');
        }

        return capabilities;
    }

    async loadAdditionalMetadata(modelInfo, filePath) {
        try {
            // Look for companion metadata files
            const baseName = filePath.replace('.gguf', '');
            const jsonFiles = [
                baseName + '.json',
                baseName + '_metadata.json',
                path.join(path.dirname(filePath), 'metadata.json')
            ];

            for (const jsonFile of jsonFiles) {
                if (fs.existsSync(jsonFile)) {
                    const metadata = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
                    Object.assign(modelInfo.metadata, metadata);
                    break;
                }
            }
        } catch (error) {
            // Ignore metadata loading errors
        }
    }

    getModelsByCapability(capability) {
        if (!this.scanned) {
            throw new Error('Models not scanned yet. Call scanForModels() first.');
        }

        return this.models.filter(model =>
            model.capabilities.includes(capability)
        );
    }

    getAllModels() {
        if (!this.scanned) {
            throw new Error('Models not scanned yet. Call scanForModels() first.');
        }

        return this.models;
    }

    getModelById(id) {
        if (!this.scanned) {
            throw new Error('Models not scanned yet. Call scanForModels() first.');
        }

        return this.models.find(model => model.id === id);
    }
}

export default LMStudioModelScanner;
