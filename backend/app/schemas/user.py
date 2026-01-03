# app/schemas/user.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserOut(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: str  # USER or ADMIN


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class AdminUserOut(BaseModel):
    id: int
    name: Optional[str] = None
    email: str
    role: str
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    is_blocked: bool
    is_active: bool

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_blocked: Optional[bool] = None
    is_active: Optional[bool] = None
