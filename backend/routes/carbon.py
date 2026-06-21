from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from models.user import User
from models.carbon_record import CarbonRecord
from auth.jwt_handler import get_current_user
from services.carbon_calculator import calculate_emission
from services.ai_recommendation import generate_recommendations
from services.pdf_report import generate_pdf_report

router = APIRouter(prefix="/api/carbon", tags=["carbon"])

class CarbonLogCreate(BaseModel):
    category: str
    activity: str
    value: float
    unit: str
    notes: Optional[str] = None

class CarbonRecordResponse(BaseModel):
    id: int
    category: str
    activity: str
    value: float
    unit: str
    co2_output: float
    date: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class CarbonSummary(BaseModel):
    total_co2: float
    by_category: dict
    recent_records: List[CarbonRecordResponse]

@router.post("/log", response_model=CarbonRecordResponse)
def log_emission(
    log_data: CarbonLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    co2 = calculate_emission(log_data.category, log_data.activity, log_data.value)
    
    new_record = CarbonRecord(
        user_id=current_user.id,
        category=log_data.category,
        activity=log_data.activity,
        value=log_data.value,
        unit=log_data.unit,
        co2_output=co2,
        notes=log_data.notes,
        date=datetime.utcnow()
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record

@router.get("/logs", response_model=List[CarbonRecordResponse])
def get_logs(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(CarbonRecord).filter(CarbonRecord.user_id == current_user.id)
    if category:
        query = query.filter(CarbonRecord.category == category)
    return query.order_by(CarbonRecord.date.desc()).all()

@router.get("/summary", response_model=CarbonSummary)
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    records = db.query(CarbonRecord).filter(CarbonRecord.user_id == current_user.id).all()
    
    total_co2 = sum(r.co2_output for r in records)
    by_category = {
        "transport": 0.0,
        "energy": 0.0,
        "food": 0.0,
        "shopping": 0.0
    }
    for r in records:
        if r.category in by_category:
            by_category[r.category] += r.co2_output
            
    # Round categories
    for cat in by_category:
        by_category[cat] = round(by_category[cat], 2)
        
    recent = db.query(CarbonRecord).filter(CarbonRecord.user_id == current_user.id).order_by(CarbonRecord.date.desc()).limit(5).all()
    
    return {
        "total_co2": round(total_co2, 2),
        "by_category": by_category,
        "recent_records": recent
    }

@router.delete("/logs/{record_id}")
def delete_log(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = db.query(CarbonRecord).filter(
        CarbonRecord.id == record_id, 
        CarbonRecord.user_id == current_user.id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Carbon record not found"
        )
        
    db.delete(record)
    db.commit()
    return {"message": "Record deleted successfully"}

@router.get("/recommendations")
def get_tips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return generate_recommendations(current_user, db)

@router.get("/report")
def get_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pdf_buffer = generate_pdf_report(current_user, db)
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename={current_user.username}_carbon_report.pdf"}
    )
