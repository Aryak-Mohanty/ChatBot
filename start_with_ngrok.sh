#!/bin/bash

# ==========================================
# Chatbot Server with ngrok Tunnel
# ==========================================
# This script starts the local server and creates
# a public ngrok tunnel so anyone can access it.
# ==========================================

PORT=3001

echo "🚀 Starting Chatbot with ngrok tunnel..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed!"
    echo ""
    echo "📥 Install ngrok:"
    echo "   1. Go to https://ngrok.com/download"
    echo "   2. Download and extract ngrok"
    echo "   3. Move it to /usr/local/bin or add to PATH"
    echo "   4. Sign up at https://ngrok.com and get your authtoken"
    echo "   5. Run: ngrok config add-authtoken YOUR_AUTH_TOKEN"
    echo ""
    exit 1
fi

# Check if Ollama is running
echo "🔍 Checking Ollama..."
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Ollama is not running. Starting it in background..."
    ollama serve > ollama.log 2>&1 &
    sleep 2
    if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama started successfully"
    else
        echo "❌ Failed to start Ollama. Please start manually: ollama serve"
        exit 1
    fi
fi

echo ""

# Start the Python server in background
echo "🌐 Starting local server on port $PORT..."
python3 server.py &
SERVER_PID=$!
sleep 2

# Check if server started
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Failed to start server"
    exit 1
fi
echo "✅ Local server running at http://localhost:$PORT"

echo ""
echo "🌍 Starting ngrok tunnel..."
echo ""

# Start ngrok (this will show the public URL)
ngrok http $PORT

# When ngrok is terminated (Ctrl+C), clean up
echo ""
echo "🛑 Shutting down..."
kill $SERVER_PID 2>/dev/null
echo "✅ Server stopped. Public access has been terminated."
