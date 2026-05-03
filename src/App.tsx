import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  MessageSquare, 
  Lightbulb, 
  FileText, 
  ArrowRight, 
  Send, 
  CheckCircle2, 
  Info,
  Menu,
  X,
  ChevronRight,
  Globe
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini on the frontend as per system guidelines.
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

// --- Components ---

const ChatInterface = ({ githubContext, feedbackList, loadingList }: { githubContext: string, feedbackList: any[], loadingList: boolean }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: "Benvenuto nella Sala di Consultazione Digitale. Sono il Sindaco AI di Venezia. Come posso aiutarti oggi?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const prompt = `Sei il Sindaco AI di Venezia. Rispondi con tono istituzionale, pacato ma visionario.
      Usa la seguente base di conoscenza per rispondere:
      ${githubContext}
      
      Domanda del cittadino: ${userMsg}`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result.text || "Mi scusi, sto elaborando dati complessi. Può riformulare?" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Il protocollo di comunicazione ha subito un'interruzione. Prova tra un istante." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] border border-venice-red/20 bg-white shadow-xl">
      <div className="bg-venice-red text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sindaco AI • Online</span>
        </div>
        <MessageSquare className="w-4 h-4 opacity-50" />
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-venice-cream/30">
        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-4 text-sm ${
              msg.role === 'user' 
                ? 'bg-venice-red text-white rounded-l-xl rounded-tr-xl' 
                : 'bg-white border border-venice-red/10 text-venice-dark rounded-r-xl rounded-tl-xl shadow-sm'
            }`}>
              <div className="markdown-body">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-venice-red/10 p-4 rounded-r-xl rounded-tl-xl shadow-sm italic text-xs text-venice-dark/50">
              Il Sindaco sta elaborando...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-venice-red/10 flex gap-2">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chiedi al Sindaco..."
          className="flex-1 bg-venice-cream/20 border border-venice-red/10 px-4 py-3 text-sm focus:outline-none focus:border-venice-red transition-all"
        />
        <button 
          type="submit"
          className="bg-venice-dark text-white p-3 hover:bg-venice-red transition-all disabled:opacity-50"
          disabled={!input.trim() || isTyping}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

const DEFAULT_MANIFESTO = `# Venezia 2026: Il futuro che onora la storia millenaria della Laguna

Nel 2026, Venezia non sarà solo una città d’arte che resiste al tempo, ma il simbolo globale di una nuova alleanza tra uomo, tecnologia e ambiente. A 1600 anni dalla sua mitica fondazione, la Serenissima si appresta a vivere un anno di svolta, ponendosi come laboratorio a cielo aperto per la sostenibilità mondiale.

### 1. Venezia Capitale Mondiale della Sostenibilità
Il polo di Porto Marghera si trasforma in una "Hydrogen Valley". Con il sistema MOSE ormai pienamente a regime e integrato da algoritmi predittivi, Venezia dimostra al mondo come una città costiera possa difendersi dall'innalzamento dei mari.

### 2. Le Olimpiadi Invernali Milano-Cortina 2026
Venezia diventerà il salotto di rappresentanza per le delegazioni internazionali, unendo il fascino dei canali alla maestosità delle Dolomiti.

### 3. Un Nuovo Modello di Residenzialità: "Venezia è Viva"
Grazie alla fibra ottica e alla nascita di hub tecnologici, Venezia attira una nuova generazione di professionisti internazionali (Smart Working). Il turismo si evolve in uno strumento di tutela, valorizzando l'artigianato locale.

### 4. La Rinascita Culturale e Tecnologica
I musei veneziani useranno Realtà Aumentata per mostrare l'evoluzione storica. L'Arsenale diventa centro di ricerca per le tecnologie marine e la Blue Economy.

### Conclusione
Venezia 2026 non cerca di sfuggire al suo passato, ma lo usa come fondamenta per costruire un modello di civiltà resiliente. **Preservare la bellezza è l'unica via per l'innovazione.**`;

