"""
FastAPI service for normalizing Hostaway reviews and enriching review text.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import re

app = FastAPI(title="Review Normalizer Service", version="1.0.0")


# ============================================================================
# Pydantic Models - Hostaway Raw Data
# ============================================================================

class HostawayRawCategory(BaseModel):
    """Raw category from Hostaway API"""
    category: str
    rating: float


class HostawayRawReview(BaseModel):
    """Raw review from Hostaway API"""
    id: int
    type: str
    status: str
    rating: Optional[float] = None
    publicReview: str
    reviewCategory: List[HostawayRawCategory] = Field(default_factory=list)
    submittedAt: str
    guestName: str
    listingName: str


class HostawayRawResponse(BaseModel):
    """Raw response from Hostaway API"""
    status: str
    result: List[HostawayRawReview]


# ============================================================================
# Pydantic Models - Normalized Data
# ============================================================================

class NormalizedCategory(BaseModel):
    """Normalized category with readable label"""
    key: str
    label: str
    rating: float


class NormalizedReview(BaseModel):
    """Normalized review with consistent format"""
    reviewId: str
    source: str = "hostaway"
    listingId: str
    listingName: str
    type: str
    status: str
    submittedAtISO: str
    guestName: str
    publicReview: str
    overallRating: Optional[float] = None
    categories: List[NormalizedCategory] = Field(default_factory=list)


# ============================================================================
# Pydantic Models - Request/Response
# ============================================================================

class NormalizeHostawayRequest(BaseModel):
    """Request body for normalize endpoint"""
    status: str
    result: List[HostawayRawReview]


class NormalizeHostawayResponse(BaseModel):
    """Response for normalize endpoint"""
    normalized: List[NormalizedReview]


class EnrichIssuesRequest(BaseModel):
    """Request body for enrich/issues endpoint"""
    text: str


class EnrichIssuesResponse(BaseModel):
    """Response for enrich/issues endpoint"""
    tags: List[str]


class HealthResponse(BaseModel):
    """Health check response"""
    ok: bool


# ============================================================================
# Utility Functions
# ============================================================================

def slugify(input_str: str) -> str:
    """
    Convert a string to a URL-friendly slug.
    Lowercase, trim, spaces to hyphens, remove non-alphanumeric except hyphen.
    """
    slug = input_str.lower().strip()
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug


def parse_hostaway_submitted_at(s: str) -> str:
    """
    Parse Hostaway timestamp format 'YYYY-MM-DD HH:mm:ss' to ISO string.
    Treats input as UTC to avoid timezone surprises.
    
    Args:
        s: Timestamp string in format 'YYYY-MM-DD HH:mm:ss'
    
    Returns:
        ISO 8601 formatted string with UTC timezone
    
    Raises:
        ValueError: If the input format is invalid or date is invalid
    """
    if not s or not isinstance(s, str):
        raise ValueError("Invalid input: expected a non-empty string")
    
    # Validate format: YYYY-MM-DD HH:mm:ss
    pattern = r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'
    if not re.match(pattern, s):
        raise ValueError(f"Invalid date format: expected 'YYYY-MM-DD HH:mm:ss', got '{s}'")
    
    try:
        # Parse as UTC by adding 'Z' suffix after replacing space with 'T'
        iso_str = s.replace(' ', 'T') + 'Z'
        # Validate by parsing
        dt = datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
        return dt.isoformat().replace('+00:00', 'Z')
    except ValueError as e:
        raise ValueError(f"Invalid date: '{s}' does not represent a valid date - {str(e)}")


def category_key_to_label(key: str) -> str:
    """
    Convert category key to readable label.
    Example: 'respect_house_rules' -> 'Respect house rules'
    
    Args:
        key: Category key with underscores
    
    Returns:
        Title-cased label with first word capitalized
    """
    words = key.split('_')
    if not words:
        return key
    
    # Capitalize first word, lowercase the rest
    label = words[0].capitalize() + ' ' + ' '.join(words[1:]) if len(words) > 1 else words[0].capitalize()
    return label


def calculate_overall_rating(rating: Optional[float], categories: List[HostawayRawCategory]) -> Optional[float]:
    """
    Calculate overall rating based on available data.
    
    Rules:
    1. If rating is provided and not null, use it
    2. Else if categories exist, calculate average of category ratings
    3. Else return None
    
    Args:
        rating: Direct overall rating from review
        categories: List of category ratings
    
    Returns:
        Overall rating or None
    """
    if rating is not None:
        return rating
    
    if categories and len(categories) > 0:
        total = sum(cat.rating for cat in categories)
        return round(total / len(categories), 2)
    
    return None


def extract_issue_tags(text: str) -> List[str]:
    """
    Extract issue tags from review text using keyword matching.
    
    Tags detected:
    - wifi: wifi, internet, connection, online
    - noise: noise, noisy, loud, quiet
    - cleanliness: clean, dirty, mess, hygiene, sanitation
    - check-in: check-in, check in, arrival, key, lock
    - heating: heat, heating, cold, warm, temperature, ac, air conditioning
    - communication: communication, respond, reply, contact, message
    
    Args:
        text: Review text to analyze
    
    Returns:
        List of detected tags
    """
    text_lower = text.lower()
    tags = []
    
    # Define keyword patterns for each tag
    tag_keywords = {
        'wifi': ['wifi', 'wi-fi', 'internet', 'connection', 'online'],
        'noise': ['noise', 'noisy', 'loud', 'quiet', 'sound'],
        'cleanliness': ['clean', 'dirty', 'mess', 'hygiene', 'sanitation', 'filth'],
        'check-in': ['check-in', 'check in', 'checkin', 'arrival', 'key', 'lock', 'entry'],
        'heating': ['heat', 'heating', 'cold', 'warm', 'temperature', 'ac', 'air conditioning', 'aircon'],
        'communication': ['communication', 'respond', 'reply', 'contact', 'message', 'reach'],
    }
    
    for tag, keywords in tag_keywords.items():
        if any(keyword in text_lower for keyword in keywords):
            tags.append(tag)
    
    return tags


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint to verify service is running.
    """
    return HealthResponse(ok=True)


