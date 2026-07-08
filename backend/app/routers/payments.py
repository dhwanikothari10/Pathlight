"""
Stripe integration (test mode).

Flow:
1. Frontend calls POST /api/payments/create-checkout-session for a course.
2. We create a Stripe Checkout Session and return its URL.
3. Frontend redirects the browser to that URL.
4. After payment, Stripe calls our webhook -> we create the Enrollment record.

Setup:
    pip install stripe
    Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env
"""

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import require_student
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/create-checkout-session")
def create_checkout_session(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    existing = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == current_user.id, Enrollment.course_id == course_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": course.title},
                "unit_amount": int(course.price * 100),  # Stripe uses cents
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url="http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url="http://localhost:5173/payment-cancelled",
        metadata={"course_id": str(course_id), "student_id": str(current_user.id)},
    )
    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        course_id = int(session["metadata"]["course_id"])
        student_id = int(session["metadata"]["student_id"])

        existing = (
            db.query(Enrollment)
            .filter(Enrollment.student_id == student_id, Enrollment.course_id == course_id)
            .first()
        )
        if not existing:
            db.add(Enrollment(student_id=student_id, course_id=course_id))
            db.commit()

    return {"status": "success"}