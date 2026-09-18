import os
import psycopg2

# Подключение через синхронный драйвер psycopg2 для вызова PostgreSQL COPY
DB_URL = os.getenv(
    "SYNC_DATABASE_URL", 
    "postgresql://postgres:postgrespassword@localhost:5432/moscollector"
)
CSV_PATH = "data/ext-journal-2026.csv"

def fast_copy_import():


    print(f"Импорт {CSV_PATH} в БД...")
    
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()

        copy_query = """
        COPY sensor_logs(id, channel_id, event_date, event_time, is_alarm, sensor_value)
        FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',');
        """

        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            cursor.copy_expert(sql=copy_query, file=f)

        conn.commit()
        cursor.close()
        conn.close()
        print("Ok")
        
    except Exception as e:
        print(f"{e}")

if __name__ == "__main__":
    fast_copy_import()