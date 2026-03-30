"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Building2,
  Handshake,
  Plane,
  Users,
  Trash2,
  Shield,
  Sparkles,
  Sun,
  Moon,
  Square
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/* ------------------------------------------------------------------ */
/*  Premium animations — slow, zero‑bounce                             */
/* ------------------------------------------------------------------ */
const glideInitial = { opacity: 0, y: 24 };
const glideExit = { opacity: 0, y: 10, transition: { duration: 0.3 } };
const glideAnimate = (delay = 0) => ({
  opacity: 1,
  y: 0,
  transition: {
    delay,
    duration: 0.85,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
});

const msgAnim = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

/* ------------------------------------------------------------------ */
/*  SmoothText Component (Word Streaming Effect)                       */
/* ------------------------------------------------------------------ */
const SmoothText = ({ content, isGenerating }: { content: string; isGenerating: boolean }) => {
  return (
    <span className="leading-[1.65] relative whitespace-pre-wrap">
      {content.split(/(\s+)/).map((part, i) => {
        if (!part.trim()) return <span key={i}>{part}</span>;
        return (
          <span key={i} className="animate-word-appear inline-block">
            {part}
          </span>
        );
      })}
      {isGenerating && (
        <span className="inline-block w-2.5 h-[15px] ml-1 -mb-[2px] align-baseline bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
      )}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Widget data                                                        */
/* ------------------------------------------------------------------ */
const widgets = [
  {
    Icon: Building2,
    label: "Serbest bölge avantajları",
    full: "Serbest bölge avantajları nelerdir?",
    glow: "icon-glow-red",
  },
  {
    Icon: Handshake,
    label: "Yatırım süreci",
    full: "ESBAŞ'ta yatırım süreci nasıl işler?",
    glow: "icon-glow-blue",
  },
  {
    Icon: Plane,
    label: "Gümrük işlemleri",
    full: "Gümrük işlemleri hakkında bilgi almak istiyorum.",
    glow: "icon-glow-red",
  },
  {
    Icon: Users,
    label: "Bölgedeki firmalar",
    full: "ESBAŞ bölgesinde faaliyet gösteren firmalar hakkında bilgi verir misin?",
    glow: "icon-glow-blue",
  },
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => setMounted(true), []);

  const scrollToBottom = useCallback(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  /* ── Stop Generation ── */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  /* ── Send ── */
  const sendMessage = async (text?: string) => {
    // Mevcut bir stream varsa, iptal et ki yeni soru akabilsin
    if (isLoading) {
      stopGeneration();
    }

    const question = (text ?? input).trim();
    if (!question) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: new Date(),
      },
    ]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setIsLoading(true);

    const assistantMsgId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    abortControllerRef.current = new AbortController();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://esbasai.melihcetin.dev";
    try {
      const res = await fetch(`${API_BASE_URL}/ask_stream`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true" 
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          question,
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
      });

      const returnedSessionId = res.headers.get("x-session-id") || res.headers.get("session_id");
      if (returnedSessionId) setSessionId(returnedSessionId);

      if (!res.body) throw new Error("Body yok");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (firstChunk) {
          firstChunk = false;
        }

        const chunkText = decoder.decode(value, { stream: true });
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + chunkText }
              : msg
          )
        );
        scrollToBottom(); // Akıcı okuma için canlı scroll
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + " [İptal Edildi]" }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content || "Bağlantı hatası — sunucuya ulaşılamadı." }
              : msg
          )
        );
      }
    } finally {
      if (abortControllerRef.current) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const clearChat = () => {
    stopGeneration();
    setMessages([]);
    setSessionId(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const hasMessages = messages.length > 0;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div
      className={`flex flex-col h-screen relative overflow-hidden transition-all duration-700 ease-in-out ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-950 via-[#001730] to-[#2a000a] text-white"
          : "text-slate-800"
      }`}
      style={!isDarkMode ? { background: "radial-gradient(circle at 50% -20%, #ffffff 0%, #f5f5f7 70%, #eaeef2 100%)" } : {}}
    >
      {/* ═══ Ambient depth orbs ═══ */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div
          className="absolute rounded-full blur-[120px] opacity-40 transition-all duration-1000 ease-in-out"
          style={{
            width: "700px",
            height: "700px",
            top: "-20%",
            right: "-10%",
            background: isDarkMode ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.06)",
          }}
        />
        <div
          className="absolute rounded-full blur-[120px] opacity-40 transition-all duration-1000 ease-in-out"
          style={{
            width: "600px",
            height: "600px",
            bottom: "-10%",
            left: "-10%",
            background: isDarkMode ? "rgba(225,29,72,0.15)" : "rgba(225,29,72,0.05)",
          }}
        />
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/*  HEADER                                                      */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <header
        className={`relative z-10 flex items-center justify-between px-6 py-4 transition-all duration-500 ${
          isDarkMode
            ? "border-b border-white/5 bg-slate-900/30 backdrop-blur-2xl"
            : "border-b border-black/5 bg-white/40 backdrop-blur-2xl shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all duration-500 shadow-sm ${
              isDarkMode
                ? "bg-white/10 border border-white/10 text-blue-300"
                : "bg-white border border-slate-200 text-blue-500"
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span
              className={`text-[15px] font-extrabold tracking-wide transition-colors duration-500 ${
                isDarkMode ? "text-white" : "text-slate-800"
              }`}
              style={{ letterSpacing: "0.02em" }}
            >
              ESBAŞ AI Asistanı
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className={`text-[10px] font-semibold tracking-wider ${isDarkMode ? "text-white/50" : "text-slate-500"}`}>BİLGİ AĞI AKTİF</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasMessages && (
            <button
              onClick={clearChat}
              className={`flex items-center justify-center w-10 h-10 rounded-[14px] cursor-pointer transition-all duration-300 ${
                isDarkMode
                  ? "bg-white/5 border border-white/10 text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20"
                  : "bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 shadow-sm"
              }`}
              title="Sohbeti Temizle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`flex items-center justify-center w-10 h-10 rounded-[14px] cursor-pointer transition-all duration-300 shadow-sm ${
              isDarkMode
                ? "bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/20"
                : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
            title={isDarkMode ? "Açık Tema" : "Koyu Tema"}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/*  CHAT AREA                                                   */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto chat-scroll relative z-10 pb-10">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
          {/* ── Welcome ── */}
          <AnimatePresence>
            {!hasMessages && mounted && (
              <motion.div
                key="welcome"
                initial={glideInitial}
                animate={glideAnimate(0.1)}
                exit={glideExit}
                className="flex flex-col items-center justify-center"
                style={{ minHeight: "calc(100vh - 400px)" }}
              >
                <div className="relative mb-6">
                  <div className={`absolute inset-0 blur-2xl opacity-40 rounded-full transition-all duration-700 ${isDarkMode ? "bg-blue-500" : "bg-blue-400"}`} />
                  <div className={`relative w-20 h-20 rounded-[24px] flex items-center justify-center shadow-2xl backdrop-blur-xl transition-all duration-500 ${
                    isDarkMode ? "bg-white/10 border border-white/20 text-white" : "bg-white border border-slate-200 text-blue-500"
                  }`}>
                    <Bot className="w-10 h-10" />
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                  className="text-center"
                >
                  <h2
                    className={`font-extrabold text-5xl md:text-6xl tracking-tight mb-4 transition-all duration-700 ease-in-out ${
                      isDarkMode ? "text-white" : "text-slate-800"
                    }`}
                  >
                    Nasıl <span className={`bg-gradient-to-r from-[#007AFF] via-[#AF52DE] to-[#FF2D55] bg-clip-text text-transparent ${isDarkMode ? "drop-shadow-[0_0_20px_rgba(175,82,222,0.4)]" : ""}`}>yardımcı</span> olabilirim?
                  </h2>
                  <p
                    className={`text-lg font-medium max-w-md mx-auto leading-relaxed transition-colors duration-500 ${
                      isDarkMode ? "text-white/60" : "text-slate-500"
                    }`}
                  >
                    Ege Serbest Bölgesi uzmanınıza hızlıca danışın, akıllı yanıtlar alın.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Messages ── */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                variants={msgAnim}
                initial="hidden"
                animate="visible"
                layout
                className={`flex gap-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-1 shadow-sm transition-all duration-500 ${
                      isDarkMode
                        ? "bg-slate-800/80 border border-white/10 text-blue-300"
                        : "bg-white border border-slate-200 text-blue-500"
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`relative max-w-[83%] px-6 py-4 rounded-3xl transition-colors duration-500 text-[14.5px] leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? isDarkMode
                        ? "bg-blue-600 text-white rounded-br-md shadow-lg border border-blue-500/50"
                        : "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md shadow-md border border-blue-400/50"
                      : isDarkMode
                      ? "bg-slate-800/90 text-slate-100 border border-white/10 rounded-bl-md backdrop-blur-2xl shadow-md"
                      : "bg-white/95 text-slate-800 border border-slate-200/80 rounded-bl-md backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-medium">
                    {msg.role === "assistant" ? (
                      <SmoothText content={msg.content} isGenerating={isLoading && msg.id === messages[messages.length - 1].id} />
                    ) : (
                      msg.content
                    )}
                  </div>
                  <span
                    className={`block text-[10.5px] font-bold mt-2.5 text-right opacity-60 transition-colors duration-300 ${
                      msg.role === "user" ? "text-white" : isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {msg.role === "user" && (
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-1 shadow-sm transition-all duration-500 ${
                      isDarkMode
                        ? "bg-white/10 border border-white/10 text-white/80"
                        : "bg-blue-50 border border-blue-100 text-blue-500"
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <div ref={chatEndRef} className="h-2" />
        </div>
      </main>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/*  BOTTOM DOCK                                                 */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <footer className={`relative z-20 pb-6 px-6 pt-4 transition-all duration-500 ${
        isDarkMode ? "bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent" : "bg-gradient-to-t from-[#f5f5f7] via-[#f5f5f7]/95 to-transparent"
      }`}>
        <div className="max-w-3xl mx-auto relative w-full">
          
          {/* ── Stop Generation Button ── */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -top-16 left-1/2 -translate-x-1/2 z-30"
              >
                <button
                  onClick={stopGeneration}
                  className={`flex items-center gap-2.5 px-6 py-2.5 text-xs font-extrabold tracking-wide rounded-full backdrop-blur-2xl shadow-[0_5px_20px_rgba(0,0,0,0.15)] group transition-all duration-300 ${
                    isDarkMode
                      ? "bg-slate-800/90 text-white border border-white/10 hover:border-white/20 hover:bg-slate-700/90"
                      : "bg-white/95 text-slate-700 border border-slate-200/80 hover:border-slate-300 hover:bg-white hover:shadow-[0_8px_25px_rgba(0,0,0,0.2)]"
                  }`}
                >
                  <div className="flex items-center justify-center p-1 rounded-md bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </div>
                  Üretimi Durdur
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Panoramic Widget Panel ── */}
          <AnimatePresence>
            {!hasMessages && mounted && (
              <motion.div
                key="widget-panel"
                initial={glideInitial}
                animate={glideAnimate(0.35)}
                exit={glideExit}
                className="mb-5"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {widgets.map((w, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => sendMessage(w.full)}
                      className={`widget-card rounded-3xl px-5 py-6 min-h-[120px] flex flex-col items-center justify-center gap-4 cursor-pointer group transition-all duration-500 ease-in-out backdrop-blur-2xl border ${
                        isDarkMode 
                          ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.08]" 
                          : "bg-white/80 border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-300"
                      }`}
                    >
                      <div className={`p-4 rounded-[18px] transition-all duration-500 group-hover:scale-110 shadow-sm ${
                        isDarkMode ? "bg-white/5 border border-white/5" : "bg-white border border-slate-100"
                      }`}>
                        <w.Icon
                          className={`w-6 h-6 transition-all duration-500 ${
                            isDarkMode ? w.glow : w.glow === "icon-glow-red" ? "text-red-500" : "text-blue-500"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[13px] font-bold text-center leading-tight transition-colors duration-300 ${
                          isDarkMode ? "text-white/70 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900"
                        }`}
                      >
                        {w.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input bar ── */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={`relative p-[1.5px] rounded-[32px] backdrop-blur-3xl transition-all duration-500 ease-in-out focus-within:scale-[1.015] bg-gradient-to-r from-[#007AFF] via-[#AF52DE] to-[#FF2D55] ${
              isDarkMode
                ? "shadow-[0_0_20px_rgba(0,0,0,0.5)] focus-within:shadow-[0_0_30px_rgba(175,82,222,0.4)]"
                : "shadow-[0_15px_40px_rgba(0,0,0,0.12)] focus-within:shadow-[0_15px_40px_rgba(0,122,255,0.25)]"
            }`}
          >
            <div
              className={`flex items-end w-full h-full rounded-[calc(32px-1.5px)] transition-all duration-500 ease-in-out ${
                isDarkMode ? "bg-slate-900/98" : "bg-white/95"
              }`}
            >
              <textarea
                ref={inputRef}
                id="message-input"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleResize();
                }}
                onKeyDown={handleKeyDown}
                placeholder="ESBAŞ hakkında bir soru sorun..."
                rows={1}
                className={`flex-1 px-8 py-[18px] text-[15px] font-semibold tracking-wide bg-transparent outline-none focus:outline-none transition-all duration-500 ease-in-out ${
                  isDarkMode ? "text-white placeholder:text-white/30" : "text-slate-800 placeholder:text-slate-400"
                }`}
                style={{
                  minHeight: "60px",
                  maxHeight: "150px",
                  lineHeight: "1.5",
                }}
              />

              <div className="p-2 mb-[2px] mr-[2px]">
                <button
                  id="send-button"
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`flex items-center justify-center w-11 h-11 rounded-[22px] cursor-pointer transition-all duration-300 flex-shrink-0 ${
                    input.trim() && !isLoading
                      ? "bg-gradient-to-br from-[#007AFF] to-[#AF52DE] text-white shadow-lg hover:shadow-xl hover:scale-105"
                      : isDarkMode
                      ? "bg-white/5 text-white/20"
                      : "bg-slate-100 text-slate-300"
                  }`}
                >
                  <Send className={`w-5 h-5 ml-1 ${input.trim() && !isLoading ? "text-white drop-shadow-md" : ""}`} />
                </button>
              </div>
            </div>
          </motion.form>

          {/* ── Footer ── */}
          <div className="flex items-center justify-center gap-2 mt-5 opacity-80">
            <Shield className={`w-4 h-4 ${isDarkMode ? "text-white/40" : "text-slate-400"}`} />
            <p className={`text-[12px] font-bold tracking-wider transition-colors duration-500 ${isDarkMode ? "text-white/40" : "text-slate-400"}`}>
              ESBAŞ AI ASİSTANI — EGE SERBEST BÖLGESİ
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
