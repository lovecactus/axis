import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Task
from app.schemas.task import TaskRead

router = APIRouter(prefix="/taskdetail", tags=["taskdetail"])
logger = logging.getLogger("app.taskdetail")


@router.get("/", response_model=TaskRead, summary="Get task detail by id")
def get_task_detail(id: int, db: Session = Depends(get_db)) -> TaskRead:
    task = db.get(Task, id)
    if not task:
        logger.warning("Task not found id=%s", id)
        raise HTTPException(status_code=404, detail="Task not found")
    logger.info("Returning task detail id=%s data=%s", id, task)
    return task

