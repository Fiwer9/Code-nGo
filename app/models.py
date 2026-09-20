from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    Time,
    func,
)
from geoalchemy2 import Geometry

from app.database import Base


class UserModel(Base):
    """
    ORM-модель таблицы пользователей системы (диспетчеры, инженеры, админы).
    
    Особенности:
    - `CheckConstraint`: ограничения на уровне PostgreSQL для поля gender.
    - `updated_at`: автоматическое обновление таймштампа при любых изменениях записи через `onupdate=func.now()`.
    """
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "gender IN ('male', 'female', 'unspecified')",
            name="chk_users_gender",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    login = Column(String(64), nullable=False)
    password_hash = Column(Text, nullable=False)
    surname = Column(String(100), nullable=False)
    name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    gender = Column(String(16), nullable=False, default="unspecified")
    jobtitle = Column(String(150), nullable=False)
    mobile_number = Column(String(32), nullable=True)
    email = Column(String(320), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    two_factor_enabled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ObjectModel(Base):
    """
    ORM-модель инфраструктурных объектов Москоллектора (коллекторы, узлы, участки).
    
    Особенности:
    - Поддержка иерархии объектов через `parent_id` и `hierarchy_level`.
    - `geometry`: геопространственные данные (PostGIS). 
      SRID 4326 указывает на географическую систему координат WGS 84 (широта/долгота для карт).
    """
    __tablename__ = "objects"

    id = Column(Integer, primary_key=True)
    hierarchy_level = Column(Integer, nullable=True)
    parent_id = Column(Integer, nullable=True)
    object_type = Column(String, nullable=True)
    disp_name = Column(String, nullable=True)
    geometry = Column(Geometry("GEOMETRY", srid=4326), nullable=True)


class ChannelModel(Base):
    """
    ORM-модель каналов датчиков телеметрии.
    
    Каждый канал привязан к конкретному объекту инфраструктуры (`object_id`) 
    и описывает тип измеряемого параметра (температура, задымление, открытие люка и т.д.).
    """
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True)
    sys_type = Column(String, nullable=True)
    sensor_type = Column(String, nullable=True)
    tag = Column(String, nullable=True)
    name = Column(String, nullable=True)
    object_id = Column(Integer, ForeignKey("objects.id"), nullable=True)


class SensorLogModel(Base):
    """
    ORM-модель для телеметрии и журнала событий датчиков.
    
    Особенности архитектуры:
    - На уровне базы данных таблица `sensor_logs` является СЕКЦИОНИРОВАННОЙ (партиционированной) по дате.
    - Фактический Primary Key в PostgreSQL на партиционированных таблицах должен включать ключ партиционирования.
    - Поле `id` помечено `primary_key=True` исключительно для корректной работы маппера SQLAlchemy ORM.
    """
    __tablename__ = "sensor_logs"

    id = Column(BigInteger, primary_key=True)
    channel_id = Column(Integer, nullable=False)
    event_date = Column(Date, nullable=False)
    event_time = Column(Time, nullable=False)
    is_alarm = Column(Boolean, default=False)
    sensor_value = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class PredictionModel(Base):
    """
    ORM-модель результатов предиктивной аналитики (ML-модуль).
    
    Служит для хранения прогнозов рисков и инцидентов на объектах/каналах.
    - `risk_score`: вероятность/оценка риска в диапазоне от 0.0 до 1.0.
    - `horizon_hours`: горизонт прогнозирования (например, риск аварии в ближайшие 24 часа).
    - `features_explanation`: JSON-поле с интерпретацией факторов риска (SHAP values / Feature Importance) 
      для отображения понятной аналитики пользователю.
    """
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=True)
    object_id = Column(Integer, ForeignKey("objects.id"), nullable=True)
    risk_type = Column(String(100), nullable=False)
    risk_score = Column(Float, nullable=False)
    horizon_hours = Column(Integer, nullable=False, default=24)
    features_explanation = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default="new")
    created_at = Column(DateTime, server_default=func.now())