const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Start ngrok tunnel
function startNgrok() {
  const ngrok = spawn('ngrok', ['http', PORT], {
    stdio: 'inherit',
    shell: true
  });

  ngrok.on('error', (error) => {
    console.error('Failed to start ngrok:', error.message);
    console.log('Make sure ngrok is installed: npm install -g ngrok');
  });

  return ngrok;
}

// Chat endpoint
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

  const responseText = "From Ngrok Server: " + phrases[Math.floor(Math.random() * phrases.length)] + 
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Starting ngrok tunnel...');
  startNgrok();
});
