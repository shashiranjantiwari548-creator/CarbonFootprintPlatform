from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import auth, carbon, goals, leaderboard

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Carbon Footprint Platform API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(carbon.router)
app.include_router(goals.router)
app.include_router(leaderboard.router)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Carbon Footprint Platform API is active"}
