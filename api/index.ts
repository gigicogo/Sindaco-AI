import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const GITHUB_OWNER = "gigicogo";
const GITHUB_REPO = "Elezioni-Venezia-2026";

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
  const branches = ["main", "master", "develop"];
  
  for (const branch of branches) {
    try {
      const path = pathTemplate.replace("{branch}", branch);
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/${path}`;
      const res = await fetch(url, { headers: getGHHeaders(isRaw) });
      
      if (res.ok) return { res, repo: GITHUB_REPO, branch };
      if (res.status === 401) throw new Error("GitHub Token (401 Unauthorized).");
    } catch (e: any) {
      if (e.message.includes("401")) throw e;
      lastError = e;
    }
  }
  throw lastError || new Error(`Documenti non trovati nel repository ${GITHUB_REPO}.`);
}

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    hasToken: !!process.env.GITHUB_TOKEN,
    hasAiKey: !!process.env.GEMINI_API_KEY
  });
});

app.get("/api/github-files", async (req, res) => {
  try {
    const { res: response, repo, branch } = await fetchWithRetry("git/trees/{branch}?recursive=1");
    const data = await response.json();
    const files = (data.tree || [])
      .filter((f: any) => 
        f.type === "blob" && f.path.endsWith(".md") && 
        !f.path.includes("feedback_cittadini.md") &&
        !f.path.toLowerCase().endsWith("readme.md")
      )
      .map((f: any) => {
        const name = f.path.split("/").pop();
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
          sortDate = `${dateMatch2[1]}-${month}-${dateMatch2[3].padStart(2, "0")}`;
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
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/github-context", async (req, res) => {
  try {
    const { res: treeRes, repo, branch } = await fetchWithRetry("git/trees/{branch}?recursive=1");
    const treeData = await treeRes.json();
    const mdFiles = (treeData.tree || [])
      .filter((f: any) => 
        f.type === "blob" && (f.path.endsWith(".md") || f.path.endsWith(".txt")) &&
        !f.path.includes("feedback_cittadini.md") &&
        !f.path.toLowerCase().endsWith("readme.md")
      )
      .map((f: any) => {
        const pathParts = f.path.split("/");
        const name = pathParts.pop();
        const folder = pathParts.join("/");
        
        // Formati supportati: 2026-05-01 o 2026 Aprile 29
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

        return { ...f, name, folder, sortDate };
      })
      .sort((a: any, b: any) => {
        // 1. Priorità assoluta alla data rilevata (Discendente: più nuovo in alto)
        if (b.sortDate !== a.sortDate) {
          return b.sortDate.localeCompare(a.sortDate);
        }
        // 2. Se non hanno data, ordine alfabetico inverso sul nome
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
      } catch (e) { return ""; }
    }));
    res.json({ 
      context: contents.filter(c => c !== "").join("\n\n"),
      fileCount: mdFiles.length,
      repo: repo,
      branch: branch,
      files: mdFiles.map((f: any) => ({
        name: f.name,
        path: f.path,
        html_url: `https://github.com/${GITHUB_OWNER}/${repo}/blob/${branch}/${f.path}`
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/latest-feedback", async (req, res) => {
  try {
    const { res: response } = await fetchWithRetry(`contents/feedback_cittadini.md?ref={branch}`);
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
  } catch (error) { res.json({ feedbacks: [] }); }
});

app.post("/api/feedback", async (req, res) => {
  const { message, category, author, _honeypot } = req.body;
  if (_honeypot || !process.env.GITHUB_TOKEN) return res.status(200).json({ success: true });
  try {
    const { res: getFileRes, repo, branch } = await fetchWithRetry(`contents/feedback_cittadini.md?ref={branch}`);
    let sha = "";
    let currentContent = "";
    if (getFileRes.ok) {
      const fileData = await getFileRes.json();
      sha = fileData.sha;
      currentContent = Buffer.from(fileData.content.replace(/\s/g, ''), 'base64').toString('utf-8');
    }
    const newEntry = `\n\n### Feedback di ${author || 'Anonimo'} - ${new Date().toISOString()}\n**Categoria:** ${category}\n\n${message}\n\n---\n`;
    const encodedContent = Buffer.from(currentContent + newEntry).toString('base64');
    await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/contents/feedback_cittadini.md`, {
      method: "PUT",
      headers: { ...getGHHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Feedback citizens`, content: encodedContent, sha: sha || undefined, branch })
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Server error" }); }
});

export default app;
