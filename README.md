Un esperimento bizzarro in occasione delle elezioni amministrative a Venezia

App collegata: https://sindaco-ai.vercel.app

Articolo di approfondimento: https://medium.com/webeconoscenza/sindaco-ai-c629aa8fc3fd


<img width="1609" height="978" alt="1*OhjtE8jpeI2LTiO6U7ikOA" src="https://github.com/user-attachments/assets/ede52037-16ff-434a-a997-0184ad54aa89" />

## 📄 Licenza

Da definire: si suggerisce una licenza aperta (es. MIT o CC BY 4.0) per favorire il riuso da parte di altri. Sostituisci questo paragrafo con il testo della licenza scelta e il file `LICENSE` del repo.

## 👤 Autore e contesto

**Gianluigi Cogo** — consulente e docente sui temi dell'IA generativa nella Pubblica Amministrazione.

- 📮 Newsletter: [gigicogo.substack.com](https://gigicogo.substack.com)
- 📝 Blog: [medium.com/webeconoscenza](https://medium.com/webeconoscenza)
- ▶️ YouTube: [youtube.com/@gigicogo](https://www.youtube.com/@gigicogo)
- 💼 LinkedIn: [linkedin.com/in/gigicogo](https://it.linkedin.com/in/gigicogo)



----

# 🏛️ Sindaco-AI

**Sindaco-AI** è un assistente conversazionale dedicato alle elezioni amministrative di Venezia 2026. L’app aiuta cittadini e curiosi a esplorare programmi, proposte e temi elettorali attraverso un’interfaccia semplice e basata su AI generativa.

🔗 **App online:** [sindaco-ai.vercel.app](https://sindaco-ai.vercel.app)

![Sindaco-AI](https://socialify.git.ci/gigicogo/Sindaco-AI/image?description=1&font=Inter&forks=1&issues=1&language=1&name=1&owner=1&pulls=1&stargazers=1&theme=Light)

## ✨ Cosa fa

Sindaco-AI permette di porre domande in linguaggio naturale su candidati, programmi elettorali, priorità della città e temi legati a Venezia 2026.

L’obiettivo non è sostituire le fonti ufficiali, ma offrire un modo più accessibile per navigare informazioni complesse: l’utente può chiedere, esplorare e confrontare contenuti senza dover leggere manualmente decine di documenti.

### Esempi di domande

- “Quali sono le priorità del programma di questo candidato?”
- “Cosa propongono i candidati per la mobilità a Venezia?”
- “Riassumi le principali proposte sulla housing e sull’accesso agli alloggi.”
- “Quali temi emergono maggiormente nei programmi elettorali?”

## 🧠 Come funziona

L’applicazione è composta da:

- **Frontend** in Vite + TypeScript per l’interfaccia di chat e la gestione delle domande.
- **Backend/API** per inoltrare le richieste al modello AI in modo sicuro.
- **Integrazione Gemini** tramite `GEMINI_API_KEY`, configurata come variabile d’ambiente.
- **Deployment su Vercel** per la pubblicazione dell’app.

Il flusso è semplice:

```text
Utente scrive una domanda
        ↓
Interfaccia web invia la richiesta
        ↓
API elabora la richiesta e interroga il modello
        ↓
Il modello genera una risposta
        ↓
L’interfaccia mostra il risultato
```

## 🚀 Avvio locale

### Prerequisiti

- [Node.js](https://nodejs.org/) installato sul computer
- Una chiave API Google Gemini

### Installazione

Clona il repository:

```bash
git clone [https://github.com/gigicogo/Sindaco-AI.git](https://github.com/gigicogo/Sindaco-AI.git)
cd Sindaco-AI
```

Installa le dipendenze:

```bash
npm install
```

Crea un file `.env.local` nella root del progetto:

```bash
touch .env.local
```

Aggiungi la tua chiave Gemini:

```env
GEMINI_API_KEY=la_tua_chiave_api
```

Avvia l’app in modalità sviluppo:

```bash
npm run dev
```

Apri nel browser l’indirizzo indicato dal terminale, in genere:

```text
http://localhost:5173
```

## 🔐 Sicurezza delle API key

La chiave `GEMINI_API_KEY` **non deve mai essere inserita direttamente nel codice** né caricata su GitHub.

- Usa `.env.local` per lo sviluppo locale.
- Usa le variabili d’ambiente di Vercel per la versione online.
- `.env.local` è già escluso dal versionamento tramite `.gitignore`.
- Usa `.env.example` come modello dei valori da configurare.

## ☁️ Deploy su Vercel

Il progetto è configurato per il deployment su Vercel tramite `vercel.json`.

Per pubblicare una tua copia:

1. Fai un fork del repository.
2. Collega il repository a [Vercel](https://vercel.com).
3. Nelle impostazioni del progetto, aggiungi la variabile d’ambiente:

```env
GEMINI_API_KEY=la_tua_chiave_api
```

4. Avvia il deploy.

## 🗂️ Struttura del progetto

```text
Sindaco-AI/
├── api/                  # Funzioni API / logica server-side
├── src/                  # Codice dell’interfaccia e componenti
├── .env.example          # Esempio delle variabili d’ambiente
├── index.html            # Pagina principale dell’app
├── package.json          # Dipendenze e script npm
├── server.ts             # Configurazione server
├── vercel.json           # Configurazione deployment Vercel
├── vite.config.ts        # Configurazione Vite
└── README.md             # Documentazione del progetto
```

## 🛠️ Stack tecnologico

| Area | Tecnologia |
|---|---|
| Frontend | Vite, TypeScript, HTML/CSS |
| AI | Google Gemini |
| Backend | API serverless |
| Hosting | Vercel |
| Versionamento | Git e GitHub |

## 🧪 Possibili evoluzioni

- Aggiunta di una sezione per confrontare i programmi dei candidati.
- Citazioni dirette alle fonti e ai documenti consultati.
- Filtri per tema: mobilità, turismo, housing, ambiente, budget, sicurezza.
- Cronologia delle conversazioni.
- Supporto multilingua.
- Modalità “fact-check” con link alle fonti originali.
- Esportazione delle risposte in PDF o Markdown.

## 🤝 Contribuire

Contributi, segnalazioni e idee sono benvenuti.

1. Fai un fork del progetto.
2. Crea un branch:

```bash
git checkout -b feature/nuova-funzionalita
```

3. Commit delle modifiche:

```bash
git commit -m "Aggiunge nuova funzionalità"
```

4. Push del branch:

```bash
git push origin feature/nuova-funzionalita
```

5. Apri una Pull Request.

## ⚠️ Note e responsabilità

Sindaco-AI è un progetto sperimentale di divulgazione e esplorazione informativa.

Le risposte generate dall’AI possono contenere imprecisioni, interpretazioni parziali o informazioni non aggiornate. Per decisioni informate, verifica sempre le informazioni sulle fonti ufficiali: programmi dei candidati, siti istituzionali, comunicati stampa e documenti elettorali originali.

## 📄 Licenza

Questo progetto è distribuito con licenza [MIT](LICENSE).

## 👤 Autore

Creato da **Gianluigi Cogo** ([@gigicogo](https://github.com/gigicogo)).  
Content creator e technical writer interessato ad AI generativa, automazioni, viaggi e strumenti digitali.
