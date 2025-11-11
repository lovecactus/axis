import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Task
from app.schemas.task import TaskListResponse, TaskRead

router = APIRouter(prefix="/tasks", tags=["tasks"])
logger = logging.getLogger("app.tasks")


@router.get("/", response_model=TaskListResponse, summary="List tasks")
def list_tasks(db: Session = Depends(get_db)) -> TaskListResponse:
    tasks = db.query(Task).all()
    logger.info("Listing tasks count=%s data=%s", len(tasks), tasks)
    return TaskListResponse(tasks=tasks)


@router.get("/{task_id}", response_model=TaskRead, summary="Get task detail")
def get_task(task_id: int, db: Session = Depends(get_db)) -> TaskRead:
    task = db.get(Task, task_id)
    if not task:
        logger.warning("Task not found id=%s", task_id)
        raise HTTPException(status_code=404, detail="Task not found")
    logger.info("Returning task detail id=%s data=%s", task_id, task)
    return task

