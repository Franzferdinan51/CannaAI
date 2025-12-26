import { ProcessedPlantDocument, ModelConfig, ChatMessage } from '../types/plant-analysis';

const DB_NAME = 'CannaAIProDB';
const DB_VERSION = 1;
const STORE_DOCUMENTS = 'documents';
const STORE_CONFIG = 'config';
const STORE_CHAT = 'chat';
const STORE_STRAINS = 'strains';

/**
 * Initialize IndexedDB
 */
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Documents store
      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        const docStore = db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
        docStore.createIndex('status', 'status', { unique: false });
        docStore.createIndex('group', 'group', { unique: false });
      }

      // Config store
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }

      // Chat store
      if (!db.objectStoreNames.contains(STORE_CHAT)) {
        const chatStore = db.createObjectStore(STORE_CHAT, { keyPath: 'id', autoIncrement: true });
        chatStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Strains store
      if (!db.objectStoreNames.contains(STORE_STRAINS)) {
        const strainStore = db.createObjectStore(STORE_STRAINS, { keyPath: 'id' });
        strainStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
};

// ==================== DOCUMENTS ====================

export const saveDocument = async (doc: ProcessedPlantDocument): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const request = store.put(doc);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getDocuments = async (): Promise<ProcessedPlantDocument[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const getDocument = async (id: string): Promise<ProcessedPlantDocument | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const deleteDocument = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearDocuments = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getDocumentsByStatus = async (status: string): Promise<ProcessedPlantDocument[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const index = store.index('status');
    const request = index.getAll(status);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const getDocumentsByGroup = async (group: string): Promise<ProcessedPlantDocument[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORE_DOCUMENTS);
    const index = store.index('group');
    const request = index.getAll(group);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// ==================== CONFIG ====================

export const saveConfig = async (config: ModelConfig): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONFIG, 'readwrite');
    const store = tx.objectStore(STORE_CONFIG);
    const request = store.put({ key: 'modelConfig', ...config });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getConfig = async (): Promise<ModelConfig | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONFIG, 'readonly');
    const store = tx.objectStore(STORE_CONFIG);
    const request = store.get('modelConfig');
    request.onsuccess = () => {
      if (request.result) {
        const { key, ...config } = request.result;
        resolve(config as ModelConfig);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// ==================== CHAT ====================

export const saveChatMessage = async (message: ChatMessage): Promise<number> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAT, 'readwrite');
    const store = tx.objectStore(STORE_CHAT);
    const request = store.add(message);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const getChatHistory = async (limit: number = 50): Promise<ChatMessage[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAT, 'readonly');
    const store = tx.objectStore(STORE_CHAT);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');
    const messages: ChatMessage[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor && messages.length < limit) {
        messages.push(cursor.value);
        cursor.continue();
      } else {
        resolve(messages.reverse());
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearChatHistory = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAT, 'readwrite');
    const store = tx.objectStore(STORE_CHAT);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ==================== STRAINS ====================

export const saveStrain = async (strain: any): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STRAINS, 'readwrite');
    const store = tx.objectStore(STORE_STRAINS);
    const request = store.put(strain);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getStrains = async (): Promise<any[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STRAINS, 'readonly');
    const store = tx.objectStore(STORE_STRAINS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteStrain = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STRAINS, 'readwrite');
    const store = tx.objectStore(STORE_STRAINS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ==================== UTILITY ====================

/**
 * Export all data as JSON
 */
export const exportAllData = async (): Promise<string> => {
  const [documents, config, chat, strains] = await Promise.all([
    getDocuments(),
    getConfig(),
    getChatHistory(),
    getStrains()
  ]);

  return JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    documents,
    config,
    chat,
    strains
  }, null, 2);
};

/**
 * Import data from JSON
 */
export const importData = async (jsonData: string): Promise<void> => {
  const data = JSON.parse(jsonData);

  if (data.documents) {
    for (const doc of data.documents) {
      await saveDocument(doc);
    }
  }

  if (data.config) {
    await saveConfig(data.config);
  }

  if (data.chat) {
    for (const msg of data.chat) {
      await saveChatMessage(msg);
    }
  }

  if (data.strains) {
    for (const strain of data.strains) {
      await saveStrain(strain);
    }
  }
};

/**
 * Clear all data
 */
export const clearAllData = async (): Promise<void> => {
  await Promise.all([
    clearDocuments(),
    clearChatHistory()
  ]);
};

/**
 * Get database stats
 */
export const getDBStats = async (): Promise<{
  documentCount: number;
  chatMessageCount: number;
  strainCount: number;
  estimatedSize: string;
}> => {
  const [documents, chat, strains] = await Promise.all([
    getDocuments(),
    getChatHistory(),
    getStrains()
  ]);

  // Rough size estimation
  const docsSize = new Blob([JSON.stringify(documents)]).size;
  const chatSize = new Blob([JSON.stringify(chat)]).size;
  const strainsSize = new Blob([JSON.stringify(strains)]).size;
  const totalBytes = docsSize + chatSize + strainsSize;

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return {
    documentCount: documents.length,
    chatMessageCount: chat.length,
    strainCount: strains.length,
    estimatedSize: formatSize(totalBytes)
  };
};
