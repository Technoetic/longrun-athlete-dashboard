import json

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import DailyRecord, User
from ..schemas import DailyRecordRequest, DailyRecordResponse

router = APIRouter(prefix="/records", tags=["records"])


def _to_response(record: DailyRecord) -> DailyRecordResponse:
    return DailyRecordResponse(
        id=record.id,
        date=record.date,
        intensity=record.intensity,
        injury_tags=json.loads(record.injury_tags or "[]"),
        injury_note=record.injury_note,
        created_at=record.created_at,
    )


@router.post("", response_model=DailyRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    req: DailyRecordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(DailyRecord)
        .filter(DailyRecord.user_id == user.id, DailyRecord.date == req.date)
        .first()
    )
    if existing:
        existing.intensity = req.intensity
        existing.injury_tags = json.dumps(req.injury_tags, ensure_ascii=False)
        existing.injury_note = req.injury_note
        record = existing
    else:
        record = DailyRecord(
            user_id=user.id,
            date=req.date,
            intensity=req.intensity,
            injury_tags=json.dumps(req.injury_tags, ensure_ascii=False),
            injury_note=req.injury_note,
        )
        db.add(record)
    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.get("", response_model=list[DailyRecordResponse])
def list_records(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(DailyRecord)
        .filter(DailyRecord.user_id == user.id)
        .order_by(DailyRecord.date.desc())
        .limit(30)
        .all()
    )
    return [_to_response(r) for r in records]
