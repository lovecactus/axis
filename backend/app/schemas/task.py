from pydantic import BaseModel


class TaskRead(BaseModel):
    id: int
    name: str
    description: str
    difficulty: str
    expected_duration: int
    success_rate: float
    thumbnail: str

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    tasks: list[TaskRead]