@app.post("/normalize/hostaway", response_model=NormalizeHostawayResponse)
async def normalize_hostaway(request: NormalizeHostawayRequest) -> NormalizeHostawayResponse:
    """
    Normalize Hostaway raw review data to standardized format.
    
    Transformations:
    - reviewId: prefixed with 'hostaway:{id}'
    - listingId: slugified listingName
    - submittedAt: converted from 'YYYY-MM-DD HH:mm:ss' to ISO string (UTC)
    - overallRating: uses rating if available, else average of categories, else None
    - categories: key preserved, label converted to readable format
    
    Args:
        request: Hostaway raw response data
    
    Returns:
        Normalized reviews
    
    Raises:
        HTTPException: If data validation or transformation fails
    """
    try:
        normalized_reviews = []
        
        for raw_review in request.result:
            # Parse submitted date
            try:
                submitted_iso = parse_hostaway_submitted_at(raw_review.submittedAt)
            except ValueError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid submittedAt format for review {raw_review.id}: {str(e)}"
                )
            
            # Generate listingId from listingName
            listing_id = slugify(raw_review.listingName)
            if not listing_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid listingName for review {raw_review.id}: cannot create valid slug"
                )
            
            # Calculate overall rating
            overall_rating = calculate_overall_rating(raw_review.rating, raw_review.reviewCategory)
            
            # Normalize categories
            normalized_categories = [
                NormalizedCategory(
                    key=cat.category,
                    label=category_key_to_label(cat.category),
                    rating=cat.rating
                )
                for cat in raw_review.reviewCategory
            ]
            
            # Create normalized review
            normalized = NormalizedReview(
                reviewId=f"hostaway:{raw_review.id}",
                source="hostaway",
                listingId=listing_id,
                listingName=raw_review.listingName,
                type=raw_review.type,
                status=raw_review.status,
                submittedAtISO=submitted_iso,
                guestName=raw_review.guestName,
                publicReview=raw_review.publicReview,
                overallRating=overall_rating,
                categories=normalized_categories
            )
            
            normalized_reviews.append(normalized)
        
        return NormalizeHostawayResponse(normalized=normalized_reviews)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error normalizing reviews: {str(e)}"
        )


@app.post("/enrich/issues", response_model=EnrichIssuesResponse)
async def enrich_issues(request: EnrichIssuesRequest) -> EnrichIssuesResponse:
    """
    Enrich review text by extracting issue tags based on keyword matching.
    
    Detected tags:
    - wifi: Internet connectivity issues
    - noise: Noise-related complaints
    - cleanliness: Cleanliness concerns
    - check-in: Check-in/access issues
    - heating: Temperature/climate control issues
    - communication: Host communication problems
    
    Args:
        request: Review text to analyze
    
    Returns:
        List of detected issue tags
    """
    try:
        tags = extract_issue_tags(request.text)
        return EnrichIssuesResponse(tags=tags)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting tags: {str(e)}"
        )


# ============================================================================
# Lambda Handler
# ============================================================================
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except ImportError:
    handler = None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
