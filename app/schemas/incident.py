from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class IncidentItem(BaseModel):
    id: str
    object: str
    objectId: int
    type: str
    status: str
    probability: Optional[int] = None
    date: datetime
    location: str

class Pagination(BaseModel):
    limit: int
    offset: int
    total: int

class IncidentResponse(BaseModel):
    items: List[IncidentItem]
    pagination: Pagination
