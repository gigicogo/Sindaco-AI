import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Initialize Gemini on server
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
let ai: any = null;
if (GEMINI_API_KEY) {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI on server:", e);
  }
}

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const GITHUB_OWNER = "gigicogo";
const GITHUB_REPO = "Elezioni-Venezia-2026";

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    repo: GITHUB_REPO,
    hasToken: !!process.env.GITHUB_TOKEN,
    authPreview: process.env.GITHUB_TOKEN ? `${process.env.GITHUB_TOKEN.substring(0, 4)}...` : "none"
  });
});

// Helper to get GitHub headers
const getGHHeaders = (isRaw = false) => {
  const headers: any = {
    "Accept": isRaw ? "application/vnd.github.v3.raw" : "application/vnd.github.v3+json",
    "User-Agent": "Venezia-AI-App",
  };
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim() !== "") {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN.trim()}`;
  }
  return headers;
};

async function fetchWithRetry(pathTemplate: string, isRaw = false) {
  let lastError: any = null;
  const repo = GITHUB_REPO;
  const branches = ["main", "master", "develop"];
  
  for (const branch of branches) {
    try {
      const path = pathTemplate.replace("{branch}", branch);
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/${path}`;
      const res = await fetch(url, { headers: getGHHeaders(isRaw) });
      
      if (res.ok) return { res, repo, branch };
      if (res.status === 401) throw new Error("GitHub Token (401 Unauthorized).");
    } catch (e: any) {
      if (e.message.includes("401")) throw e;
      lastError = e;
    }
  }
  throw lastError || new Error(`Documenti non trovati nel repository ${repo}.`);
}

