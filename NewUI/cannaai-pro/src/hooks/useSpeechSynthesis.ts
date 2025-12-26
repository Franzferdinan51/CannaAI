'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechSynthesisOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  availableVoices: SpeechSynthesisVoice[];
  speak: (text: string, options?: Partial<SpeechSynthesisOptions>) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function useSpeechSynthesis(defaultOptions: SpeechSynthesisOptions = {}): UseSpeechSynthesisReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const {
    voice: defaultVoice,
    rate: defaultRate = 1,
    pitch: defaultPitch = 1,
    volume: defaultVolume = 1,
    onStart,
    onEnd,
    onError
  } = defaultOptions;

  // Check browser support and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        setAvailableVoices(window.speechSynthesis.getVoices());
      };

      // Load voices immediately
      updateVoices();

      // Update voices when they change
      window.speechSynthesis.onvoiceschanged = updateVoices;

      // Check speaking state
      const checkSpeakingState = () => {
        setIsSpeaking(window.speechSynthesis.speaking);
      };

      const interval = setInterval(checkSpeakingState, 100);

      return () => {
        clearInterval(interval);
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      setIsSupported(false);
    }
  }, []);

  const speak = useCallback((text: string, options: Partial<SpeechSynthesisOptions> = {}) => {
    if (!isSupported) {
      onError?.('Speech synthesis not supported');
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set voice
    const selectedVoiceName = options.voice || defaultVoice;
    if (selectedVoiceName) {
      const voice = availableVoices.find(v => v.name === selectedVoiceName);
      if (voice) {
        utterance.voice = voice;
      }
    }

    // Set other options
    utterance.rate = options.rate ?? defaultRate;
    utterance.pitch = options.pitch ?? defaultPitch;
    utterance.volume = options.volume ?? defaultVolume;

    // Set event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
      onStart?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      let errorMessage = 'Speech synthesis error';

      switch (event.error) {
        case 'network':
          errorMessage = 'Network error while loading voice';
          break;
        case 'synthesis-unavailable':
          errorMessage = 'Speech synthesis unavailable';
          break;
        case 'synthesis-failed':
          errorMessage = 'Speech synthesis failed';
          break;
        case 'language-unavailable':
          errorMessage = 'Language not available';
          break;
        case 'voice-unavailable':
          errorMessage = 'Voice not available';
          break;
        case 'text-too-long':
          errorMessage = 'Text too long';
          break;
        case 'rate-not-supported':
          errorMessage = 'Rate not supported';
          break;
        default:
          errorMessage = `Speech synthesis error: ${event.error}`;
      }

      onError?.(errorMessage);
    };

    utteranceRef.current = utterance;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to speak:', error);
      onError?.('Failed to speak');
    }
  }, [isSupported, availableVoices, defaultVoice, defaultRate, defaultPitch, defaultVolume, onStart, onEnd, onError]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.pause();
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.resume();
    }
  }, [isSupported]);

  return {
    isSupported,
    isSpeaking,
    availableVoices,
    speak,
    stop,
    pause,
    resume
  };
}