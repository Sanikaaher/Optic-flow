from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date
from models import OrderStatus, ReviewRemark

class VisitBase(BaseModel):
    date_of_visit: date = date.today()
    complaints: Optional[str] = None
    history: Optional[str] = None
    diagnosis: Optional[str] = None
    previous_history: Optional[str] = None
    
    right_sph: Optional[str] = None
    right_cyl: Optional[str] = None
    right_axis: Optional[str] = None
    right_add: Optional[str] = None
    right_va: Optional[str] = None
    
    left_sph: Optional[str] = None
    left_cyl: Optional[str] = None
    left_axis: Optional[str] = None
    left_add: Optional[str] = None
    left_va: Optional[str] = None
    
    total_pd: Optional[str] = None
    seg_height: Optional[str] = None
    
    frame_details: Optional[str] = None
    lens_type: Optional[str] = None
    coatings: Optional[str] = None
    lens_brand: Optional[str] = None
    lens_index: Optional[str] = None
    
    total_amount: float = 0.0
    advance_paid: float = 0.0
    balance_due: float = 0.0
    payment_method: Optional[str] = None
    delivery_date: Optional[date] = None
    
    order_status: OrderStatus = OrderStatus.PRESCRIBED
    review_remark: Optional[ReviewRemark] = None

class VisitCreate(VisitBase):
    patient_id: int

class Visit(VisitBase):
    id: int
    patient_id: int
    
    model_config = ConfigDict(from_attributes=True)

class PatientBase(BaseModel):
    name: str
    age: Optional[int] = None
    phone: str
    secondary_contact: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    visits: List[Visit] = []
    
    model_config = ConfigDict(from_attributes=True)
