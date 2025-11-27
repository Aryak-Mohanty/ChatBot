document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("pdfFile");
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

  let pdfText = "";
  let chunks = [];
  let chunkEmbeddings = []; // Store embeddings here

  // Check if running via file://
  if (window.location.protocol === "file:") {
    addMessage("bot", "🛑 ERROR: You are opening this file directly!");
    addMessage("bot", "👉 Please open http://localhost:3001 in your browser.");
    return;
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

  // Enable/disable extract
  fileInput.addEventListener("change", () => {
    extractBtn.disabled = !fileInput.files.length;
    if (fileInput.files.length) {
      statFile.textContent = fileInput.files[0].name;
    }
  });

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

  function chunkText(text, size = 200) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    let out = [];
    for (let i = 0; i < words.length; i += size) {
      out.push(words.slice(i, i + size).join(" "));
    }
    return out;
  }

  function addMessage(sender, text) {
    const msg = document.createElement("div");
    msg.className = `msg ${sender}`;
    msg.textContent = (sender === "user" ? "🧑 " : "🤖 ") + text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msg; // return reference to update if needed
  }

  // PDF/DOCX extraction
  extractBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) return alert("Please choose a file first");

    extractBtn.disabled = true;
    extractBtn.textContent = "Extracting...";

    const reader = new FileReader();
    reader.onload = async function (e) {
      const typedArray = new Uint8Array(e.target.result);

      try {
        let fullText = "";
        let fullChars = 0;

        if (file.type === "application/pdf") {
          if (!window.pdfjsLib) throw new Error("pdf.js library not loaded");
          const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
          statPages.textContent = pdf.numPages;

          for (let i = 1; i <= pdf.numPages; i++) {
            try {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent({ includeMarkedContent: true });
              const strings = content.items.map(it => it.str).join("\n");
              fullText += "\n" + strings;
              fullChars += strings.length;
            } catch (pageErr) {
              console.error(`Error on page ${i}:`, pageErr);
              addMessage("bot", `⚠️ Error reading page ${i}: ${pageErr.message}`);
            }
          }
        } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          if (!window.mammoth) throw new Error("mammoth.js library not loaded");
          const result = await window.mammoth.extractRawText({ arrayBuffer: e.target.result });
          fullText = result.value;
          fullChars = fullText.length;
          statPages.textContent = "N/A";
        } else {
          throw new Error("Unsupported file type");
        }

        if (fullChars === 0) {
          addMessage("bot", "⚠️ Warning: No text extracted. This file might be empty or scanned.");
          console.warn("Extraction yielded 0 characters.");
          pdfText = "";
          chunks = [];
        } else {
          pdfText = fullText;
          chunks = chunkText(pdfText, 200);
        }

        statChars.textContent = fullChars;
        statChunks.textContent = chunks.length;

        // Generate embeddings immediately
        addMessage("bot", `📄 Text extracted. Generating embeddings for ${chunks.length} chunks...`);

        chunkEmbeddings = [];
        for (let i = 0; i < chunks.length; i++) {
          const emb = await embedText(chunks[i]);
          if (emb) chunkEmbeddings.push({ text: chunks[i], embedding: emb });
        }

        if (chunkEmbeddings.length === 0) {
          addMessage("bot", "⚠️ Failed to generate embeddings. Check your API connection.");
        } else {
          addMessage("bot", `✅ Ready! Processed ${chunkEmbeddings.length} chunks.`);
        }

      } catch (err) {
        console.error(err);
        alert("Error reading file: " + err.message);
      } finally {
        extractBtn.disabled = false;
        extractBtn.textContent = "Extract text";
      }
    };
    reader.readAsArrayBuffer(file);
  });

  // Chat
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // Enable send button if there is input
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

      // LOGIC: Check if we have document context
      if (chunkEmbeddings.length > 0) {
        // --- STRICT MODE ---
        const qEmbed = await embedText(question);
        if (!qEmbed) {
          botMsg.textContent = "🤖 ⚠️ Error generating question embedding.";
          return;
        }

        let scored = chunkEmbeddings.map(c => ({
          text: c.text,
          score: cosineSim(qEmbed, c.embedding)
        }));

        scored.sort((a, b) => b.score - a.score);
        const topChunks = scored.slice(0, 5).map(s => s.text).join("\n\n");

        // The STRICT prompt
        prompt = `You are a strict document assistant. 
Instructions:
1. Answer the Question ONLY based on the Context provided below.
2. Do not use outside knowledge.
3. If the answer cannot be found in the Context, your answer must be exactly: "I can only answer questions about the extracted document."

Context:
${topChunks}

Question: ${question}
Answer:`;

      } else {
        // --- GENERAL MODE (No file uploaded) ---
        prompt = `You are a helpful AI assistant. Answer the following question freely:\n\nQuestion: ${question}\nAnswer:`;
      }

      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama2",
          prompt: prompt
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

  // Theme toggle (existing logic)
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