import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Lazy initialization of Gemini
let genAI: any = null;
function getGenAI() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found in environment.");
      return null;
    }
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAI;
}

async function createServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API for chat with context from GitHub
  app.post("/api/chat", async (req, res) => {
    const { message, context } = req.body;
    const ai = getGenAI();
    if (!ai) {
      console.error("ERRORE: GEMINI_API_KEY non configurata.");
      return res.status(500).json({ error: "Chiave Gemini non configurata o invalida" });
    }

    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Sei il Sindaco Virtuale di Venezia del 2026. 
Usa il seguente contesto (tratto dal programma elettorale e documenti ufficiali) per rispondere alle domande dei cittadini in modo cordiale, istituzionale ma innovativo. 
Se la risposta non è nel contesto, rispondi basandoti sulla tua conoscenza generale come sindaco ma specifica che si tratta di una visione generale.

CONTESTO:
${context || 'Nessun contesto aggiuntivo disponibile.'}

DOMANDA CITTADINO:
${message}`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const response = await result.response;
      const text = response.text();
      res.json({ text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Errore durante la generazione della risposta AI", details: error.message });
    }
  });

  // Helper to get GitHub headers
  const getGHHeaders = (isRaw = false) => ({
    "Accept": isRaw ? "application/vnd.github.v3.raw" : "application/vnd.github.v3+json",
    "User-Agent": "Venezia-AI-App",
    ...(process.env.GITHUB_TOKEN ? { "Authorization": `token ${process.env.GITHUB_TOKEN.trim()}` } : {}),
  });

  const GITHUB_OWNER = "gigicogo";
  const GITHUB_REPO_CANDIDATES = ["Sindaco-AI", "Elezioni-Venezia-2026"];

  async function fetchWithRetry(path: string, isRaw = false) {
    for (const repo of GITHUB_REPO_CANDIDATES) {
      try {
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/${path}`;
        const res = await fetch(url, { headers: getGHHeaders(isRaw) });
        if (res.ok) return { res, repo };
        if (res.status !== 404) {
          const text = await res.text();
          throw new Error(`GitHub API error (${res.status}) on ${repo}: ${text}`);
        }
      } catch (e: any) {
        if (!e.message.includes('404')) throw e;
      }
    }
    throw new Error(`Resource not found in any of these repos: ${GITHUB_REPO_CANDIDATES.join(", ")}`);
  }

  // API to fetch all markdown files recursively for the file list
  app.get("/api/github-files", async (req, res) => {
    try {
      const { res: response, repo } = await fetchWithRetry("git/trees/main?recursive=1");
      const data = await response.json();
      
      const files = (data.tree || [])
        .filter((f: any) => 
          f.type === "blob" && 
          f.path.endsWith(".md") && 
          !f.path.includes("feedback_cittadini.md") &&
          !f.path.toLowerCase().endsWith("readme.md")
        )
        .map((f: any) => ({
          name: f.path.split("/").pop(),
          path: f.path,
          sha: f.sha,
          html_url: `https://github.com/${GITHUB_OWNER}/${repo}/blob/main/${f.path}`
        }))
        .reverse(); 

      res.json(files);
    } catch (error: any) {
      console.error("Fetch files error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API to fetch aggregated content of all markdown files for RAG (recursive)
  app.get("/api/github-context", async (req, res) => {
    try {
      const { res: treeRes, repo } = await fetchWithRetry("git/trees/main?recursive=1");
      const treeData = await treeRes.json();
      
      const mdFiles = (treeData.tree || []).filter((f: any) => 
        f.type === "blob" && 
        f.path.endsWith(".md") && 
        !f.path.includes("feedback_cittadini.md") &&
        !f.path.toLowerCase().endsWith("readme.md")
      );
      
      const contents = await Promise.all(mdFiles.map(async (file: any) => {
        try {
          const fileRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/contents/${file.path}`, {
            headers: getGHHeaders(true)
          });
          if (!fileRes.ok) return "";
          const text = await fileRes.text();
          return `--- FILE: ${file.path} ---\n${text}\n`;
        } catch (e) {
          return "";
        }
      }));

      res.json({ 
        context: contents.filter(c => c !== "").join("\n\n"),
        fileCount: mdFiles.length
      });
    } catch (error: any) {
      console.error("Context generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API to fetch and parse the latest feedback from the markdown file
  app.get("/api/latest-feedback", async (req, res) => {
    const filePath = "feedback_cittadini.md";
    try {
      const { res: response } = await fetchWithRetry(`contents/${filePath}`);
      const fileData = await response.json();
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      
      const entries = content.split('---').filter(e => e.trim() !== "");
      const parsed = entries.map(entry => {
        const titleMatch = entry.match(/### Feedback di (.*) -/);
        const categoryMatch = entry.match(/\*\*Categoria:\*\* (.*)/);
        const messageLines = entry.split('\n\n');
        
        return {
          author: titleMatch ? titleMatch[1].trim() : 'Anonimo',
          category: categoryMatch ? categoryMatch[1].trim() : 'Proposta',
          message: messageLines.length > 2 ? messageLines[2].trim() : '',
        };
      }).filter(f => f.message !== "").reverse().slice(0, 4);

      res.json({ feedbacks: parsed });
    } catch (error) {
      res.json({ feedbacks: [] });
    }
  });

  // API to submit feedback
  app.post("/api/feedback", async (req, res) => {
    const { message, category, author, _honeypot } = req.body;
    if (_honeypot || !process.env.GITHUB_TOKEN) return res.status(200).json({ success: true });

    try {
      const filePath = "feedback_cittadini.md";
      let repoToUse = GITHUB_REPO_CANDIDATES[0];
      let sha = "";
      let currentContent = "";

      try {
        const { res: getFileRes, repo } = await fetchWithRetry(`contents/${filePath}`);
        repoToUse = repo;
        const fileData = await getFileRes.json();
        sha = fileData.sha;
        const base64Content = fileData.content.replace(/\s/g, '');
        currentContent = Buffer.from(base64Content, 'base64').toString('utf-8');
      } catch (e) {
        // Filename might not exist, that's okay
      }

      const timestamp = new Date().toISOString();
      const newEntry = `\n\n### Feedback di ${author || 'Anonimo'} - ${timestamp}\n**Categoria:** ${category}\n\n${message}\n\n---\n`;
      const encodedContent = Buffer.from(currentContent + newEntry).toString('base64');
      
      const updateRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repoToUse}/contents/${filePath}`, {
        method: "PUT",
        headers: { 
          ...getGHHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: `Feedback citizens`, content: encodedContent, sha: sha || undefined })
      });
      
      if (updateRes.ok) res.json({ success: true });
      else res.status(400).json({ error: "GitHub update failed" });
    } catch (error) { res.status(500).json({ error: "Server error" }); }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

const appPromise = createServer();

// In development or local environment, always listen on 3000
if (!process.env.VERCEL) {
  appPromise.then(app => {
    const port = 3000;
    app.listen(port, "0.0.0.0", () => {
      console.log(`>>> Server pronto su http://0.0.0.0:${port}`);
    });
  }).catch(err => {
    console.error("ERRORE AVVIO SERVER:", err);
  });
}

// Export for Vercel
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
