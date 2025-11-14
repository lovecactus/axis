import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Task, User
from app.schemas.admin import AdminDatabaseOverviewResponse, UserSummary

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


@router.get(
    "/database-overview",
    response_model=AdminDatabaseOverviewResponse,
    summary="Fetch first 20 users and tasks for admin dashboard",
)
def get_database_overview(db: Session = Depends(get_db)) -> AdminDatabaseOverviewResponse:
    users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .limit(20)
        .all()
    )
    tasks = (
        db.query(Task)
        .order_by(Task.id.asc())
        .limit(20)
        .all()
    )

    logger.info(
        "Admin database overview requested users=%s tasks=%s",
        len(users),
        len(tasks),
    )

    return AdminDatabaseOverviewResponse(
        users=users,
        tasks=tasks,
    )

