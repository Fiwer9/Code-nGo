import os
import sys
from pathlib import Path

# Добавляем корневую директорию проекта в sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import random
import logging
from datetime import datetime, timedelta
import asyncio
from dotenv import load_dotenv

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models import ChannelModel, ObjectModel, PredictionModel, IncidentModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

load_dotenv()

def get_async_engine():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        db_user = os.getenv("POSTGRES_USER", "postgres")
        db_pass = os.getenv("POSTGRES_PASSWORD", "postgrespassword")
        db_host = os.getenv("POSTGRES_HOST", "localhost")
        db_port = os.getenv("POSTGRES_PORT", "5432")
        db_name = os.getenv("POSTGRES_DB", "moscollector")
        db_url = f"postgresql+asyncpg://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
    return create_async_engine(db_url, echo=False)

async def seed_demo():
    engine = get_async_engine()
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    random.seed(42)  # Фиксированный seed для детерминированности
    
    async with async_session() as session:
        # Проверяем, есть ли объекты и каналы
        channels_result = await session.execute(select(ChannelModel).limit(50))
        channels = channels_result.scalars().all()
        
        objects_result = await session.execute(select(ObjectModel).limit(50))
        objects = objects_result.scalars().all()
        
        if not objects:
            logger.warning("No objects found. Please load the dataset first.")
            return
            
        # 1. Генерируем demo-координаты для объектов
        logger.info("Setting demo coordinates for objects...")
        # Центр Москвы ~ 55.7558, 37.6173. Сделаем разброс +- 0.1
        base_lat = 55.7558
        base_lng = 37.6173
        
        # Обновим все загруженные объекты
        all_objects = await session.execute(select(ObjectModel))
        all_objs = all_objects.scalars().all()
        for obj in all_objs:
            if obj.latitude is None or obj.longitude is None:
                obj.latitude = base_lat + (random.random() - 0.5) * 0.2
                obj.longitude = base_lng + (random.random() - 0.5) * 0.2
                
        await session.commit()
        
        # 2. Генерируем Predictions
        existing_preds = await session.execute(select(PredictionModel).limit(1))
        if existing_preds.scalars().first():
            logger.info("Predictions already seeded.")
        else:
            logger.info("Seeding predictions...")
            risk_types = ["Подтопление", "Пожар", "Несанк. доступ", "Отказ датчика", "Газовая утечка"]
            models = ["FloodNet v3.2", "FirePredict v2.1", "AccessGuard v1.8", "SensorHealth v4.0", "GasLeak v2.4"]
            
            for i in range(1, 16):
                ch = random.choice(channels) if channels else None
                obj = random.choice(objects)
                rtype = random.choice(risk_types)
                mod = models[risk_types.index(rtype)]
                
                pred = PredictionModel(
                    public_id=f"P-{100 + i}",
                    channel_id=ch.id if ch else None,
                    object_id=obj.id,
                    risk_type=rtype,
                    risk_score=random.uniform(0.35, 0.98),
                    horizon_hours=random.choice([6, 12, 24, 48, 72]),
                    model_name=mod,
                    inference_seconds=round(random.uniform(1.2, 5.5), 1),
                    features_explanation=[
                        {"label": "Температура", "value": random.randint(20, 90)},
                        {"label": "Влажность", "value": random.randint(40, 99)}
                    ],
                    status=random.choice(["pending", "accepted", "verified", "rejected"])
                )
                session.add(pred)
            await session.commit()
            
        # 3. Генерируем Incidents
        existing_inc = await session.execute(select(IncidentModel).limit(1))
        if existing_inc.scalars().first():
            logger.info("Incidents already seeded.")
        else:
            logger.info("Seeding incidents...")
            inc_types = ["Подтопление", "Пожар", "Несанк. доступ", "Отказ датчика", "Газовая утечка"]
            statuses = ["critical", "warning", "info", "resolved"]
            
            # Get some predictions to link
            preds_result = await session.execute(select(PredictionModel))
            preds = preds_result.scalars().all()
            
            for i in range(1, 16):
                obj = random.choice(objects)
                ch = random.choice(channels) if channels else None
                inc_type = random.choice(inc_types)
                status = random.choice(statuses)
                linked_pred = random.choice(preds) if preds and random.random() > 0.5 else None
                
                inc = IncidentModel(
                    public_id=f"INC-2026-{800 + i}",
                    prediction_id=linked_pred.id if linked_pred else None,
                    object_id=obj.id,
                    channel_id=ch.id if ch else None,
                    incident_type=inc_type,
                    probability=random.uniform(0.4, 0.98),
                    status=status,
                    occurred_at=datetime.now() - timedelta(hours=random.randint(1, 100)),
                    location=str(obj.parent_id) if obj.parent_id else None
                )
                session.add(inc)
            await session.commit()
            
    logger.info("Demo seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_demo())
