/** Return true when an LM Studio catalog contains at least one chat model. */
export function hasUsableLMStudioChatModel(payload: any): boolean {
  const models = Array.isArray(payload?.models)
    ? payload.models
    : Array.isArray(payload?.data) ? payload.data : [];

  return models.some((model: any) => {
    const type = typeof model?.type === 'string' ? model.type.toLowerCase() : '';
    const id = String(model?.id || model?.key || model?.model || '').toLowerCase();
    if (!id || ['embedding', 'reranker', 'image-embedding'].includes(type)) return false;
    return !id.includes('embedding') && !id.includes('embed-') && !id.endsWith('-embed') && !id.includes('reranker');
  });
}
