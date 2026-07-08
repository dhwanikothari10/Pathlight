from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.course import Course
from app.schemas.ai import NLSearchRequest, NLSearchResponse
from app.ai.nl_search.search_service import parse_nl_query_to_filters

router = APIRouter()


@router.post("/", response_model=NLSearchResponse)
def nl_search(payload: NLSearchRequest, db: Session = Depends(get_db)):
    filters = parse_nl_query_to_filters(payload.query)

    query = db.query(Course).filter(Course.is_published == 1)

    if filters.get("category"):
        query = query.filter(Course.category.ilike(f"%{filters['category']}%"))
    if filters.get("level"):
        query = query.filter(Course.level == filters["level"])
    if filters.get("min_price") is not None:
        query = query.filter(Course.price >= filters["min_price"])
    if filters.get("max_price") is not None:
        query = query.filter(Course.price <= filters["max_price"])
    if filters.get("keyword"):
        kw = filters["keyword"]
        query = query.filter(or_(Course.title.ilike(f"%{kw}%"), Course.description.ilike(f"%{kw}%")))

    results = query.all()
    results_dicts = [
        {"id": c.id, "title": c.title, "price": c.price, "level": c.level, "category": c.category}
        for c in results
    ]

    return NLSearchResponse(interpreted_filters=filters, results=results_dicts)