const ProgramPage = ({ onBack, githubContext }: { onBack: () => void, githubContext: string }) => {
  const [program, setProgram] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateProgram = async () => {
      // 1. Controlla Cache
      const cached = sessionStorage.getItem("sindaco_program_2026");
      if (cached) {
        setProgram(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const prompt = githubContext 
          ? `Sei il Sindaco AI di Venezia 2026. Il tuo compito è presentare la tua Visione e il tuo Programma per la città ai veneziani. 
             
             DATI DI BASE (CONTESTO):
             ${githubContext}

             REGOLE TASSATIVE PER LA GENERAZIONE:
             1. Usa uno stile "Manifesto": elegante, istituzionale, ma estremamente moderno (Repubblica Digitale).
             2. Dividi il contenuto in: "La Mia Visione", "Pilastri del Programma" e "Impegno con i Cittadini".
             3. Basati esclusivamente sul contesto fornito. Se il contesto è breve, sii sintetico ma incisivo.
             4. Non inventare dati non presenti, ma interpreta i valori espressi nei documenti.
             5. Formattazione: usa Markdown pulito (H1, H2, grassetti, elenchi).
             6. Firma: "Il Sindaco AI di Venezia".`
          : `Sei il Sindaco AI di Venezia 2026. Scrivi un manifesto introduttivo basato sulla tua visione di Venezia (Sostenibilità, Turismo, Residenzialità, Innovazione). Massimo 300 parole.`;

        if (!GEMINI_KEY) {
          throw new Error("GEMINI_API_KEY non configurata. Se sei su Vercel, aggiungi la variabile d'ambiente.");
        }

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt
        });

        const generatedText = response.text || "Il Sindaco AI sta riflettendo su questa proposta...";
        setProgram(generatedText);
        // 2. Salva in Cache
        sessionStorage.setItem("sindaco_program_2026", generatedText);
      } catch (err: any) {
        const errorMsg = (err.message || String(err)).toUpperCase();
        const isQuotaError = errorMsg.includes("429") || errorMsg.includes("QUOTA") || errorMsg.includes("RESOURCE_EXHAUSTED");
        const isHighDemand = errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("HIGH DEMAND");
        
        if (isQuotaError || isHighDemand) {
          console.warn("Gemini Service Issue. Using fallback content.");
          setProgram(DEFAULT_MANIFESTO);
        } else {
          console.error("AI Program Error Full:", err);
          setProgram(`# Errore di Comunicazione\n\nSi è verificato un problema tecnico nella consultazione dei documenti del programma.\n\n**Dettaglio:** ${err.message || "Errore nella generazione del testo."}\n\n*Per favore, prova a ricaricare la pagina o riapri il programma tra qualche minuto.*`);
        }
      } finally {
        setLoading(false);
      }
    };

    generateProgram();
  }, [githubContext]);

  return (
    <div className="min-h-screen bg-venice-cream p-4 md:p-12 overflow-auto">
      <div className="max-w-4xl mx-auto bg-white border-[8px] md:border-[16px] border-venice-dark p-8 md:p-16 shadow-2xl relative">
        <button 
          onClick={onBack}
          className="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-venice-red hover:bg-venice-red hover:text-white px-3 py-1 transition-all border border-venice-red"
        >
          Chiudi <X className="w-3 h-3" />
        </button>

        <div className="mb-12 border-b-2 border-venice-dark pb-8">
          <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-venice-red mb-2">Repubblica Digitale di Venezia</h2>
          <h1 className="text-4xl md:text-6xl font-serif italic text-venice-dark leading-none">Programma Politico <br/> Sindaco AI di Venezia</h1>
        </div>

        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-4 bg-venice-dark/5 w-full"></div>
            <div className="h-4 bg-venice-dark/5 w-5/6"></div>
            <div className="h-4 bg-venice-dark/5 w-4/6"></div>
            <div className="h-32 bg-venice-dark/5 w-full mt-12"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="markdown-body text-venice-dark selection:bg-venice-red selection:text-white">
              <ReactMarkdown>{program}</ReactMarkdown>
            </div>
            
            {program.includes("Errore") && (
              <button 
                onClick={() => window.location.reload()}
                className="mt-8 px-6 py-3 bg-venice-red text-white text-[10px] font-bold uppercase tracking-widest hover:bg-venice-dark transition-all"
              >
                Ricarica e Riprova
              </button>
            )}
          </div>
        )}
        
        <div className="mt-20 pt-8 border-t border-venice-dark/10 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest">Documento Prodotto dal Sindaco AI di Venezia</span>
              <span className="text-[8px] font-medium opacity-60">Basato su Dataset GitHub Elettorale • Venezia 2026</span>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest border border-venice-dark px-2 py-1 italic">Copia Ufficiale per la Cittadinanza</span>
        </div>
      </div>
    </div>
  );
};

