from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging_config import configure_logging
from app.admin.router import router as admin_router
from app.auth.router import router as auth_router
from app.sessions.router import router as sessions_router
from app.tasks.router import router as tasks_router
from app.taskdetail.router import router as task_detail_router
from app.users.router import router as users_router

configure_logging()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(admin_router)
    app.include_router(tasks_router)
    app.include_router(task_detail_router)
    app.include_router(sessions_router)
    app.include_router(users_router)

    return app


app = create_app()

