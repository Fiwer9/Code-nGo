from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import Optional
from datetime import datetime
import io
import csv
import logging

from app.database import get_db
from app.models import IncidentModel, ObjectModel
from app.schemas.incident import IncidentResponse, IncidentItem, Pagination
from app.core.permissions import require_permissions

router = APIRouter(prefix="/api/v1/incidents", tags=["Incidents"])
logger = logging.getLogger(__name__)

async def get_incidents_base(db: AsyncSession, limit: int, offset: int, status: Optional[str] = None, search: Optional[str] = None):
    query = select(IncidentModel)
    
    if status:
        query = query.where(IncidentModel.status == status)
        
    query = query.order_by(IncidentModel.occurred_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    incidents = result.scalars().all()
    
    object_ids = [i.object_id for i in incidents if i.object_id]
    objects_map = {}
    if object_ids:
        obj_result = await db.execute(select(ObjectModel).where(ObjectModel.id.in_(object_ids)))
        for o in obj_result.scalars().all():
            objects_map[o.id] = o
            
    items = []
    for i in incidents:
        obj_name = "Неизвестный объект"
        location = i.location or "Не указано"
        
        if i.object_id in objects_map:
            obj = objects_map[i.object_id]
            obj_name = obj.disp_name or f"Объект {obj.id}"
            if not i.location and obj.parent_id:
                location = str(obj.parent_id)
                
        # Simple search filtering in python for demo
        if search and search.lower() not in obj_name.lower() and search.lower() not in i.public_id.lower() and search.lower() not in location.lower():
            continue

        items.append(IncidentItem(
            id=i.public_id,
            object=obj_name,
            objectId=i.object_id or 0,
            type=i.incident_type,
            status=i.status,
            probability=int(i.probability * 100) if i.probability else None,
            date=i.occurred_at,
            location=location
        ))
        
    from sqlalchemy import func
    count_query = select(func.count(IncidentModel.id))
    if status:
        count_query = count_query.where(IncidentModel.status == status)
    total = await db.scalar(count_query)
    
    return items, total

@router.get("", response_model=IncidentResponse)
async def get_incidents(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permissions(["objects:read"]))
):
    items, total = await get_incidents_base(db, limit, offset, status, search)
    return IncidentResponse(
        items=items,
        pagination=Pagination(limit=limit, offset=offset, total=total)
    )

@router.get("/export.csv")
async def export_incidents_csv(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permissions(["objects:read"]))
):
    items, _ = await get_incidents_base(db, 10000, 0, status, None)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Объект", "Тип", "Статус", "Вероятность", "Дата", "Локация"])
    
    for item in items:
        writer.writerow([
            item.id,
            item.object,
            item.type,
            item.status,
            f"{item.probability}%" if item.probability else "",
            item.date.strftime("%Y-%m-%d %H:%M:%S"),
            item.location
        ])
        
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=incidents.csv"})
