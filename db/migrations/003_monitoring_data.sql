-- Миграция: Расширение схемы для мониторинга (хакатон ЛЦТ)

-- 1. Добавление колонок координат в objects
ALTER TABLE objects ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE objects ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Справочник состояний датчиков
CREATE TABLE IF NOT EXISTS sensor_states (
    id BIGSERIAL PRIMARY KEY,
    sensor_type VARCHAR(150) NOT NULL,
    state_set_id INT NOT NULL,
    state_name VARCHAR(255) NOT NULL,
    is_alarm BOOLEAN DEFAULT FALSE,
    UNIQUE(sensor_type, state_set_id, state_name)
);

-- 3. Расширение таблицы predictions
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS public_id VARCHAR(50);
-- Безопасное добавление уникального индекса
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'predictions_public_id_key') THEN
        ALTER TABLE predictions ADD CONSTRAINT predictions_public_id_key UNIQUE (public_id);
    END IF;
END $$;

ALTER TABLE predictions ADD COLUMN IF NOT EXISTS model_name VARCHAR(100);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS model_version VARCHAR(50);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS inference_seconds FLOAT;

-- Статус по умолчанию уже должен быть в схеме, но обновим на 'pending'
ALTER TABLE predictions ALTER COLUMN status SET DEFAULT 'pending';

-- 4. Журнал инцидентов
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    public_id VARCHAR(50) UNIQUE NOT NULL,
    prediction_id INT REFERENCES predictions(id) ON DELETE SET NULL,
    object_id INT REFERENCES objects(id) ON DELETE CASCADE,
    channel_id INT REFERENCES channels(id) ON DELETE CASCADE,
    incident_type VARCHAR(100) NOT NULL,
    probability FLOAT,
    status VARCHAR(50) DEFAULT 'info',
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_occurred_at ON incidents(occurred_at);
CREATE INDEX IF NOT EXISTS idx_incidents_object_id ON incidents(object_id);
CREATE INDEX IF NOT EXISTS idx_channels_object_id ON channels(object_id);
CREATE INDEX IF NOT EXISTS idx_objects_parent_id ON objects(parent_id);
