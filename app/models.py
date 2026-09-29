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
    Table,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base


# Таблицы для связи многие-ко-многим (Пользователи-Роли и Роли-Права)

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class PermissionModel(Base):
    """
    ORM-модель для атомарных прав доступа (например, 'users:create', 'roles:manage').
    """
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    # Обратная связь с ролями
    roles = relationship("RoleModel", secondary=role_permissions, back_populates="permissions")


class RoleModel(Base):
    """
    ORM-модель для ролей (групп) пользователей.
    Обеспечивает гибкость настройки модуля ПД (прав доступа).
    """
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    # Права, привязанные к роли
    permissions = relationship("PermissionModel", secondary=role_permissions, back_populates="roles", lazy="selectin")

    
    # Пользователи с данной ролью
    users = relationship("UserModel", secondary=user_roles, back_populates="roles")


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

    # Роли, назначенные пользователю (связь многие-ко-многим)
    # Позволяет подгружать роли при запросе пользователя, используя selectinload
    roles = relationship("RoleModel", secondary=user_roles, back_populates="users", lazy="selectin")


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
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)


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
    object_id = Column(Integer, ForeignKey("objects.id", ondelete="SET NULL"), nullable=True)


class SensorStateModel(Base):
    """
    Справочник состояний датчиков.
    """
    __tablename__ = "sensor_states"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    sensor_type = Column(String(150), nullable=False)
    state_set_id = Column(Integer, nullable=False)
    state_name = Column(String(255), nullable=False)
    is_alarm = Column(Boolean, nullable=False, default=False)
    
    __table_args__ = (
        UniqueConstraint("sensor_type", "state_set_id", "state_name", name="uq_sensor_state"),
    )


class SensorLogModel(Base):
    """
    ORM-модель для телеметрии и журнала событий датчиков.
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
    """
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    public_id = Column(String(50), unique=True, nullable=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=True)
    object_id = Column(Integer, ForeignKey("objects.id"), nullable=True)
    risk_type = Column(String(100), nullable=False)
    risk_score = Column(Float, nullable=False)
    horizon_hours = Column(Integer, nullable=False, default=24)
    model_name = Column(String(100), nullable=True)
    model_version = Column(String(50), nullable=True)
    inference_seconds = Column(Float, nullable=True)
    features_explanation = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime, server_default=func.now())


class IncidentModel(Base):
    """
    Журнал инцидентов.
    """
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    public_id = Column(String(50), unique=True, nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True)
    object_id = Column(Integer, ForeignKey("objects.id", ondelete="SET NULL"), nullable=True)
    channel_id = Column(Integer, ForeignKey("channels.id", ondelete="SET NULL"), nullable=True)
    incident_type = Column(String(100), nullable=False)
    probability = Column(Float, nullable=True)
    status = Column(String(50), nullable=False, default="info")
    occurred_at = Column(DateTime, nullable=False, server_default=func.now())
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())