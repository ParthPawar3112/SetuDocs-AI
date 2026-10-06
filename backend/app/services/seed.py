"""Idempotent seed service for the required initial Admin and Officer users,
plus one demo Citizen account for evaluation."""

from app.core.config import settings
from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.user import User

# Passwords come from DEMO_*_PASSWORD in backend/.env (see .env.example).
DEFAULT_USERS = (
    {"username": "admin", "password": settings.DEMO_ADMIN_PASSWORD, "role": "Admin"},
    {"username": "officer", "password": settings.DEMO_OFFICER_PASSWORD, "role": "Officer"},
)

# Demo Citizen account - a seeded demo credential, same convention as above.
# Created only if absent; never overwrites a real
# account. citizen_id is fixed so real sign-ups start at CIT-000002.
DEMO_CITIZEN = {
    "username": "citizen_demo",
    "password": settings.DEMO_CITIZEN_PASSWORD,
    "role": "Citizen",
    "full_name": "Demo Citizen",
    "citizen_id": "CIT-000001",
}


def seed_default_users() -> None:
    """Create the supplied accounts once without overwriting existing users."""
    db = SessionLocal()
    try:
        for user_data in DEFAULT_USERS:
            if db.query(User).filter(User.username == user_data["username"]).first() is None:
                db.add(
                    User(
                        username=user_data["username"],
                        password_hash=hash_password(user_data["password"]),
                        role=user_data["role"],
                    )
                )

        if db.query(User).filter(User.username == DEMO_CITIZEN["username"]).first() is None:
            db.add(
                User(
                    username=DEMO_CITIZEN["username"],
                    password_hash=hash_password(DEMO_CITIZEN["password"]),
                    role=DEMO_CITIZEN["role"],
                    full_name=DEMO_CITIZEN["full_name"],
                    citizen_id=DEMO_CITIZEN["citizen_id"],
                )
            )

        db.commit()
    finally:
        db.close()
