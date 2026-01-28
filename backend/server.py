from fastapi import FastAPI, Request
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Union, Optional


from model import generate_response

app = FastAPI()

# ✅ HARD CORS — ngrok-safe
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # IMPORTANT for "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ FORCE PREFLIGHT RESPONSE
@app.options("/{path:path}")
async def options_handler(path: str):
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        },
    )


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Union[str, Dict]]] = []


@app.post("/api/chat")
def chat(req: ChatRequest):
    normalized_history = []

    for h in req.history:
        if isinstance(h, dict):
            # already structured
            normalized_history.append(h)
        elif isinstance(h, str) and h.strip():
            # ASSUME STRINGS ARE USER MESSAGES ONLY
            normalized_history.append({
                "role": "user",
                "content": h
            })

    reply = generate_response(req.message, normalized_history)
    return {"reply": reply}

