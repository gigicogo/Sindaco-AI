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
      .map((f: any) => ({
        name: f.path.split("/").pop(),
        path: f.path,
        sha: f.sha,
        html_url: `https://github.com/${GITHUB_OWNER}/${repo}/blob/${branch}/${f.path}`
      }))
      .reverse();
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/github-context", async (req, res) => {
  try {
    const { res: treeRes, repo, branch } = await fetchWithRetry("git/trees/{branch}?recursive=1");
    const treeData = await treeRes.json();
    const mdFiles = (treeData.tree || []).filter((f: any) => 
      f.type === "blob" && (f.path.endsWith(".md") || f.path.endsWith(".txt")) &&
      !f.path.includes("feedback_cittadini.md") &&
      !f.path.toLowerCase().endsWith("readme.md")
    );
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
      files: mdFiles.map((f: any) => ({
        name: f.path.split("/").pop(),
        path: f.path,
        html_url: `https://github.com/${GITHUB_OWNER}/${repo}/blob/${branch}/${f.path}`
      })).reverse()
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
