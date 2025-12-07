# ChatBot 🤖


Note: This application requires a local AI server (Ollama) and a Python proxy to run. There is no public live site for this project.

The Local RAG ChatBot System is a client-side Retrieval-Augmented Generation (RAG) application designed to allow users to chat with their own documents. The system uses client-side logic to extract text from uploaded files and then leverages a Python proxy server to interface with a local Large Language Model (LLM) instance.


<h2>🚀 Key Features</h2>
<ol>
  <li>Client-Side Document Processing: Extracts text from uploaded PDF or DOCX files directly in the browser.</li>
  <li>Uses PDF.js for PDFs and Mammoth.js for DOCX files.</li>
  <li>Local AI Integration: Utilizes a Python proxy (server.py) to bypass CORS restrictions and communicate with a locally running Ollama instance.</li>
  <li>Semantic Search: Performs advanced semantic searches against the document text to retrieve the most relevant context.</li>
  <li>Retrieval-Augmented Generation (RAG): Generates answers by conditioning the local LLM with context retrieved from the user's uploaded documents.</li>
</ol>


<h2>🛠️ Tech Stack</h2>

This project implements a hybrid client-server architecture:
<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Technology</th>
      <th>Role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Frontend Runtime</td>
      <td>Browser (HTML5/ES6)</td>
      <td>Chat window, file upload, and settings UI.</td>
    </tr>
    <tr>
      <td>Styling</td>
      <td>Bootstrap 5.3.2 & Custom CSS</td>
      <td>User Interface design.</td>
    </tr>
    <tr>
      <td>PDF Engine</td>
      <td>PDF.js (v3.11.174)</td>
      <td>Client-side PDF text extraction.</td>
    </tr>
    <tr>
      <td>DOCX Engine</td>
      <td>Mammoth.js</td>
      <td>Client-side DOCX text extraction.</td>
    </tr>
    <tr>
      <td>Backend Proxy</td>
      <td>Python http.server/socketserver</td>
      <td>Forwards browser requests to Ollama API.</td>
    </tr>
    <tr>
      <td>AI Backend</td>
      <td>Ollama (Local LLM API)</td>
      <td>Handles vector embedding generation and chat responses.</td>
    </tr>
  </tbody>
</table>


<h2>🐞 Known Bugs</h2>
<ol>
  <li>Offline Functionality Limitations: While the Service Worker caches core assets (index.html, style.css, etc.), live weather data retrieval requires an active internet connection. The app currently displays a generic error or stale data when offline.</li>
  <li>Hardcoded Dependencies: The core logic has a hardcoded dependency on specific Ollama models, limiting flexibility.</li>
  <li>Naive Text Chunking: The current text chunking implementation uses a simple character limit approach rather than a more robust sentence-aware or sliding-window method.</li>
  <li>Missing Vectorization Error Handling: If a request to embed text fails (e.g., due to a temporary network issue), the knowledge base becomes incomplete, but the user is not explicitly warned.</li>
  <li>Inconsistent Server Configuration: Documentation and error messages may reference hardcoded URLs or ports that do not match the user's actual local server setup.</li>
</ol>


<h2>✨ Future Scope (Recommendations)</h2>
<ol>
  <li>Model Selection: Update script.js to fetch available models and allow the user to select their preferred embedding and chat models via the settings menu.</li>
  <li>Improved Chunking: Implement a sentence-aware chunker or a sliding window approach (e.g., chunk size 500 characters with 50 character overlap) to improve context retrieval accuracy.</li>
  <li>Robust Error Handling: Implement a retry mechanism for failed embedding requests and provide a dedicated UI alert if a document was only partially processed.</li>
  <li>Dynamic Configuration: Implement logic to pass the server port to the frontend or use relative paths in error messages to align instructions with the actual configuration.</li>
</ol>


<h2>📦 Installation & Setup</h2>

To run this project, you must have <a href="https://www.python.org/downloads/">Python </a>and <a href="https://ollama.com/download"> Ollama </a> installed locally.
<ol>
  <li>Clone the repository.</li>
  <li>Install Ollama: Ensure Ollama is running and configured on the default port (127.0.0.1:11434).</li>
  <li>Start the Python Proxy: Run the server.py file to start the proxy server (it typically defaults to port 8000).</li>
  <li>Launch Frontend: Open http://127.0.0.1:8000/index.html in your web browser.</li>
</ol>


<h2>📄 License & Usage</h2>
This project is developed for educational and personal use. Redistribution or replication without permission is discouraged. API keys (or local server endpoints) included in this project should not be reused for production systems.

<hr>
