from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime
import logging

from app.database import get_db
from app.models import PredictionModel, ObjectModel
from app.schemas.prediction import PredictionItem, PredictionFactor, PredictionDecisionRequest
from app.core.permissions import require_permissions

router = APIRouter(prefix="/api/v1/predictions", tags=["Прогнозы"])
logger = logging.getLogger(__name__)

@router.get("", response_model=dict, summary="Получение списка прогнозов")
async def get_predictions(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permissions(["predictions:read"]))
):
    query = select(PredictionModel)
    
    if status:
        query = query.where(PredictionModel.status == status)
        
    query = query.order_by(PredictionModel.created_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    predictions = result.scalars().all()
    
    # Also fetch related objects manually if relation is not set up correctly
    object_ids = [p.object_id for p in predictions if p.object_id]
    objects_map = {}
    if object_ids:
        obj_result = await db.execute(select(ObjectModel).where(ObjectModel.id.in_(object_ids)))
        for o in obj_result.scalars().all():
            objects_map[o.id] = o

    items = []
    for p in predictions:
        obj_name = "Неизвестный объект"
        if p.object_id in objects_map:
            obj_name = objects_map[p.object_id].disp_name or f"Объект {p.object_id}"
            
        factors = []
        if p.features_explanation and isinstance(p.features_explanation, list):
            for f in p.features_explanation:
                if "label" in f and "value" in f:
                    factors.append(PredictionFactor(label=f["label"], value=f["value"]))
                    
        items.append(PredictionItem(
            id=p.public_id or f"P-{p.id}",
            object=obj_name,
            objectId=p.object_id or 0,
            type=p.risk_type,
            horizon=f"{p.horizon_hours}ч",
            horizonHours=p.horizon_hours,
            probability=int(p.risk_score * 100),
            model=f"{p.model_name} {p.model_version}" if p.model_name else "Unknown Model",
            verified=p.status == "verified",
            status=p.status,
            inferenceSeconds=p.inference_seconds,
            factors=factors,
            createdAt=p.created_at
        ))
        
    from sqlalchemy import func
    # Count total
    count_query = select(func.count(PredictionModel.id))
    if status:
        count_query = count_query.where(PredictionModel.status == status)
    total = await db.scalar(count_query)
    
    return {
        "items": items,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": total
        }
    }

@router.post("/{pred_id}/decision", summary="Принятие решения по прогнозу")
async def make_decision(
    pred_id: str,
    decision: PredictionDecisionRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permissions(["predictions:read"]))  # Или predictions:manage
):
    if decision.decision not in ["accepted", "rejected", "verified"]:
        raise HTTPException(status_code=400, detail="Invalid decision")
        
    query = select(PredictionModel).where(
        (PredictionModel.public_id == pred_id) | (PredictionModel.id == (int(pred_id.replace("P-", "")) if pred_id.startswith("P-") and pred_id[2:].isdigit() else -1))
    )
    result = await db.execute(query)
    prediction = result.scalar_one_or_none()
    
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
        
    prediction.status = decision.decision
    await db.commit()
    
    return {"status": "success", "new_status": prediction.status}
