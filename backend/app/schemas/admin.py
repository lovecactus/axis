from datetime import datetime
from pydantic import BaseModel

from app.schemas.task import TaskRead


class UserSummary(BaseModel):
    id: str
    email: str | None
    default_wallet_address: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminDatabaseOverviewResponse(BaseModel):
    users: list[UserSummary]
    tasks: list[TaskRead]

