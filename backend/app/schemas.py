from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    nickname: str = Field(min_length=2, max_length=10)
    sport: Optional[str] = None
    team_code: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    nickname: str
    sport: Optional[str]
    athlete_code: str
    team_code: Optional[str]

    class Config:
        from_attributes = True


class DailyRecordRequest(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    intensity: int = Field(ge=1, le=10)
    injury_tags: list[str] = []
    injury_note: str = ""


class DailyRecordResponse(BaseModel):
    id: int
    date: str
    intensity: int
    injury_tags: list[str]
    injury_note: str
    created_at: datetime

    class Config:
        from_attributes = True


class WatchMetricRequest(BaseModel):
    heart_rate: int = Field(ge=0, le=300)
    spo2: int = Field(ge=0, le=100)
    temperature: float = Field(ge=20.0, le=45.0)


class WatchMetricResponse(BaseModel):
    id: int
    heart_rate: int
    spo2: int
    temperature: float
    recorded_at: datetime

    class Config:
        from_attributes = True


class TeamJoinRequest(BaseModel):
    team_code: str = Field(min_length=4, max_length=16)


class TeamResponse(BaseModel):
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True
