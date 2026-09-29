from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class EquipmentItem(BaseModel):
    id: str
    name: str
    location: str
    type: str
    sensor_type: str
    system_type: str
    status: str
    lastCheck: Optional[datetime] = None
    objectId: Optional[int] = None
    parentId: Optional[int] = None

class EquipmentStats(BaseModel):
    total: int
    online: int
    warning: int
    offline: int
    maintenance: int

class Pagination(BaseModel):
    limit: int
    offset: int
    total: int

class EquipmentResponse(BaseModel):
    items: List[EquipmentItem]
    stats: EquipmentStats
    pagination: Pagination
