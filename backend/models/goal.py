from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from database import Base

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False) # transport, energy, food, shopping, total
    target_reduction = Column(Float, nullable=False) # target reduction in kg CO2e
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=False)
    status = Column(String, default="active") # active, completed, failed
