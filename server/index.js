/**
 * BACKEND SERVER FOR AURA
 * 
 * Instructions:
 * 1. Create a folder named 'server'
 * 2. Save this file as 'index.js' inside it
 * 3. Run `npm init -y`
 * 4. Run `npm install express cors body-parser ws`
 * 5. Run `node index.js`
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// --- MOCK DATABASE ---
let chatHistory = [];

// --- REST API ROUTES ---

app.get('/', (req, res) => {
  res.send('Aura Intelligence Server Running');
});

// Chat Endpoint (Mocking LLM connection)
// In production, this would call your Python/NGROK endpoint
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  const lastUserMessage = messages[messages.length - 1].content;
  
  console.log('Received message:', lastUserMessage);

  // Set up headers for streaming
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  // Simulated AI Logic
  const phrases = [
    "I understand completely.",
    " It's normal to feel this way.",
    " Let's explore that further.",
    " Have you noticed any specific triggers?",
    " I'm here to support you through this.",
    " Breathe. Take a moment."
  ];

  const responseText = "From Server: " + phrases[Math.floor(Math.random() * phrases.length)] + 
                       " You mentioned: " + lastUserMessage.substring(0, 20) + "...";

  // Simulate streaming token by token
  const tokens = responseText.split(' ');
  
  for (const token of tokens) {
    res.write(token + ' ');
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  res.end();
});

// Emotion Analysis Endpoint
app.post('/api/analyze', (req, res) => {
  // Mock logic for sentiment analysis
  const { text } = req.body;
  const score = Math.random() * 2 - 1; // -1 to 1
  res.json({ score, sentiment: score > 0 ? 'positive' : 'negative' });
});

// --- WEBSOCKETS (Optional Real-time Layer) ---
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  ws.on('message', (message) => {
    console.log('received: %s', message);
    ws.send('Server confirmed: ' + message);
  });
});

server.listen(PORT, () => {
  console.log(`Aura Backend running on http://localhost:${PORT}`);
});
