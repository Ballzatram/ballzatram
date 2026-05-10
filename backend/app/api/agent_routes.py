from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    AccessVerifyRequest,
    AccessVerifyResponse,
    AgentChatRequest,
    AgentChatResponse,
    AgentHistoryResponse,
    AgentProcessesResponse,
    CheckoutRequest,
    CheckoutResponse,
)
from app.services.agent import PROCESS_REGISTRY, chat, create_checkout_session, get_history, verify_checkout_session

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/processes", response_model=AgentProcessesResponse)
def list_processes() -> dict:
    return {"processes": PROCESS_REGISTRY}


@router.post("/chat", response_model=AgentChatResponse)
def agent_chat(req: AgentChatRequest) -> dict:
    try:
        return chat(req.page_id, req.process_id, req.message, req.conversation_id, req.access_token)
    except PermissionError as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/history/{conversation_id}", response_model=AgentHistoryResponse)
def agent_history(conversation_id: str) -> dict:
    return {"conversation_id": conversation_id, "messages": get_history(conversation_id)}


@router.post("/billing/checkout", response_model=CheckoutResponse)
def billing_checkout(req: CheckoutRequest) -> dict:
    try:
        return create_checkout_session(req.success_url, req.cancel_url, req.customer_email, req.page_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/billing/verify", response_model=AccessVerifyResponse)
def billing_verify(req: AccessVerifyRequest) -> dict:
    paid_access, reason = verify_checkout_session(req.session_id, req.access_token)
    return {"paid_access": paid_access, "reason": reason}
