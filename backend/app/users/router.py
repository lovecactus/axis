from fastapi import APIRouter

router = APIRouter(prefix="/me", tags=["users"])


@router.get("/", summary="Get current user profile")
def get_profile() -> dict[str, str]:
    # TODO: return actual user profile
    return {"message": "profile placeholder"}


@router.get("/history", summary="List user session history")
def list_history() -> dict[str, list]:
    # TODO: return actual session history
    return {"sessions": []}

