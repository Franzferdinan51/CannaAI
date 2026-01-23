
import { GoogleGenAI, LiveServerMessage, Modality, Type, GenerateContentResponse } from "@google/genai";

// Ensure process.env.API_KEY is available (injected by AISTudio or build)
// Fallback for types
declare const process: { env: { API_KEY: string } };
declare const window: any;

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Always use the process.env.API_KEY as per guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  // --- Image Generation ---
  async generateImage(prompt: string, size: "1K" | "2K" | "4K" = "1K", aspectRatio: string = "1:1"): Promise<string | null> {
    // Check for Veo/Image Key
    if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
        await window.aistudio.openSelectKey();
        // Re-init with new key context if needed, though usually it updates env
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    // High quality generation with Pro model
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio, imageSize: size },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  }

  async editImage(base64Image: string, prompt: string): Promise<string | null> {
    // Nano banana for editing
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: prompt },
        ],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  }

  // --- Video Generation (Veo) ---
  async generateVideo(prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string | null> {
    if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
        await window.aistudio.openSelectKey();
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    let operation = await this.ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    // Polling
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5s poll
      operation = await this.ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
        // Fetch bytes
        const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    }
    return null;
  }

  // --- Audio / TTS ---
  async generateSpeech(text: string, voiceName: string = 'Kore'): Promise<AudioBuffer | null> {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return await audioCtx.decodeAudioData(bytes.buffer);
    }
    return null;
  }

  // --- General Chat / Analysis ---
  async chat(
      message: string,
      history: any[] = [],
      media?: { data: string, mimeType: string },
      tools: { search?: boolean, maps?: boolean } = {},
      thinking: { enabled?: boolean, budget?: number } = {}
  ): Promise<any> {

    // Select Model
    let model = 'gemini-3-flash-preview'; // Default
    if (thinking.enabled || media || tools.search) model = 'gemini-3-pro-preview';
    if (tools.maps) model = 'gemini-2.5-flash'; // Maps only on 2.5
    if (thinking.enabled && thinking.budget) model = 'gemini-3-pro-preview';

    const config: any = {};

    // Tools
    const toolList = [];
    if (tools.search) toolList.push({ googleSearch: {} });
    if (tools.maps) toolList.push({ googleMaps: {} });
    if (toolList.length > 0) config.tools = toolList;

    // Thinking
    if (thinking.enabled) {
        config.thinkingConfig = { thinkingBudget: thinking.budget || 1024 };
        // Do not set maxOutputTokens with thinking unless specifically managed, relying on default
    }

    // Content construction
    const parts: any[] = [];
    if (media) {
        parts.push({ inlineData: { mimeType: media.mimeType, data: media.data } });
    }
    parts.push({ text: message });

    // History handling would go here, simplified for single turn with context
    // In a real chat, we'd use ai.chats.create, but for this diverse toolset, generateContent is flexible

    const response = await this.ai.models.generateContent({
      model,
      contents: { parts },
      config
    });

    return {
        text: response.text,
        grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  }

  // --- Live API (WebSockets) ---
  // Returns the session promise to hook into
  startLiveSession(onAudio: (buf: AudioBuffer) => void, onText: (text: string) => void) {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      let nextStartTime = 0;

      return this.ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
              onopen: () => console.log('Live Session Opened'),
              onmessage: async (msg: LiveServerMessage) => {
                  // Audio Output
                  const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                  if (base64Audio) {
                       const binaryString = atob(base64Audio);
                       const bytes = new Uint8Array(binaryString.length);
                       for(let i=0; i<binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

                       const buffer = await audioCtx.decodeAudioData(bytes.buffer);
                       const source = audioCtx.createBufferSource();
                       source.buffer = buffer;
                       source.connect(audioCtx.destination);

                       nextStartTime = Math.max(audioCtx.currentTime, nextStartTime);
                       source.start(nextStartTime);
                       nextStartTime += buffer.duration;
                  }

                  // Text Transcript (if enabled)
                  if (msg.serverContent?.modelTurn?.parts[0]?.text) {
                      onText(msg.serverContent.modelTurn.parts[0].text);
                  }
              },
              onclose: () => console.log('Live Session Closed'),
              onerror: (e) => console.error('Live Session Error', e)
          },
          config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
          }
      });
  }
}

export const gemini = new GeminiService();
