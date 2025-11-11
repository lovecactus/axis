from functools import lru_cache
from datetime import datetime, timedelta, timezone

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
        claims = get_privy_client().users.verify_access_token(
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

    user = db.get(User, claims.user_id)
    if user is None:
        user = User(id=claims.user_id)
        db.add(user)
    user.touch()

    # Remove any stale session rows for this Privy session id to avoid duplicates.
    db.query(SessionRecord).filter(
        SessionRecord.privy_session_id == claims.session_id
    ).delete(synchronize_session=False)

    session_record = SessionRecord(
        user=user,
        privy_session_id=claims.session_id,
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
        app_id=claims.app_id,
        user_id=claims.user_id,
        session_id=claims.session_id,
    )


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

