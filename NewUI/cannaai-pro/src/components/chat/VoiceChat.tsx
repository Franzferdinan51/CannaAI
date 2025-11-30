'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Play,
  Square,
  RotateCcw,
  Download,
  Upload,
  Globe,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  Waveform,
  Headphones,
  Languages,
  Sliders
} from 'lucide-react';

import { VoiceChatSettings } from './types';

interface VoiceChatProps {
  isEnabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  settings: VoiceChatSettings;
  onSettingsChange: (settings: VoiceChatSettings) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onTranscript: (text: string) => void;
  onSpeak: (text: string) => void;
  onStopSpeaking: () => void;
  className?: string;
}

export function VoiceChat({
  isEnabled,
  isListening,
  isSpeaking,
  transcript,
  settings,
  onSettingsChange,
  onStartListening,
  onStopListening,
  onTranscript,
  onSpeak,
  onStopSpeaking,
  className = ''
}: VoiceChatProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [playbackAudio, setPlaybackAudio] = useState<string | null>(null);

  // Refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check browser support
  useEffect(() => {
    const checkSupport = () => {
      const recognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      const synthesisSupported = 'speechSynthesis' in window;
      const mediaRecorderSupported = 'MediaRecorder' in window;

      setIsSupported(recognitionSupported && synthesisSupported && mediaRecorderSupported);
    };

    checkSupport();

    // Load available voices
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        setAvailableVoices(window.speechSynthesis.getVoices());
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Setup audio level monitoring
  useEffect(() => {
    if (isListening && !audioContextRef.current) {
      setupAudioMonitoring();
    } else if (!isListening && audioContextRef.current) {
      cleanupAudioMonitoring();
    }

    return () => {
      cleanupAudioMonitoring();
    };
  }, [isListening]);

  const setupAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
    } catch (error) {
      console.error('Failed to setup audio monitoring:', error);
    }
  };

  const cleanupAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  const handleSpeak = useCallback(() => {
    if (transcript.trim()) {
      onSpeak(transcript);
    }
  }, [transcript, onSpeak]);

  const updateSetting = (key: keyof VoiceChatSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const testVoice = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        "This is a test of the voice synthesis system. Your voice settings are working correctly."
      );
      utterance.voice = availableVoices.find(v => v.name === settings.voiceName) || null;
      utterance.lang = settings.language;
      utterance.rate = settings.speechRate;
      utterance.pitch = settings.pitch;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isSupported) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Voice Chat Not Supported</p>
            <p className="text-sm text-gray-400">
              Your browser doesn't support voice recognition or synthesis. Please try a modern browser.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg ${className}`}>
      {/* Main Voice Controls */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Voice Chat</h3>
            {isEnabled && (
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                Active
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="text-gray-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Voice Input/Output Display */}
        <div className="space-y-4">
          {/* Recording Status */}
          <div className="flex items-center justify-center">
            <Button
              onClick={handleVoiceToggle}
              disabled={!isEnabled}
              size="lg"
              className={`relative ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isListening ? (
                <>
                  <Square className="w-6 h-6" />
                  <span className="ml-2">Stop Recording</span>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6" />
                  <span className="ml-2">Start Recording</span>
                </>
              )}

              {/* Audio Level Indicator */}
              {isListening && (
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-0 bg-white/20 transition-all duration-100"
                    style={{ opacity: audioLevel }}
                  />
                </div>
              )}
            </Button>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center justify-center gap-4 text-sm">
            {isListening && (
              <div className="flex items-center gap-2 text-red-400">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                <span>Recording...</span>
              </div>
            )}

            {isSpeaking && (
              <div className="flex items-center gap-2 text-blue-400">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>Speaking...</span>
              </div>
            )}
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Transcript</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSpeak}
                    disabled={isSpeaking}
                    className="text-gray-400 hover:text-white"
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onTranscript('')}
                    className="text-gray-400 hover:text-white"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <p className="text-white whitespace-pre-wrap">{transcript}</p>
            </div>
          )}

          {/* Voice Settings */}
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-600 pt-4 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Language Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Languages className="w-4 h-4 inline mr-1" />
                      Language
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => updateSetting('language', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es-ES">Spanish</option>
                      <option value="fr-FR">French</option>
                      <option value="de-DE">German</option>
                      <option value="it-IT">Italian</option>
                      <option value="pt-BR">Portuguese</option>
                      <option value="ru-RU">Russian</option>
                      <option value="zh-CN">Chinese</option>
                      <option value="ja-JP">Japanese</option>
                    </select>
                  </div>

                  {/* Voice Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Volume2 className="w-4 h-4 inline mr-1" />
                      Voice
                    </label>
                    <select
                      value={settings.voiceName}
                      onChange={(e) => updateSetting('voiceName', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Default Voice</option>
                      {availableVoices.map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Speech Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Zap className="w-4 h-4 inline mr-1" />
                      Speech Rate: {settings.speechRate}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.speechRate}
                      onChange={(e) => updateSetting('speechRate', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Pitch */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Sliders className="w-4 h-4 inline mr-1" />
                      Pitch: {settings.pitch}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.pitch}
                      onChange={(e) => updateSetting('pitch', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Additional Settings */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={settings.autoSend}
                      onChange={(e) => updateSetting('autoSend', e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    Auto-send message after recording
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Max Recording Time: {settings.maxRecordingTime}s
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={settings.maxRecordingTime}
                      onChange={(e) => updateSetting('maxRecordingTime', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {settings.activationPhrase && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Activation Phrase
                      </label>
                      <input
                        type="text"
                        value={settings.activationPhrase}
                        onChange={(e) => updateSetting('activationPhrase', e.target.value)}
                        placeholder="e.g., 'Hey CannaAI'"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Test Voice Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={testVoice}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Test Voice
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Voice Audio Waveform (when listening) */}
      {isListening && (
        <div className="px-4 pb-4">
          <div className="h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
            <div className="flex items-center gap-1 h-full">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.05}s`
                  }}
                  animate={{
                    scaleY: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Voice chat allows hands-free conversation</span>
          <div className="flex items-center gap-2">
            {isListening && <span className="text-red-400">● Recording</span>}
            {isSpeaking && <span className="text-blue-400">● Speaking</span>}
            {!isListening && !isSpeaking && <span className="text-green-400">● Ready</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceChat;