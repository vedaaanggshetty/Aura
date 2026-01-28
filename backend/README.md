# FastAPI LLM Backend

A minimal FastAPI backend for running the openchat/openchat-3.5-0106 model locally.

## What it does

- Loads the openchat/openchat-3.5-0106 model once and keeps it in memory
- Provides a simple chat endpoint via FastAPI
- Maintains conversation history for context-aware responses
- Privacy-first: all processing happens locally on your machine

## Running the backend

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8000
   ```

## API Endpoint

- **POST** `/api/chat`
  - Accepts: `{"message": string, "history": [{"role": "user"|"assistant", "content": string}]}`
  - Returns: `{"reply": string}`

The model loads on first request and stays in memory for subsequent requests.
