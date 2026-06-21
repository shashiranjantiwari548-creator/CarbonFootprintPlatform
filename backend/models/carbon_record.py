from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from database import Base

class CarbonRecord(Base):
    __tablename__ = "carbon_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False) # transport, energy, food, shopping
    activity = Column(String, nullable=False) # e.g. petrol_car, flight, beef, electricity
    value = Column(Float, nullable=False) # numerical value
    unit = Column(String, nullable=False) # e.g., miles, kWh, servings, USD
    co2_output = Column(Float, nullable=False) # calculated emissions in kg CO2e
    date = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)
