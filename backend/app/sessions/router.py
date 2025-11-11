from functools import lru_cache
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models import Session as SessionRecord
from app.models import User
from privy import AuthenticationError, PrivyAPI

SESSION_TTL = timedelta(days=1)


class PrivyExchangeRequest(BaseModel):
    token: str


class PrivyExchangeResponse(BaseModel):
    app_id: str
    user_id: str
    session_id: str


@lru_cache
def get_privy_client() -> PrivyAPI:
    if not settings.privy_app_id or not settings.privy_client_secret:
        raise RuntimeError("Privy credentials are not configured on the backend.")
    return PrivyAPI(
        app_id=settings.privy_app_id,
        app_secret=settings.privy_client_secret,
    )


router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post(
    "/privy",
    response_model=PrivyExchangeResponse,
    summary="Exchange Privy access token for backend session",
)
def exchange_privy_token(
    payload: PrivyExchangeRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> PrivyExchangeResponse:
    """
    Validate a Privy access token and mint a backend session cookie.

    This persists a minimal user/session record and returns the Privy claim
    payload. Extend as needed to enrich user metadata.
    """

    try:
        raw_claims = get_privy_client().users.verify_access_token(
            auth_token=payload.token
        )
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Privy access token",
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive guard
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify Privy access token",
        ) from exc

    claims = _normalize_privy_claims(raw_claims)

    user_id = claims["user_id"]
    session_id = claims["session_id"]
    app_id = claims["app_id"]

    user = db.get(User, user_id)
    if user is None:
        user = User(id=user_id)
        db.add(user)
    user.touch()

    # Remove any stale session rows for this Privy session id to avoid duplicates.
    db.query(SessionRecord).filter(
        SessionRecord.privy_session_id == session_id
    ).delete(synchronize_session=False)

    session_record = SessionRecord(
        user=user,
        privy_session_id=session_id,
        expires_at=datetime.now(timezone.utc) + SESSION_TTL,
    )
    db.add(session_record)
    db.commit()
    db.refresh(session_record)

    response.set_cookie(
        key="axis_session",
        value=str(session_record.id),
        httponly=True,
        secure=not settings.debug,
        samesite="lax",
        max_age=int(SESSION_TTL.total_seconds()),
    )

    return PrivyExchangeResponse(
        app_id=app_id,
        user_id=user_id,
        session_id=session_id,
    )


def _normalize_privy_claims(raw_claims: Any) -> dict[str, str]:
    """
    Convert the Privy verify_access_token response into a dict with the fields we need.

    The library can return either an object with attributes or a plain dict. We
    defensively support both shapes and surface a clear 500 if required fields
    are missing.
    """

    def _extract(source: Any, key: str, fallback: Optional[str] = None) -> Optional[str]:
        """Attempt to extract attribute or dict key with optional fallback path."""
        if isinstance(source, dict):
            if key in source:
                return source[key]
            if fallback and fallback in source:
                nested = source[fallback]
                if isinstance(nested, dict):
                    return nested.get("id")
        else:
            if hasattr(source, key):
                value = getattr(source, key)
                if isinstance(value, (str, int)):
                    return str(value)
            if fallback and hasattr(source, fallback):
                nested = getattr(source, fallback)
                if hasattr(nested, "id"):
                    nested_id = getattr(nested, "id")
                    if isinstance(nested_id, (str, int)):
                        return str(nested_id)
        return None

    user_id = _extract(raw_claims, "user_id", fallback="user")
    session_id = _extract(raw_claims, "session_id", fallback="session")
    app_id = _extract(raw_claims, "app_id")

    missing = [name for name, value in [("user_id", user_id), ("session_id", session_id), ("app_id", app_id)] if value is None]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Privy claims missing expected field(s): {', '.join(missing)}",
        )

    return {
        "user_id": user_id,
        "session_id": session_id,
        "app_id": app_id,
    }


@router.post("/", summary="Start task session")
def start_session(db: Session = Depends(get_db)) -> dict[str, str]:
    # TODO: implement session creation logic
    _ = db
    return {"session_id": "placeholder"}


@router.post("/{session_id}/telemetry", summary="Upload session telemetry")
def upload_telemetry(session_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    # TODO: implement telemetry ingestion logic
    _ = db
    return {"session_id": session_id, "status": "accepted"}


@router.post("/{session_id}/complete", summary="Complete task session")
def complete_session(session_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    # TODO: implement completion and scoring logic
    _ = db
    return {"session_id": session_id, "status": "completed"}

