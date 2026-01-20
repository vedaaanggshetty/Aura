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
const multer = require('multer');
const { analyzeAudioFeatures, convertToAnalysisState } = require('./voiceAnalysis');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3003;

app.use(cors());
app.use(bodyParser.json());

// Configure multer for audio file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

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

  // Set up headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

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
    const sseData = `data: ${JSON.stringify({content: token + ' '})}\n\n`;
    res.write(sseData);
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Send done signal
  res.write('data: [DONE]\n\n');
  res.end();
});

// Emotion Analysis Endpoint
app.post('/api/analyze', (req, res) => {
  // Mock logic for sentiment analysis
  const { text } = req.body;
  const score = Math.random() * 2 - 1; // -1 to 1
  res.json({ score, sentiment: score > 0 ? 'positive' : 'negative' });
});

// Voice Analysis Endpoint
app.post('/analyze-voice', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Analyze audio features
    const voiceAnalysis = analyzeAudioFeatures(req.file.buffer);
    
    // Convert to Aura's AnalysisState format
    const analysisState = convertToAnalysisState(voiceAnalysis);

    res.json({
      success: true,
      analysis: analysisState,
      confidence: voiceAnalysis.confidence
    });
  } catch (error) {
    console.error('Voice analysis error:', error);
    res.status(500).json({ error: 'Voice analysis failed' });
  }
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
