from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.report import router as report_router

app = FastAPI(title="Thooimai AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(report_router, prefix="/api/v1", tags=["Reports"])

@app.get("/")
def health():
    return {"status": "ok", "service": "Thooimai AI API"}
