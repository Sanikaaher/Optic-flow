from sqlalchemy import Column, Integer, String, Date, Float, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
import enum
import datetime
from database import Base

class OrderStatus(str, enum.Enum):
    PRESCRIBED = "Prescribed"
    SENT_TO_LAB = "Sent to Lab"
    READY = "Ready"
    DELIVERED = "Delivered"

class ReviewRemark(str, enum.Enum):
    ONE_MONTH = "1 month"
    THREE_MONTHS = "3 months"
    SIX_MONTHS = "6 months"
    ONE_YEAR = "1 year"

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    age = Column(Integer, nullable=True)
    phone = Column(String, nullable=False, unique=False, index=True) # Phone numbers shouldn't be strictly unique across different persons depending on family
    secondary_contact = Column(String, nullable=True)
    
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")

class Visit(Base):
    __tablename__ = "visits"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    date_of_visit = Column(Date, default=datetime.date.today)
    
    complaints = Column(String, nullable=True)
    history = Column(String, nullable=True)
    diagnosis = Column(String, nullable=True)
    previous_history = Column(String, nullable=True)
    
    right_sph = Column(String, nullable=True)
    right_cyl = Column(String, nullable=True)
    right_axis = Column(String, nullable=True)
    right_add = Column(String, nullable=True)
    right_va = Column(String, nullable=True)
    
    left_sph = Column(String, nullable=True)
    left_cyl = Column(String, nullable=True)
    left_axis = Column(String, nullable=True)
    left_add = Column(String, nullable=True)
    left_va = Column(String, nullable=True)
    
    total_pd = Column(String, nullable=True)
    seg_height = Column(String, nullable=True)
    
    frame_details = Column(String, nullable=True)
    lens_type = Column(String, nullable=True)
    coatings = Column(String, nullable=True)
    lens_brand = Column(String, nullable=True)
    lens_index = Column(String, nullable=True)
    
    total_amount = Column(Float, default=0.0)
    advance_paid = Column(Float, default=0.0)
    balance_due = Column(Float, default=0.0)
    payment_method = Column(String, nullable=True)
    delivery_date = Column(Date, nullable=True)
    
    order_status = Column(SQLEnum(OrderStatus), default=OrderStatus.PRESCRIBED)
    review_remark = Column(SQLEnum(ReviewRemark), nullable=True)
    
    patient = relationship("Patient", back_populates="visits")
