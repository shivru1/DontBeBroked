import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Trash2, AlertTriangle, Sparkles, User, Mic, MicOff, Loader2 } from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { formatCurrency, formatShortDate } from '../utils/calculator';
import { audioBufferToWavBlob } from '../utils/audioRecorder';
import { transcribeAudio } from '../services/transcriptionService';

interface AdvisorChatViewProps {
  profile: UserProfile;
  messages: ChatMessage[];
  remainingBalance: number;
  fairDailyBudget: number;
  daysRemaining: number;
  isAiThinking: boolean;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
}

export const AdvisorChatView: React.FC<AdvisorChatViewProps> = ({
  profile,
  messages,
  remainingBalance,
  fairDailyBudget,
  daysRemaining,
  isAiThinking,
  onSendMessage,
  onClearChat
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioInputNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<any>(null);

  const currency = profile.currencySymbol || '₹';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking]);

  // Clean up recording if component unmounts
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    if (audioInputNodeRef.current) {
      audioInputNodeRef.current.disconnect();
      audioInputNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startRecording = async () => {
    setTranscribeError(null);
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      audioInputNodeRef.current = source;

      // Buffer size 4096, 1 input channel, 1 output channel
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Clone samples
        audioChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setTranscribeError(err?.message || 'Could not access microphone.');
      setIsRecording(false);
      stopRecordingCleanup();
    }
  };

  const stopRecordingAndTranscribe = async () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const sampleRate = audioContextRef.current?.sampleRate || 16000;
    const rawChunks = [...audioChunksRef.current];

    stopRecordingCleanup();

    // Flatten chunks
    const totalLength = rawChunks.reduce((acc, c) => acc + c.length, 0);
    if (totalLength < 1600) {
      // Less than 0.1 second of audio
      setTranscribeError('Audio too short. Please hold to speak.');
      return;
    }

    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of rawChunks) {
      mergedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    const wavBlob = audioBufferToWavBlob(mergedSamples, sampleRate);

    setIsTranscribing(true);
    setTranscribeError(null);
    try {
      const transcription = await transcribeAudio(wavBlob);
      if (transcription && transcription.trim()) {
        setInputText(prev => {
          const trimmedPrev = prev.trim();
          return trimmedPrev ? `${trimmedPrev} ${transcription.trim()}` : transcription.trim();
        });
      } else {
        setTranscribeError('No speech detected. Try speaking clearly.');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setTranscribeError('Transcription failed. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicClick = () => {
    if (isTranscribing) return;
    if (isRecording) {
      stopRecordingAndTranscribe();
    } else {
      startRecording();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
      setTranscribeError(null);
    }
  };

  const quickPrompts = [
    'How am I doing?',
    'Can I afford ₹800 sneakers?',
    'Budget survival tips',
    'I spent ₹350 on lunch'
  ];

  return (
    <div className="flex flex-col h-full flex-1 max-w-lg mx-auto bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              Smart Advisor
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-[11px] text-slate-400">
              Limit: <strong className="text-emerald-400">{formatCurrency(fairDailyBudget, currency)}/day</strong> • {daysRemaining} days left
            </p>
          </div>
        </div>

        <button
          onClick={onClearChat}
          className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg transition"
          title="Clear chat history"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 bg-slate-900/30 border-b border-slate-800/60 scrollbar-none shrink-0">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(prompt)}
            className="whitespace-nowrap bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 text-xs px-2.5 py-1 rounded-full transition"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300">Your Personal Budget Friend</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Log what you spend or ask anything (e.g. "Can I buy a ₹1,200 jacket?"). Tap the mic to speak or type your question.
              </p>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : msg.isAlert
                      ? 'bg-rose-950/80 border border-rose-500/40 text-rose-100 rounded-bl-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {!isUser && msg.isAlert && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Budget Alert
                    </div>
                  )}

                  <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                  
                  <span className="text-[10px] text-slate-400/80 block text-right mt-1.5">
                    {formatShortDate(msg.timestamp)}
                  </span>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isAiThinking && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Advisor calculating math…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Recording / Transcribing Indicator banner if active */}
      {(isRecording || isTranscribing || transcribeError) && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
          {isRecording && (
            <div className="flex items-center gap-2 text-rose-400 font-medium">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span>Recording audio ({recordDuration}s)… Tap mic again when finished</span>
            </div>
          )}
          {isTranscribing && (
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Transcribing audio with Gemini…</span>
            </div>
          )}
          {transcribeError && !isRecording && !isTranscribing && (
            <div className="text-amber-400 flex items-center justify-between w-full">
              <span>{transcribeError}</span>
              <button
                type="button"
                onClick={() => setTranscribeError(null)}
                className="text-slate-400 hover:text-white ml-2 underline text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="p-3 bg-slate-900/80 border-t border-slate-800 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder={isRecording ? "Listening to your voice..." : "Log spend (e.g. Spent ₹450) or ask advisor…"}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={isRecording}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
          />

          {/* Microphone transcription button */}
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isAiThinking}
            title={isRecording ? "Stop recording and transcribe" : "Speak to transcribe into text"}
            className={`rounded-xl p-3 flex items-center justify-center transition shadow-md ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-600/30'
                : isTranscribing
                ? 'bg-slate-800 text-emerald-400 cursor-wait'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shadow-slate-900/40'
            }`}
          >
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : isRecording ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isAiThinking || isRecording || isTranscribing}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl p-3 flex items-center justify-center transition shadow-md shadow-emerald-600/20"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

