from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime
from database import get_db
from models.user import User
from models.goal import Goal
from models.carbon_record import CarbonRecord
from auth.jwt_handler import get_current_user

router = APIRouter(prefix="/api/goals", tags=["goals"])

class GoalCreate(BaseModel):
    category: str
    target_reduction: float # target limit (cap) in kg CO2e
    end_date: datetime

class GoalResponse(BaseModel):
    id: int
    category: str
    target_reduction: float
    start_date: datetime
    end_date: datetime
    status: str
    current_emissions: float

    class Config:
        from_attributes = True

@router.post("", response_model=GoalResponse)
def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Set status to active by default
    new_goal = Goal(
        user_id=current_user.id,
        category=goal_data.category.lower(),
        target_reduction=goal_data.target_reduction,
        end_date=goal_data.end_date,
        status="active",
        start_date=datetime.utcnow()
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    
    return GoalResponse(
        id=new_goal.id,
        category=new_goal.category,
        target_reduction=new_goal.target_reduction,
        start_date=new_goal.start_date,
        end_date=new_goal.end_date,
        status=new_goal.status,
        current_emissions=0.0
    )

@router.get("", response_model=List[GoalResponse])
def list_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    response = []
    
    for g in goals:
        # Calculate emissions in category since start_date
        query = db.query(CarbonRecord).filter(
            CarbonRecord.user_id == current_user.id,
            CarbonRecord.date >= g.start_date,
            CarbonRecord.date <= g.end_date
        )
        if g.category != "total":
            query = query.filter(CarbonRecord.category == g.category)
            
        records = query.all()
        current_emissions = sum(r.co2_output for r in records)
        
        # Check if expired
        status_val = g.status
        if g.status == "active" and datetime.utcnow() > g.end_date:
            if current_emissions <= g.target_reduction:
                status_val = "completed"
            else:
                status_val = "failed"
            g.status = status_val
            db.commit()
            
        response.append(GoalResponse(
            id=g.id,
            category=g.category,
            target_reduction=g.target_reduction,
            start_date=g.start_date,
            end_date=g.end_date,
            status=status_val,
            current_emissions=round(current_emissions, 2)
        ))
    return response

@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
        
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully"}
