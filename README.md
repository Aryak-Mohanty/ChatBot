# 🤖 Local PDF Q&A Chatbot

A fully offline, privacy-focused PDF and DOCX document chatbot powered by **Ollama LLMs**. Upload your documents and chat with them using local AI models—no data leaves your machine!

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Ollama](https://img.shields.io/badge/Ollama-Required-green.svg)
![License](https://img.shields.io/badge/License-Unlicense-blue.svg)

---

## 📋 Table of Contents

- [Features](#-features)
- [Demo](#-demo)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Public Access (ngrok)](#-public-access-ngrok)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [Known Issues & Bugs](#-known-issues--bugs)
- [Future Roadmap](#-future-roadmap)
- [License](#-license)

---

## ✨ Features

- **🔒 Fully Local & Private**: All processing happens on your machine. No cloud APIs, no data sharing.
- **📄 Multi-Format Support**: Supports both **PDF** and **DOCX** file formats.
- **📚 Multi-File Upload**: Upload up to 5 documents simultaneously (queued system).
- **🧠 Smart RAG (Retrieval-Augmented Generation)**: Uses vector embeddings for intelligent context retrieval.
- **⚡ Streaming Responses**: Watch AI responses appear in real-time.
- **🌓 Dark/Light Theme**: Toggle between themes with persistent preference.
- **📊 Document Stats**: View page count, character count, and indexed chunks.
- **🎨 Modern UI**: Clean, responsive interface built with Bootstrap 5.
- **⚙️ Customizable**: Change Ollama API URL and model via settings.

---

## 🎬 Demo

1. Upload a PDF or DOCX file
2. Click "Extract text" to index the document
3. Ask questions about your document in natural language
4. Get AI-powered answers based on the document content

---

## 📦 Prerequisites

Before running this application, ensure you have the following installed:

### 1. Ollama (Required)

Ollama is the backbone of this application. It provides local LLM inference.

**Install Ollama:**
- **Linux/macOS**: 
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```
- **Windows**: Download from [https://ollama.com/download](https://ollama.com/download)

**Pull Required Models:**
```bash
# Main chat model (choose one)
ollama pull llama3

# Embedding model (REQUIRED for document search)
ollama pull nomic-embed-text
```

> ⚠️ **Important**: The `nomic-embed-text` model is **mandatory** for the RAG functionality to work!

### 2. Python 3.8+

```bash
# Check Python version
python3 --version
```

### 3. Modern Web Browser

Chrome, Firefox, Edge, or Safari (latest versions recommended).

---

## 🚀 Installation

1. **Clone or Download the Repository:**
   ```bash
   git clone https://github.com/Aryak-Mohanty/pdf-qa-chatbot.git
   cd pdf-qa-chatbot
   ```

2. **Dependencies:**
   
   | Component | Dependency | How It Loads |
   |-----------|------------|--------------|
   | **Python Server** | Standard Library only | ✅ No installation needed |
   | **PDF Parsing** | [PDF.js](https://mozilla.github.io/pdf.js/) | 🌐 CDN first → 📦 Local fallback |
   | **DOCX Parsing** | [Mammoth.js](https://github.com/mwilliamson/mammoth.js/) | 🌐 CDN first → 📦 Local fallback |
   | **UI Framework** | [Bootstrap 5](https://getbootstrap.com/) | 🌐 CDN only |

   > 💡 **Offline Support**: If no internet connection, PDF.js and Mammoth.js automatically load from local files included in the repository. No manual setup required!

---

## ⚙️ Configuration

### API Keys & Setup

**You must configure API access yourself:**

1. **Ollama Setup (Local)**
   - Install Ollama from [ollama.com](https://ollama.com)
   - Start the Ollama service:
     ```bash
     ollama serve
     ```
   - The default API endpoint is `http://127.0.0.1:11434`

2. **Custom Ollama URL (Optional)**  
   If running Ollama on a different host/port:
   - Set environment variable:
     ```bash
     export OLLAMA_URL="http://your-host:port"
     ```
   - Or configure via the ⚙️ Settings menu in the app

3. **Model Selection**
   - Default model: `llama3`
   - Change via ⚙️ Settings menu
   - Recommended models: `llama3`, `mistral`, `gemma`

### External Hosting (Optional)

If hosting Ollama externally, ensure CORS is enabled:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

---

## 🖥️ Usage

### Quick Start

1. **Start Ollama:**
   ```bash
   ollama serve
   ```

2. **Start the Python Server (in a new terminal):**
   ```bash
   python3 server.py
   ```

3. **Open in Browser:**
   ```
   http://localhost:3001/
   ```

### Using the Chatbot

1. **Upload Documents**: Click the file input to select PDF or DOCX files (up to 5)
2. **Extract Text**: Click "Extract text" to process and index documents
3. **Ask Questions**: Type your question and hit "Ask" or press Enter
4. **Clear Files**: Use the 🗑️ button to clear the file queue and knowledge base

---

## 🌍 Public Access (ngrok)

Share your chatbot with anyone on the internet while running it locally. When you stop the server, public access is **immediately terminated**.

### One-Time Setup

1. **Install ngrok:**
   - Download from [https://ngrok.com/download](https://ngrok.com/download)
   - Extract and move to your PATH (e.g., `/usr/local/bin/`)

2. **Create ngrok Account:**
   - Sign up at [https://ngrok.com](https://ngrok.com)
   - Get your authtoken from the dashboard

3. **Configure ngrok:**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

### Start with Public Access

**Option A: Automated Script (Recommended)**
```bash
./start_with_ngrok.sh
```
This starts Ollama, the server, and ngrok together. Press `Ctrl+C` to stop everything.

**Option B: Manual Start**
```bash
# Terminal 1
ollama serve

# Terminal 2
python3 server.py

# Terminal 3
ngrok http 3001
```

### Sharing

ngrok will display a URL like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3001
```

Share this URL with anyone! They can access your chatbot from anywhere in the world.

> ⚠️ **Note**: The free ngrok plan shows a warning page on first visit. Users just need to click "Visit Site" to proceed.

---

## 📁 Project Structure

### Files to Upload to GitHub

```
pdf-qa-chatbot/
├── README.md               # This file (Documentation)
├── index.html              # Main frontend interface
├── script.js               # Frontend JavaScript logic
├── server.py               # Python proxy server
├── start_with_ngrok.sh     # Public access launcher script
├── pdf.min.js              # PDF.js library (offline fallback)
├── pdf.worker.min.js       # PDF.js worker (offline fallback)
└── mammoth.browser.min.js  # Mammoth.js library (offline fallback)
```

---

## 🔧 How It Works

### Architecture

```
┌──────────────────┐     ┌────────────────┐     ┌─────────────────┐
│  Browser (UI)    │────▶│  Python Proxy  │────▶│  Ollama Server  │
│  index.html      │     │  server.py     │     │  (Local LLM)    │
│  script.js       │◀────│  Port: 3001    │◀────│  Port: 11434    │
└──────────────────┘     └────────────────┘     └─────────────────┘
```

### RAG Pipeline

1. **Document Processing**: PDF.js / Mammoth.js extracts text from documents
2. **Hierarchical Chunking**: Text is split into parent chunks (600 words) and child chunks (150 words)
3. **Embedding Generation**: Child chunks are embedded using `nomic-embed-text`
4. **Semantic Search**: User queries are embedded and compared using cosine similarity
5. **Context Retrieval**: Top matching parent chunks are retrieved for context
6. **LLM Generation**: Ollama generates answers based on retrieved context

---

## 🐛 Known Issues & Bugs

### Current Limitations

| Issue | Status | Description |
|-------|--------|-------------|
| Large PDF Slowness | ⚠️ Known | PDFs with 50+ pages may take time to index |
| OCR PDFs | ❌ Not Supported | Image-only PDFs without text layer won't work |
| Memory Usage | ⚠️ Watch | Large documents consume browser memory |
| File Limit | 📝 By Design | Maximum 5 files at a time |
| Mobile Layout | ⚠️ Basic | Resizable panes disabled on mobile |

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to Ollama" | Ensure `ollama serve` is running |
| Embedding errors | Verify `nomic-embed-text` model is installed |
| Slow responses | Try a smaller model like `mistral` |
| CORS errors | Use the provided Python proxy server |
| Empty extraction | Check if PDF has selectable text |

---

## 🚀 Future Roadmap

### Planned Features

- [ ] **OCR Support**: Add Tesseract.js for scanned PDF support
- [ ] **Image Analysis**: Extract and analyze images from documents
- [ ] **Chat History**: Persist conversation across sessions
- [ ] **Document Preview**: Show PDF preview in sidebar
- [ ] **Improved Chunking**: Semantic paragraph-aware chunking
- [ ] **Model Comparison**: A/B test responses from different models
- [ ] **Export Chat**: Download conversation as PDF/Markdown
- [ ] **Folder Upload**: Batch process entire folders
- [ ] **Highlights**: Show source passages used for answers
- [ ] **Multi-language**: Support for non-English documents

---

## 📄 License

This project is released into the **public domain** under [The Unlicense](https://unlicense.org/).

You are free to copy, modify, distribute, or use the project for any purpose, without any conditions.

---

<p align="center">
  Made with ❤️ for local AI enthusiasts
</p>
