CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Пользователи веб-сервиса.
-- В password_hash хранится только Argon2id encoded hash. Внутри этой строки
-- уже находятся параметры Argon2, уникальная случайная SALT и собственно hash.
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    login VARCHAR(64) NOT NULL,
    password_hash TEXT NOT NULL,
    surname VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    gender VARCHAR(16) NOT NULL DEFAULT 'unspecified',
    jobtitle VARCHAR(150) NOT NULL,
    mobile_number VARCHAR(32),
    email VARCHAR(320) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_login_length
        CHECK (char_length(login) BETWEEN 3 AND 64),
    CONSTRAINT chk_users_gender
        CHECK (gender IN ('male', 'female', 'unspecified')),
    CONSTRAINT chk_users_password_hash_argon2id
        CHECK (password_hash LIKE '$argon2id$%')
);

-- Case-insensitive uniqueness for login/email.
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_login_lower
    ON users ((lower(login)));

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_lower
    ON users ((lower(email)));

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_mobile_number
    ON users (mobile_number)
    WHERE mobile_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_users_surname_name
    ON users (surname, name);

COMMENT ON COLUMN users.password_hash IS
'Argon2id encoded hash; unique random salt is embedded into the encoded value';

-- 2. Справочник объектов
CREATE TABLE IF NOT EXISTS objects (
    id INT PRIMARY KEY,
    hierarchy_level INT,
    parent_id INT,
    object_type VARCHAR(100),
    disp_name VARCHAR(255),
    geometry GEOMETRY(Geometry, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Справочник каналов датчиков
CREATE TABLE IF NOT EXISTS channels (
    id INT PRIMARY KEY,
    sys_type VARCHAR(150),
    sensor_type VARCHAR(150),
    tag VARCHAR(255),
    name VARCHAR(255),
    object_id INT REFERENCES objects(id) ON DELETE SET NULL
);

-- 4. Партиционированный журнал событий (под файл 1.3 ГБ)
CREATE TABLE IF NOT EXISTS sensor_logs (
    id BIGINT NOT NULL,
    channel_id INT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    is_alarm BOOLEAN DEFAULT FALSE,
    sensor_value VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (event_date);

CREATE TABLE IF NOT EXISTS sensor_logs_2026 PARTITION OF sensor_logs
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE INDEX IF NOT EXISTS idx_sensor_logs_2026_channel_time
    ON sensor_logs_2026(channel_id, event_date, event_time);

-- 5. Прогнозы ML
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    channel_id INT REFERENCES channels(id),
    object_id INT REFERENCES objects(id),
    risk_type VARCHAR(100) NOT NULL,
    risk_score FLOAT NOT NULL,
    horizon_hours INT DEFAULT 24,
    features_explanation JSONB,
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Модуль прав доступа (RBAC)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Инициализация базовых прав и ролей
INSERT INTO permissions (name, description) VALUES 
('users:create', 'Создание пользователей'),
('users:read', 'Просмотр пользователей'),
('users:manage_roles', 'Назначение ролей'),
('roles:read', 'Просмотр ролей'),
('roles:manage', 'Управление ролями'),
('objects:read', 'Просмотр объектов'),
('predictions:read', 'Просмотр прогнозов ML')
ON CONFLICT DO NOTHING;

INSERT INTO roles (name, description) VALUES 
('Administrator', 'Полный доступ (все действия)'),
('City Dispatcher', 'Диспетчер города'),
('District Dispatcher', 'Диспетчер района (Инженер района)')
ON CONFLICT DO NOTHING;

-- Администратору даем все права (хотя в коде он обходит проверку, для порядка добавим)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'Administrator'
ON CONFLICT DO NOTHING;

