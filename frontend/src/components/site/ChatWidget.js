import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Bot } from "lucide-react";
import { API } from "@/lib/api";

const PRESETS = [
  "Was kostet eine Tiefenreinigung?",
  "Wie teuer ist der Winterdienst?",
  "Reinigt ihr auch PV-Anlagen?",
  "Was kosten Zusatzleistungen?",
];

const WELCOME = { role: "assistant", content: "Grüß Gott! Ich bin Ihr digitaler Assistent. Fragen Sie mich gerne zu Preisen und Leistungen." };

const getSession = () => {
  let s = localStorage.getItem("cs_chat_session");
  if (!s) {
    s = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("cs_chat_session", s);
  }
  return s;
};

const Bubble = ({ m, i }) => (
  <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`chatbot-message-${i}`}>
    <div className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
      m.role === "user" ? "bg-[#0F5132] text-white rounded-2xl rounded-br-md" : "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-md"}`}>
      {m.content ? m.content.split(/\*\*(.+?)\*\*/g).map((t, k) => (k % 2 ? <strong key={k}>{t}</strong> : t)) : <span className="inline-flex gap-1"><span className="animate-bounce">•</span><span className="animate-bounce [animation-delay:.15s]">•</span><span className="animate-bounce [animation-delay:.3s]">•</span></span>}
    </div>
  </div>
);

export const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const appendToLast = (text) =>
    setMsgs((p) => [...p.slice(0, -1), { ...p[p.length - 1], content: p[p.length - 1].content + text }]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    setMsgs((p) => [...p, { role: "user", content: q }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: getSession(), message: q }),
      });
      if (!res.ok) throw new Error("bad response");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop();
        for (const l of lines) {
          const d = l.replace(/^data: /, "");
          if (d === "[DONE]") continue;
          const j = JSON.parse(d);
          if (j.delta) appendToLast(j.delta);
          if (j.error) appendToLast(j.error);
        }
      }
    } catch {
      appendToLast("Entschuldigung, es gab ein Verbindungsproblem. Bitte später erneut versuchen.");
    }
    setBusy(false);
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} data-testid="chatbot-toggle-button" aria-label="Chat öffnen"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-xl shadow-sky-900/20 flex items-center justify-center hover:scale-105 transition-[transform,background-color] duration-200">
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        {!open && <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#4ADE80] border-2 border-white" />}
      </button>
      {open && (
        <div data-testid="chatbot-window" className="rise fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] h-[540px] max-h-[75vh] bg-[#F8FAFC] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="bg-[#0F5132] text-white px-5 py-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center"><Bot className="h-5 w-5" /></span>
            <div>
              <p className="font-display font-semibold leading-tight">Preis-Assistent</p>
              <p className="text-xs text-emerald-100">Antwortet sofort zu Kosten & Leistungen</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chatbot-messages">
            {msgs.map((m, i) => <Bubble key={i} m={m} i={i} />)}
            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {PRESETS.map((p, i) => (
                  <button key={p} onClick={() => send(p)} data-testid={`chatbot-preset-${i}`}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-[#0369A1] hover:bg-sky-100 transition-colors">{p}</button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ihre Frage..." data-testid="chatbot-input"
              className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0284C7]/40" />
            <button type="submit" disabled={busy || !input.trim()} data-testid="chatbot-send-button" aria-label="Senden"
              className="h-10 w-10 rounded-full bg-[#0F5132] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#0C4128] transition-colors">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
