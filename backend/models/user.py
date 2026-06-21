from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    dietary_preference = Column(String, default="average") # vegan, vegetarian, pescatarian, average, heavy_meat
    travel_preference = Column(String, default="car") # car, public_transit, electric_car, active (walk/bike)
    badges = Column(String, default="") # comma-separated list of badges, e.g. "eco_newbie,commute_champ"
    created_at = Column(DateTime, default=datetime.utcnow)
