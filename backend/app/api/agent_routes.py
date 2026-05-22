from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    AgentChatRequest,
    AgentChatResponse,
    AgentHistoryResponse,
    AgentProcessesResponse,
)
from app.services.agent import PROCESS_REGISTRY, chat, get_history

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/processes", response_model=AgentProcessesResponse)
def list_processes() -> dict:
    return {"processes": PROCESS_REGISTRY}


@router.post("/chat", response_model=AgentChatResponse)
def agent_chat(req: AgentChatRequest) -> dict:
    try:
        return chat(req.page_id, req.process_id, req.message, req.conversation_id)
    except PermissionError as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/history/{conversation_id}", response_model=AgentHistoryResponse)
def agent_history(conversation_id: str) -> dict:
    return {"conversation_id": conversation_id, "messages": get_history(conversation_id)}
