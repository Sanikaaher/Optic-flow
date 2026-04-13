import os
import secrets
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from typing import List
from urllib.parse import quote

import models
import schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

security = HTTPBasic()

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, os.getenv("APP_USER", "admin"))
    correct_password = secrets.compare_digest(credentials.password, os.getenv("APP_PASS", "admin"))
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

app = FastAPI(title="Optometry Clinic API", dependencies=[Depends(verify_credentials)])

# Ensure directories exist
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# --- Patient Endpoints ---
@app.post("/api/patients/", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db)):
    db_patient = models.Patient(**patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.get("/api/patients/", response_model=List[schemas.Patient])
def read_patients(skip: int = 0, limit: int = 100, search: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Patient)
    if search:
        query = query.filter(models.Patient.name.ilike(f"%{search}%") | models.Patient.phone.ilike(f"%{search}%"))
    patients = query.offset(skip).limit(limit).all()
    return patients

@app.get("/api/patients/{patient_id}", response_model=schemas.Patient)
def read_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.put("/api/patients/{patient_id}", response_model=schemas.Patient)
def update_patient(patient_id: int, patient_update: schemas.PatientCreate, db: Session = Depends(get_db)):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    for key, value in patient_update.model_dump().items():
        setattr(db_patient, key, value)
    
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(db_patient)
    db.commit()
    return {"ok": True}

# --- Visit Endpoints ---
@app.post("/api/visits/", response_model=schemas.Visit)
def create_visit(visit: schemas.VisitCreate, db: Session = Depends(get_db)):
    visit_data = visit.model_dump()
    visit_data['balance_due'] = visit_data.get('total_amount', 0.0) - visit_data.get('advance_paid', 0.0)
    
    # Validating patient existence
    db_patient = db.query(models.Patient).filter(models.Patient.id == visit.patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    db_visit = models.Visit(**visit_data)
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit

@app.get("/api/visits/{visit_id}", response_model=schemas.Visit)
def read_visit(visit_id: int, db: Session = Depends(get_db)):
    visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit

@app.put("/api/visits/{visit_id}", response_model=schemas.Visit)
def update_visit(visit_id: int, visit_update: schemas.VisitCreate, db: Session = Depends(get_db)):
    db_visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")
        
    visit_data = visit_update.model_dump()
    visit_data['balance_due'] = visit_data.get('total_amount', 0.0) - visit_data.get('advance_paid', 0.0)
    
    # Do not allow modifying patient_id easily via update, but if they pass it, handle it securely.
    # Usually patient_id is locked to the visit, let's allow it but check existence.
    db_patient = db.query(models.Patient).filter(models.Patient.id == visit_update.patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    for key, value in visit_data.items():
        setattr(db_visit, key, value)
        
    db.commit()
    db.refresh(db_visit)
    return db_visit

@app.delete("/api/visits/{visit_id}")
def delete_visit(visit_id: int, db: Session = Depends(get_db)):
    db_visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    db.delete(db_visit)
    db.commit()
    return {"ok": True}

# --- WhatsApp Bill Endpoint ---
@app.get("/api/visits/{visit_id}/whatsapp-bill")
def get_whatsapp_bill_url(visit_id: int, db: Session = Depends(get_db)):
    visit = db.query(models.Visit).filter(models.Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
        
    patient = visit.patient
    if not patient.phone:
        raise HTTPException(status_code=400, detail="Patient has no phone number")
        
    # Format message
    message = f"Hello {patient.name},\n\n"
    message += f"Here is your bill from the Optometry Clinic (Visit ID: {visit.id}).\n\n"
    message += f"*Total Amount:* {visit.total_amount}\n"
    message += f"*Advance Paid:* {visit.advance_paid}\n"
    message += f"*Balance Due:* {visit.balance_due}\n"
    
    if visit.delivery_date:
        message += f"\nExpected Delivery: {visit.delivery_date}\n"
    
    message += "\nThank you for choosing us!"
    
    # Format phone number - strip non-digits
    phone = ''.join(filter(str.isdigit, patient.phone))
    
    encoded_message = quote(message)
    wa_url = f"https://wa.me/{phone}?text={encoded_message}"
    
    return {"url": wa_url}