const Header = ({ onOpenProgram }: { onOpenProgram: () => void }) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 md:px-10 py-8 border-b border-venice-red/20 bg-white">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-venice-red">Repubblica Digitale di Venezia</h2>
          <h1 className="text-2xl font-serif italic text-venice-dark">Sindaco AI di Venezia</h1>
        </div>
      </div>
      
      <div className="flex gap-4 items-center mt-6 md:mt-0">
        <button 
          onClick={onOpenProgram}
          className="bg-venice-red text-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-venice-dark transition-all shadow-lg hover:shadow-venice-red/20 active:scale-95 flex items-center gap-3 group"
        >
          <FileText className="w-4 h-4" />
          Il Mio Programma
          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </button>
        
        <div className="hidden lg:flex items-center gap-2 border-l border-venice-red/10 pl-6 ml-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[9px] uppercase font-bold tracking-widest opacity-60">Live Repository</span>
          </div>
        </div>
      </div>
    </header>
  );
};

const VisionSection = ({ 
  onOpenProgram, 
  loading, 
  vision, 
  visionLoading, 
  topics, 
  fileCount, 
  error, 
  repoInfo 
}: { 
  onOpenProgram: () => void, 
  loading: boolean,
  vision: string,
  visionLoading: boolean,
  topics: any[],
  fileCount: number,
  error: string | null,
  repoInfo: any
}) => {
  return (
    <div className="p-8 md:p-16 flex flex-col justify-center border-b md:border-b-0 md:border-r border-venice-red/10 bg-white/40">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-12 flex justify-between items-start"
      >
        <div className="flex flex-col">
          <span className="bg-venice-red text-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest italic w-fit mb-2 shadow-sm">
            Orientamento Politico (Grounded)
          </span>
          {repoInfo && (
            <div className="flex items-center gap-2 group cursor-help" title={`Branch: ${repoInfo.branch}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-venice-dark/60 font-bold uppercase tracking-widest">
                {repoInfo.name} • {fileCount} Documenti Attivi
              </span>
            </div>
          )}
          {error && <span className="text-[10px] text-venice-red font-bold mt-2 uppercase tracking-widest animate-bounce">{error}</span>}
        </div>
      </motion.div>
      
      <div className="relative mb-16">
        <div className="absolute -left-8 top-0 bottom-0 w-1 bg-venice-red/20 rounded-full" />
        {visionLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-12 bg-venice-red/5 w-full rounded" />
            <div className="h-12 bg-venice-red/5 w-3/4 rounded" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className={`font-serif tracking-tight text-venice-dark mb-6 ${
              vision.length > 100 ? 'text-3xl md:text-4xl leading-tight' : 'text-4xl md:text-5xl lg:text-6xl leading-[1.05]'
            }`}>
               <span dangerouslySetInnerHTML={{ __html: vision.replace(/Venezia/g, '<span class="text-venice-red">Venezia</span>') }} />
            </h2>
          </motion.div>
        )}
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl leading-relaxed text-venice-dark/70 max-w-xl italic font-serif"
        >
          "In ascolto dei dati, al servizio della storia."
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/60 p-6 border-l-4 border-venice-red shadow-sm"
        >
          <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-venice-red mb-6 border-b border-venice-red/10 pb-2 flex items-center gap-2">
            <Building2 className="w-3 h-3" /> Memoria Storica Recente
          </h4>
          <ul className="space-y-4">
            {topics.length > 0 ? topics.slice(0, 4).map((topic, i) => (
              <motion.li 
                key={topic.sha} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + (i * 0.1) }}
                className="flex items-start gap-3 group"
              >
                <div className="mt-1.5 w-1 h-1 rounded-full bg-venice-red/40 group-hover:scale-150 transition-transform" />
                <div>
                  <a 
                    href={topic.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm font-bold hover:text-venice-red transition-all block leading-tight text-venice-dark/80"
                  >
                    {topic.name.replace('.md', '').replaceAll('-', ' ')}
                  </a>
                  <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Documento Verificato</span>
                </div>
              </motion.li>
            )) : (
              <li className="text-[10px] italic opacity-40 uppercase tracking-widest">Sincronizzazione documenti in corso...</li>
            )}
          </ul>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col justify-end"
        >
          <p className="text-[10px] leading-relaxed uppercase tracking-widest font-bold opacity-40 mb-6">
            L'IA analizza i documenti caricati su GitHub per generare politiche che bilancino tradizione e futuro.
          </p>
          <button 
            onClick={onOpenProgram}
            className="w-full bg-venice-dark text-white px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-venice-red transition-all flex items-center justify-between group shadow-xl active:scale-95"
          >
            <span>Leggi il Manifesto Integrale</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

const FeedbackForm = ({ onSubmitted }: { onSubmitted: () => void }) => {
  const [formData, setFormData] = useState({ author: '', category: 'Proposta', message: '', _honeypot: '' });
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [mathChallenge, setMathChallenge] = useState({ q: '', a: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const generateChallenge = () => {
    const a = Math.floor(Math.random() * 6) + 1;
    const b = Math.floor(Math.random() * 4) + 1;
    setMathChallenge({ q: `${a} + ${b}`, a: a + b });
  };

  useEffect(() => {
    generateChallenge();
  }, []);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.message.length < 5) return;
    setStep('review');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(userAnswer) !== mathChallenge.a) {
      alert("Verifica fallita. Riprova.");
      generateChallenge();
      setUserAnswer('');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setStatus('success');
        setFormData({ author: '', category: 'Proposta', message: '', _honeypot: '' });
        setStep('edit');
        setUserAnswer('');
        generateChallenge();
        onSubmitted();
        setTimeout(() => setStatus('idle'), 3000);
      } else { setStatus('error'); }
    } catch (err) { setStatus('error'); }
  };

  if (status === 'success') {
    return (
      <div className="bg-venice-red/5 p-8 md:p-12 flex flex-col items-center justify-center text-center h-[500px]">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-2xl font-serif mb-2 text-venice-dark">Ricevuto</h3>
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-venice-red opacity-60 mb-8 px-4">
          La tua istanza è stata acquisita e sarà elaborata dalla mia base di conoscenza.
        </p>
        <button 
          onClick={() => setStatus('idle')}
          className="border border-venice-dark text-venice-dark px-8 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-venice-dark hover:text-white transition-all"
        >
          Invia Nuova Proposta
        </button>
      </div>
    );
  }

  return (
    <div className="bg-venice-red/5 p-8 md:p-12 flex flex-col justify-between min-h-[500px]">
      <div>
        <h3 className="text-2xl font-serif mb-2">La tua voce</h3>
        <p className="text-xs text-venice-dark/70 mb-8 font-medium uppercase tracking-widest">
          {step === 'edit' ? "Scrivi la tua proposta per Venezia" : "Verifica finale prima dell'invio"}
        </p>
        
        {step === 'edit' ? (
          <form onSubmit={handleNext} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                onClick={() => setFormData({...formData, category: 'Proposta'})}
                className={`py-2 text-[10px] font-bold uppercase tracking-widest border border-venice-red transition-all ${formData.category === 'Proposta' ? 'bg-venice-red text-white' : 'text-venice-red'}`}
              >
                Proposta
              </button>
              <button 
                type="button" 
                onClick={() => setFormData({...formData, category: 'Segnalazione'})}
                className={`py-2 text-[10px] font-bold uppercase tracking-widest border border-venice-red transition-all ${formData.category === 'Segnalazione' ? 'bg-venice-red text-white' : 'text-venice-red'}`}
              >
                Segnalazione
              </button>
            </div>
            
            <input 
              required
              type="text" 
              placeholder="Il tuo nome (es. Marco)" 
              className="w-full bg-white border border-venice-red/20 p-3 text-sm focus:outline-none focus:border-venice-red placeholder:italic selection:bg-venice-red selection:text-white"
              value={formData.author}
              onChange={(e) => setFormData({...formData, author: e.target.value})}
            />

            {/* Honeypot field - HIDDEN FROM HUMANS */}
            <input 
              type="text" 
              name="_honeypot" 
              style={{ display: 'none' }} 
              value={formData._honeypot} 
              onChange={(e) => setFormData({...formData, _honeypot: e.target.value})} 
              tabIndex={-1} 
              autoComplete="off" 
            />

            <textarea 
              required
              rows={4}
              className="w-full bg-white border border-venice-red/20 p-4 text-sm focus:outline-none focus:border-venice-red placeholder:italic selection:bg-venice-red selection:text-white" 
              placeholder="Cosa vorresti per la Venezia del futuro?"
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
            ></textarea>
            
            <button 
              type="submit" 
              className="w-full bg-venice-dark text-white py-4 font-bold uppercase tracking-widest text-[10px] hover:bg-venice-red transition-all flex items-center justify-center gap-2"
            >
              Revisiona Istanza <ArrowRight className="w-3 h-3" />
            </button>
            
            {status === 'error' && <p className="text-[10px] text-venice-red font-bold uppercase tracking-widest text-center mt-2">Errore di rete</p>}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-4 border border-venice-red/10 italic text-sm text-venice-dark/80">
              "{formData.message}"
              <div className="mt-2 text-[9px] uppercase font-bold tracking-widest opacity-40">
                — {formData.author || 'Anonimo'} • {formData.category}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-venice-red">Verifica Umana: Quanto fa {mathChallenge.q}?</label>
              <input 
                type="number" 
                required
                placeholder="Risultato..."
                className="w-full bg-white border border-venice-red/20 p-3 text-center font-bold focus:outline-none focus:border-venice-red"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setStep('edit')}
                className="flex-1 bg-white border border-venice-dark/20 py-3 text-[9px] font-bold uppercase tracking-widest hover:bg-venice-dark hover:text-white transition-all"
              >
                Modifica
              </button>
              <button 
                type="submit"
                disabled={status === 'loading'}
                className="flex-[2] bg-venice-dark text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-venice-red transition-all disabled:opacity-50"
              >
                {status === 'loading' ? 'Sincronizzazione...' : 'Conferma e Invia'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const Footer = ({ repoInfo }: { repoInfo: any }) => {
  return (
    <footer className="px-6 md:px-10 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] uppercase tracking-widest font-bold opacity-60">
      <div className="flex items-center gap-4">
        <span>Progetto sperimentale @gigicogo / Venezia 2026</span>
        {repoInfo ? (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>Connesso: {repoInfo.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-venice-red/5 text-venice-red px-3 py-1 rounded-full border border-venice-red/10">
            <span className="w-1.5 h-1.5 rounded-full bg-venice-red animate-pulse"></span>
            <span>In attesa di connessione...</span>
          </div>
        )}
      </div>
      <div className="flex gap-4">
        <span>Open Source Government Interface</span>
        <span className="text-venice-red">v1.0.4</span>
      </div>
    </footer>
  );
};

export default function App() {
  const [view, setView] = useState<'home' | 'program'>('home');
  
  // Hash-based routing to persist view on reload
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'programma') setView('program');
      else setView('home');
    };
    
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const changeView = (newView: 'home' | 'program') => {
    window.location.hash = newView === 'program' ? 'programma' : '';
    setView(newView);
  };

  const [githubContext, setGithubContext] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [repoInfo, setRepoInfo] = useState<any>(null);

  // Added states from VisionSection
  const [vision, setVision] = useState<string>("");
  const [visionLoading, setVisionLoading] = useState(true);
  const [topics, setTopics] = useState<any[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const fetchFeedback = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/latest-feedback');
      const data = await res.json();
      setFeedbackList(data.feedbacks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
    const fetchData = async () => {
      setVisionLoading(true);
      setError(null);
      try {
        const contextRes = await fetch("/api/github-context");
        
        if (!contextRes.ok) {
          // If the API itself fails
          setError("Server non raggiungibile (API Offline). Verifica la configurazione su Vercel.");
          setVision("Connessione in corso...");
          setVisionLoading(false);
          setLoading(false);
          return;
        }

        const contextData = await contextRes.json();
        
        if (contextData.error) {
          setError(`GitHub Error: ${contextData.error}`);
          setVision("Errore caricamento documenti.");
          setVisionLoading(false);
          setLoading(false);
          return;
        }
        
        const context = contextData.context || "";
        setGithubContext(context);
        setFileCount(contextData.fileCount || 0);
        if (contextData.repo) {
          setRepoInfo({ name: contextData.repo, branch: contextData.branch });
        }
        if (Array.isArray(contextData.files)) {
          setTopics(contextData.files.slice(0, 8));
        }

        try {
          const prompt = context 
            ? `Sei il Sindaco AI di Venezia 2026. Basandoti sui documenti della tua base di conoscenza, estrai una singola frase (massimo 12 parole) che rappresenti il cuore della tua "Visione per Venezia".
               Sii poetico, potente e istituzionale. Non usare il grassetto.
               
               CONTESTO:\n${context}`
            : "Venezia 2026: il futuro che onora la storia millenaria della Laguna.";

          if (!GEMINI_KEY) throw new Error("API Key missing");

          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
          });

          setVision(response.text || "Venezia 2026: Innovazione e Storia.");

        } catch (aiErr: any) {
          const aiErrorMsg = (aiErr.message || "").toUpperCase();
          const isQuota = aiErrorMsg.includes("429") || aiErrorMsg.includes("RESOURCE_EXHAUSTED") || aiErrorMsg.includes("QUOTA");
          
          if (isQuota) {
            console.warn("Gemini Quota Exceeded in Vision. Using fallback vision.");
            setVision("Venezia 2026: L'armonia tra <span class='italic'>storia millenaria</span> e futuro tecnologico.");
            setError("Servizio AI momentaneamente in coda. Consultazione disponibile.");
          } else {
            console.error("Gemini Vision Error:", aiErr);
            setVision("Venezia 2026: Tradizione e Innovazione.");
          }
        }

      } catch (err: any) {
        console.error(err);
        setError(`System Error: ${err.message}`);
      } finally {
        setVisionLoading(false);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (view === 'program') {
    return <ProgramPage onBack={() => changeView('home')} githubContext={githubContext} />;
  }

  return (
    <div className="min-h-screen bg-venice-cream flex items-center justify-center p-0 md:p-8">
      <div className="w-full max-w-7xl bg-venice-cream text-venice-dark flex flex-col overflow-hidden border-[8px] md:border-[16px] border-venice-red shadow-2xl">
        <Header onOpenProgram={() => changeView('program')} />
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-auto">
          <section className="lg:col-span-7 flex flex-col">
            <VisionSection 
              onOpenProgram={() => changeView('program')} 
              loading={loading}
              vision={vision}
              visionLoading={visionLoading}
              topics={topics}
              fileCount={fileCount}
              error={error}
              repoInfo={repoInfo}
            />
          </section>
          <section className="lg:col-span-5 border-t lg:border-t-0 border-venice-red/10 p-4 md:p-8 flex flex-col justify-center bg-white/20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <ChatInterface githubContext={githubContext} feedbackList={feedbackList} loadingList={loadingList} />
              <div className="mt-8 flex items-center justify-between px-4 opacity-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Protocollo TLS Criptato</span>
                </div>
                <button 
                  onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="text-[9px] font-bold uppercase tracking-[0.2em] hover:text-venice-red transition-all cursor-pointer underline underline-offset-4"
                >
                  Lascia un'istanza formale
                </button>
              </div>
            </motion.div>
          </section>
        </main>
        
        {/* Public Feedback & Transparency Section */}
        <section id="istanze" className="border-t border-venice-red/20 bg-white flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-venice-red/10">
          <div className="flex-1 p-8 md:p-16">
            <h3 className="text-3xl font-serif italic mb-2 text-venice-dark">Istanze dei Cittadini</h3>
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-venice-red/60 mb-10">Partecipazione Diretta e Democrazia Liquida</p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              <FeedbackForm onSubmitted={fetchFeedback} />
              <div className="bg-venice-cream/20 p-8 border border-venice-red/10 h-[500px] flex flex-col">
                <div className="flex items-center gap-3 mb-8 border-b border-venice-red/10 pb-4">
                  <Globe className="w-5 h-5 text-venice-red" />
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em]">Live Ledger (Registro Pubblico)</h4>
                </div>
        <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                  {!loadingList && feedbackList.length > 0 && (
                    <div className="mb-8 p-3 bg-venice-red/5 border-l-2 border-venice-red text-[10px] font-bold uppercase tracking-widest text-venice-red animate-pulse">
                      Live Ledger: {feedbackList.length} Istanze Verificate
                    </div>
                  )}
                  {loadingList ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-20 bg-venice-red/5 rounded"></div>
                      <div className="h-20 bg-venice-red/5 rounded"></div>
                    </div>
                  ) : feedbackList.length > 0 ? (
                    feedbackList.map((fb, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-white shadow-sm border-l-4 border-venice-red relative group"
                      >
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-[9px] font-bold uppercase tracking-widest text-venice-red/60">{fb.category}</span>
                           <span className="text-[8px] opacity-40 uppercase font-mono">{idx === 0 ? 'Nuova' : 'Archiviata'}</span>
                         </div>
                         <p className="text-sm font-serif italic text-venice-dark group-hover:text-venice-red transition-colors">"{fb.message}"</p>
                         <p className="mt-3 text-[10px] font-bold opacity-30 uppercase tracking-widest">— {fb.author || 'Cittadino'}</p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                      <MessageSquare className="w-12 h-12 mb-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Nessun dato registrato</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="lg:w-1/3 p-8 md:p-16 bg-venice-red/5">
            <div className="sticky top-8">
              <h3 className="text-xl font-serif italic mb-6">Trasparenza Digital Government</h3>
              <p className="text-sm leading-relaxed text-venice-dark/70 mb-8 font-medium">
                Venezia 2026 non è una semplice campagna elettorale, è un esperimento di democrazia liquida basata su agenti digitali. Ogni tua parola contribuisce a raffinare il programma elettorale attraverso algoritmi di analisi del sentiment e sintesi documentale.
              </p>
              <div className="space-y-6">
                <div className="p-6 bg-white border border-venice-red/10 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-3 text-venice-red">Status Base di Conoscenza</span>
                  <div className="w-full bg-venice-cream h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-venice-red h-full w-[85%] animate-pulse" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold uppercase opacity-50">Sincronizzazione Live</span>
                    <span className="text-[8px] font-bold uppercase text-venice-red">85% Data Depth</span>
                  </div>
                </div>
                
                <div className="p-4 border-l-2 border-venice-red bg-venice-red/5">
                  <p className="text-[10px] font-bold uppercase tracking-tight leading-4 opacity-60">
                    Le istanze vengono anonimizzate prima di essere integrate nel modello linguistico del Sindaco.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <Footer repoInfo={repoInfo} />
      </div>
    </div>
  );
}
