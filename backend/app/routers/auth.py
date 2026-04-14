from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    generate_athlete_code,
    get_current_user,
    hash_password,
    verify_password,
)
from ..database import get_db
from ..models import Team, User
from ..schemas import LoginRequest, SignupRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        nickname=user.nickname,
        sport=user.sport,
        athlete_code=user.athlete_code,
        team_code=user.team.code if user.team else None,
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    team_id = None
    if req.team_code:
        team = db.query(Team).filter(Team.code == req.team_code.upper()).first()
        if not team:
            team = Team(code=req.team_code.upper(), name=f"팀 {req.team_code.upper()}")
            db.add(team)
            db.flush()
        team_id = team.id

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        nickname=req.nickname,
        sport=req.sport,
        athlete_code=generate_athlete_code(),
        team_id=team_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return _user_to_response(user)
