from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class PredictionFactor(BaseModel):
    label: str
    value: float

class PredictionItem(BaseModel):
    id: str
    object: str
    objectId: int
    type: str
    horizon: str
    horizonHours: int
    probability: int
    model: str
    verified: bool
    status: str
    inferenceSeconds: Optional[float] = None
    factors: List[PredictionFactor]
    createdAt: datetime

class PredictionDecisionRequest(BaseModel):
    decision: str = Field(..., description="accepted, rejected or verified")
