export function normalizeRemoteModels(models: any[]): any[] {
  const normalized = new Map<string, any>();

  for (const model of models) {
    const id = typeof (model?.key || model?.id) === 'string'
      ? String(model.key || model.id).trim()
      : '';
    const lowerId = id.toLowerCase();
    if (
      !id ||
      model?.type === 'embedding' ||
      model?.type === 'reranker' ||
      lowerId.includes('embedding') ||
      lowerId.includes('reranker') ||
      lowerId.includes('embed-')
    ) continue;

    const loaded = Array.isArray(model.loaded_instances) && model.loaded_instances.length > 0;
    const vision = model.capabilities?.vision === true;
    const existing = normalized.get(id);
    if (existing) {
      if (vision && !existing.capabilities.includes('vision')) {
        existing.capabilities.push('vision', 'image-analysis');
        existing.metadata.input = ['text', 'image'];
      }
      if (loaded && !existing.loaded) {
        existing.loaded = true;
        existing.capabilities.push('loaded');
      }
      continue;
    }

    const input = vision ? ['text', 'image'] : ['text'];
    normalized.set(id, {
      id,
      name: model.display_name || model.name || model.key || model.id,
      filename: model.key || model.id,
      author: model.publisher || 'LM Studio',
      filepath: '',
      relativePath: '',
      fullPath: '',
      size: model.size_bytes || 0,
      sizeFormatted: model.size_bytes ? `${(model.size_bytes / (1024 ** 3)).toFixed(2)} GB` : 'Remote',
      sizeGB: model.size_bytes ? model.size_bytes / (1024 ** 3) : 0,
      sizeMB: model.size_bytes ? model.size_bytes / (1024 ** 2) : 0,
      modified: new Date().toISOString(),
      provider: 'lmstudio-remote',
      type: 'remote',
      loaded,
      capabilities: [
        'text-generation',
        ...(input.includes('image') ? ['vision', 'image-analysis'] : []),
        ...(loaded ? ['loaded'] : [])
      ],
      quantization: model.quantization || 'Unknown',
      contextLength: model.max_context_length || 0,
      metadata: { source: 'LM Studio API', publisher: model.publisher, key: model.key, input }
    });
  }

  return Array.from(normalized.values());
}