// API to fetch all markdown files recursively for the file list
app.get("/api/github-files", async (req, res) => {
  try {
    const { res: response, repo, branch } = await fetchWithRetry("git/trees/{branch}?recursive=1");
    const data = await response.json();
    
    const files = (data.tree || [])
      .filter((f: any) => 
        f.type === "blob" && 
        f.path.endsWith(".md") && 
        !f.path.includes("feedback_cittadini.md") &&
        !f.path.toLowerCase().endsWith("readme.md")
      )
      .map((f: any) => {
        const name = f.path.split("/").pop() || "";
        const dateMatch1 = name.match(/(\d{4}-\d{2}-\d{2})/);
        const dateMatch2 = name.match(/(\d{4})\s+(\w+)\s+(\d{2})/);
        
        let sortDate = "0000-00-00";
        if (dateMatch1) {
          sortDate = dateMatch1[1];
        } else if (dateMatch2) {
          const months: any = { 
            "gennaio": "01", "febbraio": "02", "marzo": "03", "aprile": "04", 
            "maggio": "05", "giugno": "06", "luglio": "07", "agosto": "08", 
            "settembre": "09", "ottobre": "10", "novembre": "11", "dicembre": "12" 
          };
          const month = months[dateMatch2[2].toLowerCase()] || "00";
          sortDate = `${dateMatch2[1]}-${month}-${dateMatch2[3].padStart(2, '0')}`;
        }

        return {
          name,
          path: f.path,
          sha: f.sha,
          sortDate,
          html_url: `https://github.com/${GITHUB_OWNER}/${repo}/blob/${branch}/${f.path}`
        };
      })
      .sort((a: any, b: any) => {
        if (b.sortDate !== a.sortDate) return b.sortDate.localeCompare(a.sortDate);
        return b.name.localeCompare(a.name);
      }); 

    res.json(files);
  } catch (error: any) {
    console.error("Fetch files error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API to fetch aggregated content for RAG
app.get("/api/github-context", async (req, res) => {
  try {
    const { res: treeRes, repo, branch } = await fetchWithRetry("git/trees/{branch}?recursive=1");
    const treeData = await treeRes.json();
    
    const mdFiles = (treeData.tree || [])
      .filter((f: any) => 
        f.type === "blob" && 
        (f.path.endsWith(".md") || f.path.endsWith(".txt")) &&
        !f.path.includes("feedback_cittadini.md") &&
        !f.path.includes("node_modules") &&
        !f.path.toLowerCase().endsWith("readme.md")
      )
      .map((f: any) => {
        const pathParts = f.path.split("/");
        const name = pathParts.pop() || "";
        
        const dateMatch1 = name.match(/(\d{4}-\d{2}-\d{2})/);
        const dateMatch2 = name.match(/(\d{4})\s+(\w+)\s+(\d{2})/);
        
        let sortDate = "0000-00-00";
        if (dateMatch1) {
          sortDate = dateMatch1[1];
        } else if (dateMatch2) {
          const months: any = { 
            "gennaio": "01", "febbraio": "02", "marzo": "03", "aprile": "04", 
            "maggio": "05", "giugno": "06", "luglio": "07", "agosto": "08", 
            "settembre": "09", "ottobre": "10", "novembre": "11", "dicembre": "12" 
          };
          const month = months[dateMatch2[2].toLowerCase()] || "00";
          sortDate = `${dateMatch2[1]}-${month}-${dateMatch2[3].padStart(2, '0')}`;
        }

        return { ...f, name, sortDate };
      })
      .sort((a: any, b: any) => {
        if (b.sortDate !== a.sortDate) return b.sortDate.localeCompare(a.sortDate);
        return b.name.localeCompare(a.name);
      });
    
    const contents = await Promise.all(mdFiles.map(async (file: any) => {
      try {
        const fileRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/contents/${file.path}?ref=${branch}`, {
          headers: getGHHeaders(true)
        });
        if (!fileRes.ok) return "";
        const text = await fileRes.text();
        return `--- FILE: ${file.path} ---\n${text}\n`;
      } catch (e) {
        return "";
      }
    }));

    const filesList = mdFiles.map((f: any) => ({
      name: f.name,
      path: f.path,
      sha: f.sha,
      html_url: `https://github.com/${GITHUB_OWNER}/${repo}/blob/${branch}/${f.path}`
    }));

    res.json({ 
      context: contents.filter(c => c !== "").join("\n\n"),
      fileCount: mdFiles.length,
      repo: repo,
      branch: branch,
      files: filesList 
    });
  } catch (error: any) {
    console.error("Context generation error:", error);
    res.json({ context: "", fileCount: 0, error: error.message });
  }
});

// API to fetch and parse the latest feedback from the markdown file
app.get("/api/latest-feedback", async (req, res) => {
  const filePath = "feedback_cittadini.md";
  try {
    const { res: response } = await fetchWithRetry(`contents/${filePath}?ref={branch}`);
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
  if (_honeypot || !process.env.GITHUB_TOKEN) return res.status(200).json({ success: true, fake: true });

  try {
    const filePath = "feedback_cittadini.md";
    const { res: getFileRes, repo: repoToUse, branch: branchToUse } = await fetchWithRetry(`contents/${filePath}?ref={branch}`);
    
    let sha = "";
    let currentContent = "";

    if (getFileRes.ok) {
      const fileData = await getFileRes.json();
      sha = fileData.sha;
      const base64Content = fileData.content.replace(/\s/g, '');
      currentContent = Buffer.from(base64Content, 'base64').toString('utf-8');
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
      body: JSON.stringify({ 
        message: `Feedback citizens`, 
        content: encodedContent, 
        sha: sha || undefined,
        branch: branchToUse
      })
    });
    
    if (updateRes.ok) res.json({ success: true });
    else res.status(400).json({ error: "GitHub update failed", status: updateRes.status });
  } catch (error) { 
    res.status(500).json({ error: "Server error" }); 
  }
});

// AI Generation Endpoint
app.post("/api/ai-generate", async (req, res) => {
  const { prompt } = req.body;

  if (!ai) {
    return res.status(500).json({ error: "AI Service not initialized on server. Check GEMINI_API_KEY." });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Error on server:", error);
    res.status(error.status || 500).json({ error: error.message || "AI Generation failed" });
  }
});

// Vite middleware logic
async function setupVite() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (require('fs').existsSync(distPath)) {
      app.use(express.static(distPath));
    }
  }
}

setupVite();

// In development or local environment, always listen on 3000
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server pronto su http://0.0.0.0:${PORT}`);
  });
}

// Export for Vercel
export default app;
