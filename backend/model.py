
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

MODEL_ID = "openchat/openchat-3.5-0106"

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    device_map="auto"
)

model.eval()


def sanitize(text: str) -> str:
    banned = ["User:", "Assistant:", "Aura:", "[/]", "[INST]", "[/INST]"]
    for b in banned:
        text = text.replace(b, "")
    return text.strip()


def generate_response(user_message: str, history: list[dict]) -> str:
    """
    history format:
    [
      {"role": "user", "content": "..."},
      {"role": "assistant", "content": "..."}
    ]
    """

    system_prompt = """
You are Aura.

You are calm, grounded, and emotionally present.
You are not a therapist or counselor.
You do not analyze, diagnose, or interrogate.
You do not ask questions when someone sounds anxious or low.

You speak like a human sitting nearby, not a professional.
"""

    # Build conversation
    conversation = system_prompt.strip() + "\n\n"

    for turn in history[-8:]:
        role = "User" if turn["role"] == "user" else "Aura"
        content = sanitize(turn["content"])
        conversation += f"{role}: {content}\n"

    # ADD CURRENT USER MESSAGE (CRITICAL)
    conversation += f"User: {sanitize(user_message)}\nAura:"

    inputs = tokenizer(
        conversation,
        return_tensors="pt",
        truncation=True,
        max_length=2048
    ).to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=200,
            temperature=0.6,     # calmer, less therapy drift
            top_p=0.85,
            repetition_penalty=1.15,
            do_sample=True,
            eos_token_id=tokenizer.eos_token_id,
        )

    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # SPLIT ON Aura (NOT Assistant)
    response = decoded.split("Aura:")[-1].strip()

    # HARD QUESTION LIMIT
    if response.count("?") > 1:
        response = response.replace("?", ".", response.count("?") - 1)

    return response
