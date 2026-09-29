import os
import csv
import logging
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Загрузка переменных окружения из .env файла
load_dotenv()

def get_sync_connection():
    db_url = os.getenv("SYNC_DATABASE_URL")
    if not db_url:
        # Пытаемся сформировать из отдельных переменных
        db_user = os.getenv("POSTGRES_USER", "postgres")
        db_pass = os.getenv("POSTGRES_PASSWORD", "postgrespassword")
        db_host = os.getenv("POSTGRES_HOST", "localhost")
        db_port = os.getenv("POSTGRES_PORT", "5432")
        db_name = os.getenv("POSTGRES_DB", "moscollector")
        db_url = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

    if db_url.startswith("postgresql+asyncpg://") or db_url.startswith("postgresql+psycopg2://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
        db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")
    
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = False
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to db: {e}")
        return None

def load_objects(conn, filepath):
    logger.info(f"Loading objects from {filepath}")
    if not os.path.exists(filepath):
        logger.error(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        data = []
        for row in reader:
            data.append((
                int(row['ид_объект']),
                int(row['иерархия_уровень']) if row['иерархия_уровень'] else None,
                int(row['родитель']) if row['родитель'] else None,
                row['вид_объекта'],
                row['диспетчерское_название_объекта']
            ))
        
        query = """
        INSERT INTO objects (id, hierarchy_level, parent_id, object_type, disp_name)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            hierarchy_level = EXCLUDED.hierarchy_level,
            parent_id = EXCLUDED.parent_id,
            object_type = EXCLUDED.object_type,
            disp_name = EXCLUDED.disp_name;
        """
        with conn.cursor() as cur:
            execute_batch(cur, query, data)
        conn.commit()
        logger.info(f"Loaded {len(data)} objects.")

def load_channels(conn, filepath):
    logger.info(f"Loading channels from {filepath}")
    if not os.path.exists(filepath):
        logger.error(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        data = []
        for row in reader:
            data.append((
                int(row['ид_канала_данных']),
                row['тип_инж_системы'],
                row['тип_датчика'],
                row['тег_инженерной_системы'],
                row['название_датчика'],
                int(row['ид_объект']) if row['ид_объект'] else None
            ))
        
        query = """
        INSERT INTO channels (id, sys_type, sensor_type, tag, name, object_id)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            sys_type = EXCLUDED.sys_type,
            sensor_type = EXCLUDED.sensor_type,
            tag = EXCLUDED.tag,
            name = EXCLUDED.name,
            object_id = EXCLUDED.object_id;
        """
        with conn.cursor() as cur:
            execute_batch(cur, query, data)
        conn.commit()
        logger.info(f"Loaded {len(data)} channels.")

def load_sensor_states(conn, filepath):
    logger.info(f"Loading sensor states from {filepath}")
    if not os.path.exists(filepath):
        logger.error(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        data = []
        for row in reader:
            is_alarm = row['тревожное'].lower() in ('true', '1', 't', 'yes')
            data.append((
                row['тип_датчика'],
                int(row['ид_набор_состояний']),
                row['название_состояния'],
                is_alarm
            ))
            
        query = """
        INSERT INTO sensor_states (sensor_type, state_set_id, state_name, is_alarm)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (sensor_type, state_set_id, state_name) DO UPDATE SET
            is_alarm = EXCLUDED.is_alarm;
        """
        with conn.cursor() as cur:
            execute_batch(cur, query, data)
        conn.commit()
        logger.info(f"Loaded {len(data)} sensor states.")

class LogCSVWrapper:
    """Обертка над файлом для быстрой подмены значений booleans если нужно,
       но PostgreSQL сам отлично парсит true/false, так что просто пропускаем заголовок"""
    def __init__(self, f):
        self.f = f
        self.header = self.f.readline() # Пропуск заголовка
    def read(self, size):
        return self.f.read(size)

def load_sensor_logs(conn, filepath):
    logger.info(f"Loading sensor logs from {filepath} via COPY (streaming)")
    if not os.path.exists(filepath):
        logger.error(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        wrapper = LogCSVWrapper(f)
        query = "COPY sensor_logs (id, channel_id, event_date, event_time, is_alarm, sensor_value) FROM STDIN WITH CSV DELIMITER ','"
        with conn.cursor() as cur:
            try:
                cur.copy_expert(query, wrapper)
                logger.info(f"COPY command executed successfully. Rows inserted: {cur.rowcount}")
            except Exception as e:
                logger.error(f"Error during COPY: {e}")
                conn.rollback()
                return
        conn.commit()
        
def get_file_ignore_case(directory, prefix):
    files = [f for f in os.listdir(directory) if f.lower().startswith(prefix.lower())]
    if files:
        return os.path.join(directory, files[0])
    return None

def main():
    conn = get_sync_connection()
    if not conn:
        logger.error("Could not connect to DB.")
        return
        
    try:
        data_dir = os.environ.get("DATA_DIR", "data")
        if not os.path.exists(data_dir):
            if os.path.exists("/app/data"):
                data_dir = "/app/data"
            else:
                logger.error(f"Папка с данными не найдена: ни '{data_dir}', ни '/app/data'. Убедитесь, что смонтирован том ./data:/app/data или скопируйте файлы внутрь контейнера.")
                return

        objects_file = get_file_ignore_case(data_dir, 'справочник_объектов')
        channels_file = get_file_ignore_case(data_dir, 'справочник_каналов')
        states_file = get_file_ignore_case(data_dir, 'справочник_состояний')
        logs_file = get_file_ignore_case(data_dir, 'журнал_событий')
        
        if objects_file:
            load_objects(conn, objects_file)
        if channels_file:
            load_channels(conn, channels_file)
        if states_file:
            load_sensor_states(conn, states_file)
        if logs_file:
            # Очищаем перед загрузкой? 
            # Для демо оставим как есть, либо добавим TRUNCATE (лучше не удалять).
            # Так как id может дублироваться в CSV (нет ON CONFLICT в COPY),
            # мы рассчитываем на пустую таблицу или уникальные id в логах.
            # По заданию: "не падать из-за повторной загрузки справочников" (сделали upsert).
            # Для логов: "не ломать текущую загрузку через COPY". 
            # Если в логах дубли - COPY упадет на PK constraint, если он есть (но в партициях id - это PK, значит упадет).
            # В задаче не сказано делать upsert для логов, только "обязательно PostgreSQL COPY".
            load_sensor_logs(conn, logs_file)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
    finally:
        conn.close()

if __name__ == '__main__':
    main()
