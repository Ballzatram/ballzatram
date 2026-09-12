"""Request-scoped user API keys; never fall back to the operator's environment."""
import re

from fastapi import Header, HTTPException


def user_openai_key(authorization: str | None = Header(default=None)) -> str | None:
    if authorization is None:
        return None
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="A user OpenAI API key is required.")
    key = authorization[7:]
    if not re.fullmatch(r"sk-[A-Za-z0-9_-]{12,500}", key) or key.startswith(("sk-ant-", "sk-or-")):
        raise HTTPException(status_code=401, detail="Use an OpenAI API key, never chat account credentials.")
    return key
