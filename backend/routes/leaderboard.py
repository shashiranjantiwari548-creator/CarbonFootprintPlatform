from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.carbon_record import CarbonRecord
from auth.jwt_handler import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

@router.get("")
def get_leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).all()
    leaderboard = []
    
    for u in users:
        records = db.query(CarbonRecord).filter(CarbonRecord.user_id == u.id).all()
        total_co2 = sum(r.co2_output for r in records)
        record_count = len(records)
        
        # Calculate/update badges dynamically
        user_badges = [b.strip() for b in u.badges.split(",") if b.strip()]
        
        # Default badge
        if not user_badges:
            user_badges = ["Eco Pioneer"]
            
        # 1. Carbon Saver: Logged at least 5 records
        if "Carbon Saver" not in user_badges and record_count >= 5:
            user_badges.append("Carbon Saver")
            
        # 2. Eco Warrior: total emissions under 100 kg and at least 3 records
        if "Eco Warrior" not in user_badges and record_count >= 3 and total_co2 < 100:
            user_badges.append("Eco Warrior")
            
        # 3. Commute Hero: at least 2 transport logs and transport emissions under 20 kg
        transport_records = [r for r in records if r.category == "transport"]
        transport_co2 = sum(r.co2_output for r in transport_records)
        if "Commute Hero" not in user_badges and len(transport_records) >= 2 and transport_co2 < 20:
            user_badges.append("Commute Hero")
            
        # 4. Dietary Champ: at least 3 food logs and food emissions under 10 kg
        food_records = [r for r in records if r.category == "food"]
        food_co2 = sum(r.co2_output for r in food_records)
        if "Dietary Champ" not in user_badges and len(food_records) >= 3 and food_co2 < 10:
            user_badges.append("Dietary Champ")
            
        # Save updated badges
        new_badges_str = ", ".join(user_badges)
        if u.badges != new_badges_str:
            u.badges = new_badges_str
            db.commit()
            
        leaderboard.append({
            "username": u.username,
            "total_co2": round(total_co2, 2),
            "record_count": record_count,
            "badges": user_badges
        })
        
    # Sort leaderboard: users with records first (sorted by lowest emissions), then users with no records.
    leaderboard.sort(key=lambda x: (0 if x["record_count"] > 0 else 1, x["total_co2"]))
    
    # Add rank index
    for idx, item in enumerate(leaderboard):
        item["rank"] = idx + 1
        
    return leaderboard
