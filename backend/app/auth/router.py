from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", summary="Privy login challenge placeholder")
def login() -> dict[str, str]:
    # TODO: integrate Privy login initiation
    return {"status": "pending"}


@router.post("/verify", summary="Privy login verification placeholder")
def verify() -> dict[str, str]:
    # TODO: verify Privy login and issue JWT
    return {"status": "pending"}

