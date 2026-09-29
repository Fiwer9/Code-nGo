import pytest
from app.routers.equipment import normalize_sensor_type

def test_normalize_sensor_type():
    assert normalize_sensor_type("Датчик температуры", "Температурная подсистема") == "temperature"
    assert normalize_sensor_type("Датчик задымления", "") == "smoke"
    assert normalize_sensor_type("Анализатор газа", "Газовая подсистема") == "gas"
    assert normalize_sensor_type("Датчик движения", "Охрана") == "movement"
    assert normalize_sensor_type("Насос №3", "Водоотлив") == "pump"
    assert normalize_sensor_type("Вентилятор", "Вентиляция") == "fan"
    assert normalize_sensor_type("Неизвестно", "Прочее") == "unknown"

def test_boolean_conversion():
    # Симуляция логики из load_dataset.py
    def convert_bool(val: str) -> bool:
        return val.lower() in ('true', '1', 't', 'yes')

    assert convert_bool('true') is True
    assert convert_bool('False') is False
    assert convert_bool('1') is True
    assert convert_bool('0') is False
    assert convert_bool('yes') is True
    assert convert_bool('random') is False

def test_prediction_risk_score_to_probability():
    # Симуляция логики из routers/predictions.py
    risk_score = 0.925
    probability = int(risk_score * 100)
    assert probability == 92
