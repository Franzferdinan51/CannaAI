'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  const {
    onResult,
    onError,
    onStart,
    onEnd,
    language = 'en-US',
    continuous = false,
    interimResults = true,
    maxAlternatives = 1
  } = options;

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = language;
        recognition.maxAlternatives = maxAlternatives;

        recognition.onstart = () => {
          setIsListening(true);
          onStart?.();
        };

        recognition.onend = () => {
          setIsListening(false);
          setIsSpeaking(false);
          onEnd?.();
        };

        recognition.onresult = (event: any) => {
          let interim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];

            if (result.isFinal) {
              finalTranscriptRef.current += result[0].transcript;
              setIsSpeaking(false);
            } else {
              interim += result[0].transcript;
              setIsSpeaking(true);
            }
          }

          const newTranscript = finalTranscriptRef.current + interim;
          setTranscript(newTranscript);
          onResult?.(newTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          let errorMessage = 'Speech recognition error';

          switch (event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected';
              break;
            case 'audio-capture':
              errorMessage = 'Microphone not available';
              break;
            case 'not-allowed':
              errorMessage = 'Microphone permission denied';
              break;
            case 'network':
              errorMessage = 'Network error';
              break;
            case 'service-not-allowed':
              errorMessage = 'Speech recognition service not allowed';
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}`;
          }

          onError?.(errorMessage);
          setIsListening(false);
          setIsSpeaking(false);
        };

        recognition.onspeechstart = () => {
          setIsSpeaking(true);
        };

        recognition.onspeechend = () => {
          setIsSpeaking(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [language, continuous, interimResults, maxAlternatives, onResult, onError, onStart, onEnd]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        onError?.('Failed to start speech recognition');
      }
    }
  }, [isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    isSpeaking,
    startListening,
    stopListening,
    resetTranscript
  };
}