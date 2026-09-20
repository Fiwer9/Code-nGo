import os
import psycopg2

# Строка подключения к базе данных через синхронный драйвер psycopg2.
# Синхронное подключение используется специально для вызова метода copy_expert(),
# так как операция PostgreSQL COPY обеспечивает наивысшую скорость массовой вставки (Bulk Insert).
DB_URL = os.getenv(
    "SYNC_DATABASE_URL", 
    "postgresql://postgres:postgrespassword@localhost:5432/moscollector"
)

# Относительный путь к локальному CSV-файлу с логами датчиков (объем > 1.3 ГБ)
CSV_PATH = "data/ext-journal-2026.csv"


def fast_copy_import() -> None:
    """
    Выполняет потоковый импорт большого CSV-файла в PostgreSQL через команду COPY.
    
    Почему используется COPY вместо ORM/INSERT:
    1. Обходит накладные расходы SQLAlchemy ORM (создание Python-объектов).
    2. Выполняет прямую бинарную/текстовую запись в таблицы PostgreSQL.
    3. Читает файл по мере передачи через STDIN, благодаря чему память (RAM) не переполняется.
    """
    # Проверка наличия файла перед стартом
    if not os.path.exists(CSV_PATH):
        print(f"❌ Файл {CSV_PATH} не найден! Убедитесь, что поместили файл датасета в папку data/")
        return

    print(f"🚀 Начинаем высокоскоростной импорт {CSV_PATH} в базу данных...")
    
    try:
        # Установка синхронного соединения с PostgreSQL
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()

        # SQL-команда COPY с явным указанием порядка колонок и параметров CSV
        copy_query = """
        COPY sensor_logs(id, channel_id, event_date, event_time, is_alarm, sensor_value)
        FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',');
        """

        # Открытие файла и потоковая передача дескриптора в psycopg2
        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            cursor.copy_expert(sql=copy_query, file=f)

        # Подтверждение транзакции и освобождение ресурсов
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Потоковая загрузка логов датчиков завершена успешно!")
        
    except Exception as e:
        print(f"❌ Ошибка при импорте данных через COPY: {e}")


if __name__ == "__main__":
    fast_copy_import()