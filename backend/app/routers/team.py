from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Team, User
from ..schemas import TeamJoinRequest, TeamResponse

router = APIRouter(prefix="/team", tags=["team"])


@router.post("/join", response_model=TeamResponse)
def join_team(
    req: TeamJoinRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = req.team_code.upper()
    team = db.query(Team).filter(Team.code == code).first()
    if not team:
        team = Team(code=code, name=f"팀 {code}")
        db.add(team)
        db.flush()
    user.team_id = team.id
    db.commit()
    db.refresh(team)
    return team


@router.get("/me", response_model=TeamResponse)
def get_my_team(user: User = Depends(get_current_user)):
    if not user.team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No team joined"
        )
    return user.team
