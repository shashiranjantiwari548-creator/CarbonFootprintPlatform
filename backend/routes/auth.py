from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models.user import User
from auth.password_hash import hash_password, verify_password
from auth.jwt_handler import create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str

class UserProfileUpdate(BaseModel):
    dietary_preference: str
    travel_preference: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    dietary_preference: str
    travel_preference: str
    badges: str
    
    class Config:
        from_attributes = True

@router.post("/register", response_model=UserResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if username exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    hashed = hash_password(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed,
        badges="Eco Pioneer" # Default badge
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
        
    token = create_access_token({"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserProfileUpdate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.dietary_preference = profile_data.dietary_preference
    current_user.travel_preference = profile_data.travel_preference
    db.commit()
    db.refresh(current_user)
    return current_user
