"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, RotateCcw, MessageSquare, X } from "lucide-react";
import VoiceOrb from "@/components/VoiceOrb";
import VoiceSelector from "@/components/VoiceSelector";
import ChatMessage from "@/components/ChatMessage";
import MistralLogo from "@/components/MistralLogo";
import { VOICES, DEFAULT_VOICE, Voice } from "@/lib/voices";

type AppState = "idle" | "listening" | "thinking" | "speaking";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SILENCE_THRESHOLD = 0.018;
const SILENCE_DURATION = 1300;
const AUTO_LISTEN_DELAY = 450;

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(DEFAULT_VOICE);
  const [transcript, setTranscript] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Message[]>([]);
  const spacePressedRef = useRef(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const autoListenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionActiveRef = useRef(false);

  useEffect(() => {
    conversationRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    sessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    return () => {
      stopAudio();
      cleanupRecording();
      abortControllerRef.current?.abort();
      if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
    };
  }, []);

  const cleanupRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const clearAutoListen = useCallback(() => {
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
  }, []);

  const interrupt = useCallback(() => {
    stopAudio();
    abortControllerRef.current?.abort();
    cleanupRecording();
    clearAutoListen();
    setAppState("idle");
    setTranscript("");
    setIsSessionActive(false);
    sessionActiveRef.current = false;
  }, [stopAudio, cleanupRecording, clearAutoListen]);

  const playAudio = useCallback(
    async (audioBlob: Blob): Promise<void> => {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audioRef.current = audio;

      return new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (audioRef.current === audio) audioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (audioRef.current === audio) audioRef.current = null;
          resolve();
        };
        audio.play().catch(() => {
          URL.revokeObjectURL(url);
          if (audioRef.current === audio) audioRef.current = null;
          resolve();
        });
      });
    },
    []
  );

  const generateSpeech = useCallback(
    async (text: string, signal: AbortSignal): Promise<Blob | null> => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId: selectedVoice.id }),
          signal,
        });
        if (!res.ok) {
          console.error("TTS failed");
          return null;
        }
        return await res.blob();
      } catch (e: any) {
        if (e.name === "AbortError") return null;
        console.error("TTS error:", e);
        return null;
      }
    },
    [selectedVoice.id]
  );

  const monitorSilence = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const x = (dataArray[i] - 128) / 128;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / dataArray.length);

    if (rms < SILENCE_THRESHOLD) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }, SILENCE_DURATION);
      }
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(monitorSilence);
  }, []);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecordingRef = useRef<() => Promise<void>>(async () => {});
  const sendMessageRef = useRef<(text: string) => Promise<void>>(async () => {});

  const startRecording = useCallback(async () => {
    try {
      stopAudio();
      abortControllerRef.current?.abort();
      cleanupRecording();
      clearAutoListen();
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      monitorSilence();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cleanupRecording();

        if (audioChunksRef.current.length === 0) {
          if (sessionActiveRef.current) {
            autoListenTimerRef.current = setTimeout(() => {
              if (sessionActiveRef.current) startRecordingRef.current();
            }, AUTO_LISTEN_DELAY);
          } else {
            setAppState("idle");
          }
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        setAppState("thinking");

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const res = await fetch("/api/stt", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error("STT failed");
          }

          const data = await res.json();
          const text = data.text?.trim();

          if (!text) {
            if (sessionActiveRef.current) {
              autoListenTimerRef.current = setTimeout(() => {
                if (sessionActiveRef.current) startRecordingRef.current();
              }, AUTO_LISTEN_DELAY);
            } else {
              setAppState("idle");
            }
            return;
          }

          await sendMessageRef.current(text);
        } catch (e) {
          console.error("STT error:", e);
          if (sessionActiveRef.current) {
            autoListenTimerRef.current = setTimeout(() => {
              if (sessionActiveRef.current) startRecordingRef.current();
            }, AUTO_LISTEN_DELAY);
          } else {
            setAppState("idle");
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setAppState("listening");
      setTranscript("");
    } catch (e) {
      console.error("Microphone access error:", e);
      alert("Please allow microphone access to use voice mode.");
      setIsSessionActive(false);
      sessionActiveRef.current = false;
      setAppState("idle");
    }
  }, [cleanupRecording, clearAutoListen, monitorSilence]);

  startRecordingRef.current = startRecording;

  const sendMessage = useCallback(
    async (userText: string) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setAppState("thinking");
      setTranscript(userText);

      const newMessages: Message[] = [
        ...conversationRef.current,
        { role: "user", content: userText },
      ];
      setMessages(newMessages);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Chat request failed");
        }

        const data = await res.json();
        const assistantContent = data.content || "I'm not sure what to say.";

        if (controller.signal.aborted) return;

        const finalMessages: Message[] = [
          ...newMessages,
          { role: "assistant", content: assistantContent },
        ];
        setMessages(finalMessages);
        conversationRef.current = finalMessages;

        const audioBlob = await generateSpeech(assistantContent, controller.signal);
        if (audioBlob && !controller.signal.aborted) {
          setAppState("speaking");
          await playAudio(audioBlob);
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Chat error:", e);
        }
      }

      if (!controller.signal.aborted) {
        if (sessionActiveRef.current) {
          setAppState("idle");
          setTranscript("");
          clearAutoListen();
          autoListenTimerRef.current = setTimeout(() => {
            if (sessionActiveRef.current) {
              startRecordingRef.current();
            }
          }, AUTO_LISTEN_DELAY);
        } else {
          setAppState("idle");
          setTranscript("");
        }
      }
    },
    [generateSpeech, playAudio, clearAutoListen]
  );

  sendMessageRef.current = sendMessage;

  const handleOrbClick = useCallback(() => {
    if (appState === "idle") {
      setIsSessionActive(true);
      sessionActiveRef.current = true;
      startRecording();
    } else if (appState === "listening") {
      stopRecording();
    } else if (appState === "speaking" || appState === "thinking") {
      interrupt();
      setTimeout(() => {
        setIsSessionActive(true);
        sessionActiveRef.current = true;
        startRecording();
      }, 80);
    }
  }, [appState, startRecording, stopRecording, interrupt]);

  const handleReset = useCallback(() => {
    interrupt();
    setMessages([]);
    conversationRef.current = [];
  }, [interrupt]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !spacePressedRef.current) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

        e.preventDefault();
        spacePressedRef.current = true;

        if (appState === "idle") {
          setIsSessionActive(true);
          sessionActiveRef.current = true;
          startRecording();
        } else if (appState === "speaking" || appState === "thinking") {
          interrupt();
          setTimeout(() => {
            setIsSessionActive(true);
            sessionActiveRef.current = true;
            startRecording();
          }, 80);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        spacePressedRef.current = false;
        if (appState === "listening") {
          stopRecording();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [appState, startRecording, stopRecording, interrupt]);

  const stateLabels: Record<AppState, string> = {
    idle: isSessionActive ? "Listening..." : "Tap to start",
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
  };

  const stateSubtext: Record<AppState, string> = {
    idle: isSessionActive ? "speak whenever you're ready" : "or hold space",
    listening: "pause to send · tap to stop",
    thinking: "tap to interrupt",
    speaking: "tap to interrupt",
  };

  return (
    <main className="relative min-h-screen bg-[#f7f5f2] text-[#1a1a1a] flex flex-col items-center select-none">
      {/* Soft ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.04]"
          style={{
            background: `radial-gradient(circle, ${selectedVoice.color} 0%, transparent 60%)`,
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <MistralLogo className="w-8 h-[22px]" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-[#1a1a1a]">
              Mistral
            </span>
            <span className="text-[10px] text-[#fa500f] font-medium -mt-0.5">
              Voice Mode · Community Edition
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSessionActive && appState !== "idle" && (
            <button
              onClick={() => interrupt()}
              className="px-3 py-2 rounded-xl bg-white border border-[#e5e2de] text-[#888888] hover:text-[#1a1a1a] hover:border-[#d5d2ce] transition-colors text-xs font-medium"
            >
              End
            </button>
          )}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2.5 rounded-xl border transition-colors ${
              showChat
                ? "bg-[#fa500f]/8 border-[#fa500f]/20 text-[#fa500f]"
                : "bg-white border-[#e5e2de] text-[#888888] hover:text-[#1a1a1a] hover:border-[#d5d2ce]"
            }`}
          >
            {showChat ? <X size={18} /> : <MessageSquare size={18} />}
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-white border border-[#e5e2de] text-[#888888] hover:text-[#1a1a1a] hover:border-[#d5d2ce] transition-colors"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-6 pb-16 md:pb-8">
        {/* Status text */}
        <div className="mb-8 text-center min-h-[80px]">
          <h1
            className="text-2xl font-semibold text-[#1a1a1a] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {stateLabels[appState]}
          </h1>
          <p className="mt-2 text-sm text-[#999999]">
            {stateSubtext[appState]}
          </p>
          {transcript && appState !== "idle" && (
            <p className="mt-3 text-sm text-[#666666] max-w-md mx-auto animate-fade-in-up font-medium">
              &ldquo;{transcript}&rdquo;
            </p>
          )}
        </div>

        {/* Voice Orb */}
        <div className="relative flex items-center justify-center mb-10">
          <button
            onClick={handleOrbClick}
            className="relative flex items-center justify-center outline-none focus:outline-none cursor-pointer"
          >
            <VoiceOrb state={appState} color={selectedVoice.color} />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {appState === "idle" && !isSessionActive && (
                <Mic size={30} className="text-white/95" />
              )}
              {appState === "idle" && isSessionActive && (
                <Mic size={28} className="text-white/95" />
              )}
              {appState === "listening" && (
                <Square size={24} className="text-white/95 fill-white/95" />
              )}
              {appState === "thinking" && (
                <div className="flex items-end gap-[5px] h-5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-[5px] bg-white/95 rounded-full sound-bar"
                      style={{ animationDelay: `${i * 0.15}s`, height: "4px" }}
                    />
                  ))}
                </div>
              )}
              {appState === "speaking" && (
                <div className="flex items-end gap-[4px] h-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-[4px] bg-white/95 rounded-full sound-bar"
                      style={{ animationDelay: `${i * 0.1}s`, animationDuration: "0.4s" }}
                    />
                  ))}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Voice Selector */}
        <VoiceSelector
          voices={VOICES}
          selected={selectedVoice}
          onSelect={(v) => {
            setSelectedVoice(v);
            stopAudio();
          }}
        />

        {/* Chat overlay */}
        {showChat && messages.length > 0 && (
          <div 
            className="fixed inset-0 z-20 bg-[#f7f5f2]/97 backdrop-blur-xl flex flex-col pt-[72px]"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e2de] shrink-0">
              <span className="text-sm font-medium text-[#888888]">
                Conversation
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="text-sm text-[#888888] hover:text-[#1a1a1a] transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-y-contain px-6 py-4 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} index={i} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer 
        className="relative z-10 w-full py-3 pb-8 md:pb-4 flex items-center justify-center gap-4 text-xs text-[#aaaaaa]"
        style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
      >
        <span>Community Edition · Not affiliated with Mistral AI</span>
        <a
          href="https://x.com/noctus91"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[#888888] hover:text-[#1a1a1a] transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="font-medium">@noctus91</span>
        </a>
      </footer>
    </main>
  );
}
