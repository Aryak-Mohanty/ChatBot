document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("pdfFile");
  const clearFilesBtn = document.getElementById("clearFilesBtn");
  const fileListContainer = document.getElementById("file-list");
  const extractBtn = document.getElementById("extractBtn");
  const chatBox = document.getElementById("messages");
  const userInput = document.getElementById("query");
  const sendBtn = document.getElementById("askBtn");
  const themeToggle = document.getElementById("toggle-theme");

  // Settings
  const settingsBtn = document.getElementById("settings-btn");
  const settingsMenu = document.getElementById("settings-menu");
  const apiUrlInput = document.getElementById("api-url");
  let API_URL = ""; // Relative path to own server

  // Stats
  const statPages = document.getElementById("stat-pages");
  const statChars = document.getElementById("stat-chars");
  const statChunks = document.getElementById("stat-chunks");
  const statFile = document.getElementById("stat-file");

  let parentChunks = []; // Store full context chunks { id, text, source }
  let chunkEmbeddings = []; // Store searching chunks { text, embedding, parentId, source }

  // --- Configuration Fix: Use Local Worker if available ---
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // Check connection on load
  (async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        console.log("Connected to Ollama via proxy");
      } else {
        addMessage("bot", "⚠️ Warning: Cannot connect to Ollama via server. Check server logs.");
      }
    } catch (e) {
      addMessage("bot", "⚠️ Error: Server seems offline or unreachable.");
    }
  })();

  // Toggle settings menu
  if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      settingsMenu.style.display = settingsMenu.style.display === "block" ? "none" : "block";
    });
    document.addEventListener("click", (e) => {
      if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
        settingsMenu.style.display = "none";
      }
    });
  }
  apiUrlInput.addEventListener("change", () => {
    API_URL = apiUrlInput.value.replace(/\/$/, "");
  });

  // --- Multi-File Staging Logic ---
  let stagedFiles = [];

  function updateFileUI() {
    const count = stagedFiles.length;
    extractBtn.disabled = count === 0;

    // Update Badge
    const badge = document.getElementById("file-count-badge");
    if (badge) badge.textContent = `${count} Files`;

    // Update Text
    if (count === 0) {
      statFile.textContent = "—";
      fileListContainer.innerHTML = "";
    } else {
      statFile.textContent = `${count} file(s) queued`;
      // Update List
      fileListContainer.innerHTML = stagedFiles.map(f => `<div>📄 ${f.name}</div>`).join("");
    }
  }

  fileInput.addEventListener("change", () => {
    if (!fileInput.files.length) return;

    // Accumulate files (avoid duplicates by name)
    for (const file of fileInput.files) {
      if (!stagedFiles.some(f => f.name === file.name)) {
        if (stagedFiles.length >= 5) {
          alert("⚠️ Limit reached: Max 5 files.");
          break;
        }
        stagedFiles.push(file);
      }
    }

    // Clear input so same file can be selected again
    fileInput.value = "";
    updateFileUI();
  });

  if (clearFilesBtn) {
    clearFilesBtn.addEventListener("click", () => {
      stagedFiles = [];
      updateFileUI();
      fileInput.value = "";
      chunkEmbeddings = []; // Clear knowledge base
      addMessage("bot", "Files and knowledge base cleared.");

      const header = document.getElementById("chat-header");
      if (header) header.textContent = "💬 Ask anything";

      // Reset Stats
      if (statPages) statPages.textContent = "0";
      if (statChars) statChars.textContent = "0";
      if (statChunks) statChunks.textContent = "0";
    });
  }

  // Helpers
  async function embedText(text) {
    try {
      const response = await fetch(`${API_URL}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "nomic-embed-text", input: text })
      });
      if (!response.ok) throw new Error("Failed to fetch embedding");
      const data = await response.json();
      return data.embedding;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  function cosineSim(a, b) {
    if (!a || !b) return 0;
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return dot / (magA * magB);
  }

  function calculateKeywordScore(text, query) {
    const textWords = new Set(text.toLowerCase().split(/\s+/));
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (queryWords.length === 0) return 0;
    let matchCount = 0;
    for (const w of queryWords) {
      if (textWords.has(w)) matchCount++;
    }
    return matchCount / queryWords.length;
  }

  function chunkText(text, size = 200, overlap = 50) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    let out = [];
    const step = size - overlap;
    for (let i = 0; i < words.length; i += (step > 0 ? step : size)) {
      const chunk = words.slice(i, i + size).join(" ");
      if (chunk.trim()) out.push(chunk);
      if (i + size >= words.length) break;
    }
    return out;
  }

  // Hierarchical Chunking
  function createParentChildChunks(text, sourceName) {
    // Parent: Large Context (e.g., 600 words)
    const parents = chunkText(text, 600, 100);
    let childNodes = [];
    let parentNodes = [];

    parents.forEach((pText, pIndex) => {
      // Store Parent
      const pId = `${sourceName}_${pIndex}`;
      parentNodes.push({ id: pId, text: pText, source: sourceName });

      // Create Children from this Parent (e.g., 150 words)
      // We chunk the PARENT text, not the original full text, so children are subsets of this parent.
      const children = chunkText(pText, 150, 30);
      children.forEach(cText => {
        childNodes.push({ text: cText, parentId: pId, source: sourceName });
      });
    });

    return { parents: parentNodes, children: childNodes };
  }

  function addMessage(sender, text) {
    const msg = document.createElement("div");
    msg.className = `msg ${sender}`;
    msg.textContent = (sender === "user" ? "🧑 " : "🤖 ") + text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msg;
  }

  // --- EXTRACTION LOGIC ---
  extractBtn.addEventListener("click", async () => {
    const files = stagedFiles;
    if (!files.length) return alert("Please add files first");

    extractBtn.disabled = true;
    extractBtn.textContent = "Extracting...";

    let totalPages = 0;
    let totalChars = 0;

    // Reset Knowledge Base
    parentChunks = [];
    chunkEmbeddings = []; // Will fill this progressively

    // const files = stagedFiles; // REMOVED duplicate

    // Process files sequentially
    for (let fIndex = 0; fIndex < files.length; fIndex++) {
      const file = files[fIndex];
      addMessage("bot", `📄 Processing file (${fIndex + 1}/${files.length}): ${file.name}...`);

      try {
        const arrayBuffer = await file.arrayBuffer();
        let fileText = "";

        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          if (!window.pdfjsLib) throw new Error("pdf.js library not loaded");
          const typedArray = new Uint8Array(arrayBuffer);
          const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
          totalPages += pdf.numPages;

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent({ includeMarkedContent: true });
            const strings = content.items.map(it => it.str).join("\n");
            fileText += "\n" + strings;
          }
        } else if (
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.name.toLowerCase().endsWith(".docx")
        ) {
          if (!window.mammoth) throw new Error("mammoth.js library not loaded");
          const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
          fileText = result.value;
        } else {
          addMessage("bot", `⚠️ Skipped ${file.name}: Unsupported type.`);
          continue;
        }

        const fileChars = fileText.length;
        totalChars += fileChars;

        if (fileChars === 0) {
          console.warn(`File ${file.name} yielded 0 chars.`);
          continue;
        }

        if (fileChars === 0) {
          console.warn(`File ${file.name} yielded 0 chars.`);
          continue;
        }

        // --- PARENT-CHILD CHUNKING ---
        const { parents, children } = createParentChildChunks(fileText, file.name);
        console.log(`[${file.name}] Generated ${parents.length} Parents and ${children.length} Children.`);

        // Add to global stores
        parentChunks.push(...parents);

        // Generate Embeddings for CHILDREN only (Efficiency)
        addMessage("bot", `🧠 Indexing ${file.name} (${children.length} fragments)...`);

        const batchSize = 5;
        for (let i = 0; i < children.length; i += batchSize) {
          const batch = children.slice(i, i + batchSize);
          await Promise.all(batch.map(async (childNode) => {
            const emb = await embedText(childNode.text);
            if (emb) {
              chunkEmbeddings.push({
                text: childNode.text, // Child Text (for search)
                embedding: emb,
                parentId: childNode.parentId, // Link to Parent
                source: childNode.source
              });
            }
          }));
        }

      } catch (err) {
        console.error(err);
        addMessage("bot", `❌ Error reading ${file.name}: ${err.message}`);
      }
    }

    statPages.textContent = totalPages > 0 ? totalPages : "N/A";
    statChars.textContent = totalChars;
    statChunks.textContent = chunkEmbeddings.length;

    if (chunkEmbeddings.length === 0) {
      addMessage("bot", "⚠️ Failed to index documents.");
    } else {
      addMessage("bot", `✅ Ready! Knowledge base updated with ${parentChunks.length} Context Blocks and ${chunkEmbeddings.length} Search Nodes.`);
      const header = document.getElementById("chat-header");
      if (header) header.textContent = "💬 Ask about the PDF(s)";
    }

    extractBtn.disabled = false;
    extractBtn.textContent = "Extract text";
  });

  // Chat
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  userInput.addEventListener("input", () => {
    sendBtn.disabled = !userInput.value.trim();
  });

  sendBtn.addEventListener("click", async () => {
    const question = userInput.value.trim();
    if (!question) return;
    addMessage("user", question);
    userInput.value = "";
    sendBtn.disabled = true;

    const botMsg = addMessage("bot", "Thinking...");

    try {
      let prompt = "";

      if (chunkEmbeddings.length > 0) {
        const qEmbed = await embedText(question);
        if (!qEmbed) {
          botMsg.textContent = "🤖 ⚠️ Error generating question embedding.";
          return;
        }

        // --- RANKING & DIVERSITY ---
        // 1. Initial Score (Vector + Keyword)
        let candidates = chunkEmbeddings.map(c => {
          const vecScore = cosineSim(qEmbed, c.embedding);
          const kwScore = calculateKeywordScore(c.text, question);
          return {
            ...c,
            score: (vecScore * 0.7) + (kwScore * 0.3)
          };
        });

        // 2. Sort by Score
        candidates.sort((a, b) => b.score - a.score);

        // 3. Source Diversity Selection
        // Goal: Ensure we get top chunks from *each* file if they are relevant
        const topCandidates = [];
        const seenParentIds = new Set();
        const seenSources = new Set();

        // Take Top 3 from EACH source first (to ensure coverage)
        const candidatesBySource = {};
        candidates.forEach(c => {
          if (!candidatesBySource[c.source]) candidatesBySource[c.source] = [];
          candidatesBySource[c.source].push(c);
        });

        Object.keys(candidatesBySource).forEach(src => {
          // Take top 2 from this source
          candidatesBySource[src].slice(0, 2).forEach(c => {
            if (!seenParentIds.has(c.parentId)) {
              topCandidates.push(c);
              seenParentIds.add(c.parentId);
              seenSources.add(c.source);
            }
          });
        });

        // 4. Fill remaining slots with globally best chunks (up to limit)
        for (const c of candidates) {
          if (topCandidates.length >= 8) break; // Hard limit chunks
          if (!seenParentIds.has(c.parentId)) {
            topCandidates.push(c);
            seenParentIds.add(c.parentId);
          }
        }

        // 5. Retrieve PARENT Contexts
        // Map selected Child Chunks -> Parent Texts
        const contextTexts = topCandidates.map(child => {
          const parent = parentChunks.find(p => p.id === child.parentId);
          return parent ? `[Source: ${parent.source}]\n${parent.text}` : child.text;
        });

        const contextText = contextTexts.join("\n\n---\n\n");

        prompt = `You are a helpful document assistant. 
Instructions:
1. Answer the Question based ONLY on the Context provided below.
2. The Context is a collection of excerpts from different files (marked by [Source]).
3. Integrate information from multiple sources if needed to answer fully.
4. If the answer is not in the Context, state that you cannot find the information.

Context:
${contextText}

Question: ${question}
Answer:`;

      } else {
        prompt = `You are a helpful AI assistant. Answer the following question:\n\nQuestion: ${question}\nAnswer:`;
      }

      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama2", // Ensure this matches your specific model tag
          prompt: prompt,
          stream: true
        })
      });

      if (!response.ok) {
        botMsg.textContent = "🤖 ⚠️ API Error: " + response.statusText;
        return;
      }

      let answer = "";
      botMsg.textContent = "🤖 ";

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.response) {
              answer += json.response;
              botMsg.textContent = "🤖 " + answer;
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          } catch (e) {
            console.warn("JSON parse error", e);
          }
        }
      }

      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          if (json.response) {
            answer += json.response;
            botMsg.textContent = "🤖 " + answer;
          }
        } catch (e) { }
      }

    } catch (err) {
      botMsg.textContent = "🤖 ⚠️ Error: " + err.message;
    } finally {
      sendBtn.disabled = false;
    }
  });

  // Theme toggle
  const iconSun = document.getElementById("icon-sun");
  const iconMoon = document.getElementById("icon-moon");

  function updateThemeIcon(isDark) {
    if (isDark) {
      iconSun.style.display = "block";
      iconMoon.style.display = "none";
    } else {
      iconSun.style.display = "none";
      iconMoon.style.display = "block";
    }
  }

  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("light");
    localStorage.setItem("theme", isDark ? "light" : "dark");
    updateThemeIcon(!isDark);
  });

  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light");
    updateThemeIcon(false);
  } else {
    updateThemeIcon(true);
  }

  // Divider Resize Logic
  const divider = document.getElementById("divider");
  const leftPane = document.getElementById("left");
  const container = document.getElementById("container");
  let isResizing = false;

  if (divider) {
    divider.addEventListener("mousedown", (e) => {
      isResizing = true;
      document.body.style.cursor = "col-resize";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const containerRect = container.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;

      if (newWidth > 200 && newWidth < containerRect.width - 300) {
        leftPane.style.width = `${newWidth}px`;
      }
    });

    document.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = "default";
      }
    });
  }
});