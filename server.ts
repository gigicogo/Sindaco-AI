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
      return res.status(500).json({ error: "Chiave Gemini non configurata o invalida" });
    }

    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Sei il Sindaco Virtuale di Venezia del 2026. 
Usa il seguente contesto (tratto dal programma elettorale e documenti ufficiali) per rispondere alle domande dei cittadini in modo cordiale, istituzionale ma innovativo. 
Se la risposta non è nel contesto, rispondi basandoti sulla tua conoscenza generale come sindaco ma specifica che si tratta di una visione generale.

CONTESTO:
${context}

DOMANDA CITTADINO:
${message}`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const response = await result.response;
      const text = response.text();
      res.json({ text });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Errore durante la generazione della risposta AI" });
    }
  });

  // API to fetch all markdown files recursively for the file list
  app.get("/api/github-files", async (req, res) => {
    try {
      const owner = "gigicogo";
      const repo = "Elezioni-Venezia-2026";
      
      // Use the Trees API with recursive=1 to get all files in all subdirectories
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Venezia-AI-App",
          ...(process.env.GITHUB_TOKEN ? { "Authorization": `token ${process.env.GITHUB_TOKEN}` } : {}),
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GitHub API error on /github-files (${response.status}):`, errorText);
        return res.status(response.status).json({ error: `GitHub API error: ${response.status}`, details: errorText });
      }

      const data = await response.json();
      // Filter for markdown files and exclude feedback file
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
          html_url: `https://github.com/${owner}/${repo}/blob/main/${f.path}`
        }))
        // Sort by path or potentially we'd want by date, but GitHub Trees API doesn't give dates easily
        // We'll keep them as they come for now
        .reverse(); 

      res.json(files);
    } catch (error) {
      console.error("Fetch files error:", error);
      res.status(500).json({ error: "Failed to fetch from GitHub" });
    }
  });

  // API to fetch aggregated content of all markdown files for RAG (recursive)
  app.get("/api/github-context", async (req, res) => {
    try {
      const owner = "gigicogo";
      const repo = "Elezioni-Venezia-2026";
      
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Venezia-AI-App",
          ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
        }
      });
      
      if (!treeRes.ok) throw new Error(`Tree fetch failed: ${treeRes.status}`);
      const treeData = await treeRes.json();
      
      const mdFiles = (treeData.tree || []).filter((f: any) => 
        f.type === "blob" && 
        f.path.endsWith(".md") && 
        !f.path.includes("feedback_cittadini.md") &&
        !f.path.toLowerCase().endsWith("readme.md")
      );
      
      const contents = await Promise.all(mdFiles.map(async (file: any) => {
        try {
          // Use GitHub API to fetch content instead of raw URL for better private repo support
          const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
            headers: {
              "Accept": "application/vnd.github.v3.raw",
              "User-Agent": "Venezia-AI-App",
              ...(process.env.GITHUB_TOKEN ? { "Authorization": `token ${process.env.GITHUB_TOKEN}` } : {}),
            }
          });
          if (!fileRes.ok) return "";
          const text = await fileRes.text();
          return `--- FILE: ${file.path} ---\n${text}\n`;
        } catch (e) {
          console.error(`Error fetching file content ${file.path}:`, e);
          return "";
        }
      }));

      res.json({ 
        context: contents.filter(c => c !== "").join("\n\n"),
        fileCount: mdFiles.length
      });
    } catch (error) {
      console.error("Context generation error:", error);
      res.status(500).json({ error: "Failed to build context from GitHub" });
    }
  });

  // API to fetch and parse the latest feedback from the markdown file
  app.get("/api/latest-feedback", async (req, res) => {
    try {
      const owner = "gigicogo";
      const repo = "Elezioni-Venezia-2026";
      const filePath = "feedback_cittadini.md";

      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Venezia-AI-App",
          ...(process.env.GITHUB_TOKEN ? { "Authorization": `token ${process.env.GITHUB_TOKEN}` } : {}),
        }
      });

      if (!response.ok) return res.json({ feedbacks: [] });

      const fileData = await response.json();
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

      // Simple parsing of the markdown entries
      // Entries look like: ### Feedback di [Author] - [Timestamp]\n**Categoria:** [Category]\n\n[Message]
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
      res.status(500).json({ error: "Failed to fetch feedback list" });
    }
  });

  // API to submit feedback
  app.post("/api/feedback", async (req, res) => {
    const { message, category, author, _honeypot } = req.body;
    
    // Check honeypot (if it's filled, it's likely a bot)
    if (_honeypot) {
      return res.status(200).json({ success: true, note: "Filtered as spam" });
    }

    if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: "No token" });
    try {
      const owner = "gigicogo";
      const repo = "Elezioni-Venezia-2026";
      const filePath = "feedback_cittadini.md";
      const getFileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        headers: { 
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          "User-Agent": "Venezia-AI-App"
        }
      });
      let sha = "";
      let currentContent = "";
      if (getFileRes.ok) {
        const fileData = await getFileRes.json();
        sha = fileData.sha;
        // GitHub content can have multiple lines with \n
        const base64Content = fileData.content.replace(/\s/g, '');
        currentContent = Buffer.from(base64Content, 'base64').toString('utf-8');
      }
      const timestamp = new Date().toISOString();
      const newEntry = `\n\n### Feedback di ${author || 'Anonimo'} - ${timestamp}\n**Categoria:** ${category}\n\n${message}\n\n---\n`;
      const updatedContent = currentContent + newEntry;
      const encodedContent = Buffer.from(updatedContent).toString('base64');
      const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: "PUT",
        headers: { 
          Authorization: `token ${process.env.GITHUB_TOKEN}`, 
          "Content-Type": "application/json",
          "User-Agent": "Venezia-AI-App"
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
