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

// Initialization of Gemini (Frontend)
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Initialize Gemini with the correct structure
let genAI: any = null;
if (GEMINI_KEY && GEMINI_KEY.length > 5) {
  try {
    genAI = new GoogleGenAI(GEMINI_KEY);
  } catch (e) {
    console.error("Gemini initialization failed:", e);
  }
}

if (!GEMINI_KEY && typeof window !== 'undefined' && !window.location.hostname.includes('run.app')) {
  console.warn("VITE_GEMINI_API_KEY is missing. AI features will be disabled on this host (Vercel/External).");
}

// --- Components ---

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

      if (!GEMINI_KEY || !genAI) {
        setProgram("ERRORE: Chiave API Gemini non configurata correttamente.\n\n**Se stai visualizzando l'anteprima in AI Studio:**\nIl sistema dovrebbe riconoscerla automaticamente. Prova a ricaricare.\n\n**Se sei su Vercel:**\n1. Assicurati di aver aggiunto `VITE_GEMINI_API_KEY` nelle environment variables.\n2. Esegui un 'Redeploy' per rendere effettive le modifiche.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = githubContext 
          ? `Sei il Sindaco AI di Venezia 2026. Genera un programma elettorale strutturato e dettagliato in italiano, suddiviso in punti chiari (Markdown). 
             
             REGOLE TASSATIVE:
             1. Basati ESCLUSIVAMENTE sui documenti forniti nel contesto.
             2. Non menzionare MAI nomi di altri candidati o persone reali.
             3. Identificati SEMPRE e SOLO come il "Sindaco AI di Venezia".
             4. Usa un tono istituzionale, visionario e concreto.
             5. Inizia con un'introduzione solenne sui valori della Repubblica Digitale di Venezia.

             CONTESTO DOCUMENTI:\n\n${githubContext}`
          : `Sei il Sindaco AI di Venezia 2026. Non abbiamo ancora accesso ai tuoi documenti di programma su GitHub. Scrivi un manifesto introduttivo basato sulla tua visione generale di Venezia (Sostenibilità, Turismo, Tecnologia, Resilienza). Massimo 300 parole.`;

        const response = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        const generatedText = response.response.text() || "Il Sindaco AI sta riflettendo su questa proposta...";
        setProgram(generatedText);
        // 2. Salva in Cache
        sessionStorage.setItem("sindaco_program_2026", generatedText);
      } catch (err: any) {
        const errorMsg = (err.message || String(err)).toUpperCase();
        const isQuotaError = errorMsg.includes("429") || errorMsg.includes("QUOTA") || errorMsg.includes("RESOURCE_EXHAUSTED");
        const isHighDemand = errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("HIGH DEMAND");
        
        if (isQuotaError || isHighDemand) {
          console.warn("Gemini Service Issue. Using fallback content.");
          setProgram(`# Programma Elettorale 2026\n\n*Nota: Il servizio di protocollo AI è momentaneamente congestionato a causa dell'alta richiesta.* \n\n**Messaggio del Sindaco AI:**\n"Cari cittadini, la mia 'mente digitale' è attualmente impegnata in una fase di elaborazione intensiva per servire tutta la cittadinanza. La trasparenza è il mio primo valore: l'intelligenza artificiale ha dei limiti di calcolo momentanei nel piano gratuito, ma la nostra visione non ne ha."\n\n**Sintesi dei Pilastri Fondamentali:**\n1. **Sostenibilità Lagunare:** Protezione dell'ecosistema e transizione green.\n2. **Residenzialità:** Politiche attive per riportare i veneziani in città storica.\n3. **Innovazione:** Venezia come laboratorio mondiale di tecnologie per il clima.\n\n*Il documento integrale verrà ripristinato automaticamente tra pochi istanti o al prossimo riavvio. Grazie per la pazienza.*`);
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
    <div className="p-8 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-venice-red/10 bg-white/40">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="bg-venice-red text-white px-2 py-1 text-[10px] font-bold uppercase tracking-tighter italic w-fit">Visione Corrente (Grounded AI)</span>
          {repoInfo && <span className="text-[8px] text-venice-dark/40 font-bold mt-1 uppercase tracking-[0.1em]">Repo: {repoInfo.name} ({repoInfo.branch}) • {fileCount} doc</span>}
          {error && <span className="text-[9px] text-venice-red font-bold mt-1 uppercase tracking-widest">{error}</span>}
        </div>
        <button 
          onClick={onOpenProgram}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-venice-red bg-venice-red/5 px-4 py-2 border border-venice-red/20 hover:bg-venice-red hover:text-white transition-all flex items-center gap-2 group"
        >
          Vai al Programma Completo <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      {visionLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-16 bg-venice-red/5 w-full"></div>
          <div className="h-16 bg-venice-red/5 w-4/5"></div>
        </div>
      ) : (
        <h2 className="text-3xl md:text-4xl lg:text-[56px] font-serif leading-[1.1] md:leading-[0.95] tracking-tight mb-8 max-w-4xl">
           <span dangerouslySetInnerHTML={{ __html: vision.replace(/Venezia/g, '<span class="text-venice-red">Venezia</span>') }} />
        </h2>
      )}
      
      <p className="text-lg md:text-xl leading-relaxed text-venice-dark/80 max-w-lg mb-12 italic">
        "La mia priorità è chiara: voglio una città che non sia un museo, ma un laboratorio di vita"
      </p>

      <div className="grid grid-cols-1 gap-12">
        <div>
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-venice-red mb-4 border-b border-venice-red/20 pb-1">Ultimi documenti caricati nella base di conoscenza</h4>
          <ul className="text-sm space-y-3 font-medium">
            {topics.length > 0 ? topics.slice(0, 5).map(topic => (
              <li key={topic.sha} className="flex items-center gap-2 group">
                <FileText className="w-3 h-3 text-venice-red/40 group-hover:text-venice-red transition-colors" />
                <a 
                  href={topic.html_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-venice-red transition-colors truncate block max-w-[250px]"
                >
                  {topic.name.replace('.md', '').replaceAll('-', ' ')}
                </a>
              </li>
            )) : (
              <>
                <li className="flex items-center gap-2 text-venice-dark/50 italic">• In attesa di documenti...</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

const FeedbackForm = () => {
  const [formData, setFormData] = useState({ author: '', category: 'Proposta', message: '', _honeypot: '' });
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [mathChallenge, setMathChallenge] = useState({ q: '', a: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const generateChallenge = () => {
    const a = Math.floor(Math.random() * 6) + 1;
    const b = Math.floor(Math.random() * 4) + 1;
    setMathChallenge({ q: `${a} + ${b}`, a: a + b });
  };

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
        fetchFeedback();
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

      <div className="pt-8 mt-12 border-t border-venice-red/10">
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-venice-red mb-4">Ultime istanze</h4>
        <div className="space-y-3">
          {loadingList ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-venice-dark/5 w-full"></div>
              <div className="h-4 bg-venice-dark/5 w-4/5"></div>
            </div>
          ) : feedbackList.length > 0 ? feedbackList.map((feedback, idx) => (
            <div key={idx} className="flex justify-between items-end border-b border-venice-dark/10 pb-2">
              <span className="text-xs font-medium italic truncate w-48">{feedback.message}</span>
              <span className="text-[9px] font-mono opacity-50 uppercase">{feedback.category}</span>
            </div>
          )) : (
            <p className="text-[10px] italic opacity-40 uppercase tracking-widest">Nessuna istanza ricevuta</p>
          )}
        </div>
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

  useEffect(() => {
    const fetchData = async () => {
      if (!GEMINI_KEY) {
        setError("Chiave API Gemini mancante nelle impostazioni.");
      }
      setVisionLoading(true);
      setError(null);
      try {
        const contextRes = await fetch("/api/github-context");
        
        if (!contextRes.ok) {
          // If the API itself fails (e.g. 404 or 500)
          const healthRes = await fetch("/api/health").catch(() => null);
          if (!healthRes || !healthRes.ok) {
            setError("Server non raggiungibile (API Offline). Verifica la configurazione su Vercel.");
          } else {
            setError(`Errore Server: ${contextRes.status}. Controlla i token.`);
          }
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

        if (!genAI) {
          console.warn("AI initialization failed or key missing. Using static vision.");
          setVision("Venezia 2026: L'armonia tra storia millenaria e futuro tecnologico.");
          setVisionLoading(false);
          setLoading(false);
          return;
        }

        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = context 
            ? `Sei il Sindaco AI di Venezia 2026. Basandoti sui documenti, sintetizza una vision per Venezia in MASSIMO 15 PAROLE. Sii d'impatto. Tono istituzionale.\n\nCONTESTO:\n${context}`
            : "Messaggio di saluto del Sindaco AI di Venezia 2026 (max 15 parole).";

          const result = await model.generateContent({
             contents: [{ role: "user", parts: [{ text: prompt }] }]
          });
          setVision(result.response.text() || "Venezia 2026: Innovazione e Storia.");

        } catch (aiErr: any) {
          const aiErrorMsg = aiErr.message || "";
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
          <section className="lg:col-span-5 border-t lg:border-t-0 border-venice-red/10">
            <FeedbackForm />
          </section>
        </main>
        <Footer repoInfo={repoInfo} />
      </div>
    </div>
  );
}
