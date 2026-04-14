from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, WatchMetric
from ..schemas import WatchMetricRequest, WatchMetricResponse

router = APIRouter(prefix="/watch", tags=["watch"])


@router.post(
    "/metrics", response_model=WatchMetricResponse, status_code=status.HTTP_201_CREATED
)
def post_metric(
    req: WatchMetricRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    metric = WatchMetric(
        user_id=user.id,
        heart_rate=req.heart_rate,
        spo2=req.spo2,
        temperature=req.temperature,
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


@router.get("/latest", response_model=WatchMetricResponse)
def get_latest(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    metric = (
        db.query(WatchMetric)
        .filter(WatchMetric.user_id == user.id)
        .order_by(WatchMetric.recorded_at.desc())
        .first()
    )
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No metrics yet"
        )
    return metric
