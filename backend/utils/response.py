"""
Standardized API response utilities
"""

from typing import Any, Dict, List, Optional, Union
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class APIResponse(BaseModel):
    """Standardized API response model"""
    success: bool
    message: str
    data: Optional[Any] = None
    errors: Optional[List[str]] = None
    meta: Optional[Dict[str, Any]] = None
    timestamp: datetime = datetime.now(timezone.utc)

class PaginatedResponse(APIResponse):
    """Paginated API response model"""
    pagination: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    """Standardized error response model"""
    success: bool = False
    message: str
    errors: List[str]
    error_code: Optional[str] = None
    timestamp: datetime = datetime.now(timezone.utc)

def success_response(
    data: Any = None,
    message: str = "Operation completed successfully",
    meta: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """
    Create a standardized success response
    
    Args:
        data: The response data
        message: Success message
        meta: Additional metadata
    
    Returns:
        JSONResponse with standardized format
    """
    response = APIResponse(
        success=True,
        message=message,
        data=data,
        meta=meta
    )
    
    return JSONResponse(
        status_code=200,
        content=response.model_dump()
    )

def created_response(
    data: Any = None,
    message: str = "Resource created successfully",
    meta: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """
    Create a standardized created response
    
    Args:
        data: The created resource data
        message: Success message
        meta: Additional metadata
    
    Returns:
        JSONResponse with standardized format
    """
    response = APIResponse(
        success=True,
        message=message,
        data=data,
        meta=meta
    )
    
    return JSONResponse(
        status_code=201,
        content=response.model_dump()
    )

def paginated_response(
    data: List[Any],
    total: int,
    page: int,
    per_page: int,
    message: str = "Data retrieved successfully",
    meta: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """
    Create a standardized paginated response
    
    Args:
        data: List of items
        total: Total number of items
        page: Current page number
        per_page: Items per page
        message: Success message
        meta: Additional metadata
    
    Returns:
        JSONResponse with standardized format
    """
    total_pages = (total + per_page - 1) // per_page
    
    pagination = {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }
    
    response = PaginatedResponse(
        success=True,
        message=message,
        data=data,
        pagination=pagination,
        meta=meta
    )
    
    return JSONResponse(
        status_code=200,
        content=response.model_dump()
    )

def error_response(
    message: str,
    errors: Optional[List[str]] = None,
    status_code: int = 400,
    error_code: Optional[str] = None
) -> JSONResponse:
    """
    Create a standardized error response
    
    Args:
        message: Error message
        errors: List of specific errors
        status_code: HTTP status code
        error_code: Application-specific error code
    
    Returns:
        JSONResponse with standardized format
    """
    if errors is None:
        errors = [message]
    
    response = ErrorResponse(
        message=message,
        errors=errors,
        error_code=error_code
    )
    
    logger.error(f"API Error: {message}", extra={
        "errors": errors,
        "error_code": error_code,
        "status_code": status_code
    })
    
    return JSONResponse(
        status_code=status_code,
        content=response.model_dump()
    )

def not_found_response(
    resource: str = "Resource",
    resource_id: Optional[str] = None
) -> JSONResponse:
    """
    Create a standardized not found response
    
    Args:
        resource: Type of resource not found
        resource_id: ID of the resource not found
    
    Returns:
        JSONResponse with standardized format
    """
    message = f"{resource} not found"
    if resource_id:
        message += f" with ID: {resource_id}"
    
    return error_response(
        message=message,
        status_code=404,
        error_code="RESOURCE_NOT_FOUND"
    )

def validation_error_response(
    errors: List[str],
    message: str = "Validation failed"
) -> JSONResponse:
    """
    Create a standardized validation error response
    
    Args:
        errors: List of validation errors
        message: General error message
    
    Returns:
        JSONResponse with standardized format
    """
    return error_response(
        message=message,
        errors=errors,
        status_code=422,
        error_code="VALIDATION_ERROR"
    )

def unauthorized_response(
    message: str = "Authentication required"
) -> JSONResponse:
    """
    Create a standardized unauthorized response
    
    Args:
        message: Error message
    
    Returns:
        JSONResponse with standardized format
    """
    return error_response(
        message=message,
        status_code=401,
        error_code="UNAUTHORIZED"
    )

def forbidden_response(
    message: str = "Insufficient permissions"
) -> JSONResponse:
    """
    Create a standardized forbidden response
    
    Args:
        message: Error message
    
    Returns:
        JSONResponse with standardized format
    """
    return error_response(
        message=message,
        status_code=403,
        error_code="FORBIDDEN"
    )

def conflict_response(
    message: str = "Resource conflict",
    error_code: str = "CONFLICT"
) -> JSONResponse:
    """
    Create a standardized conflict response
    
    Args:
        message: Error message
        error_code: Application-specific error code
    
    Returns:
        JSONResponse with standardized format
    """
    return error_response(
        message=message,
        status_code=409,
        error_code=error_code
    )

def server_error_response(
    message: str = "Internal server error",
    error_code: str = "INTERNAL_ERROR"
) -> JSONResponse:
    """
    Create a standardized server error response
    
    Args:
        message: Error message
        error_code: Application-specific error code
    
    Returns:
        JSONResponse with standardized format
    """
    return error_response(
        message=message,
        status_code=500,
        error_code=error_code
    )

# Exception handlers
def handle_validation_error(exc: Exception) -> JSONResponse:
    """Handle validation errors"""
    errors = []
    if hasattr(exc, 'errors'):
        for error in exc.errors():
            field = '.'.join(str(x) for x in error['loc'])
            errors.append(f"{field}: {error['msg']}")
    else:
        errors.append(str(exc))
    
    return validation_error_response(errors)

def handle_not_found_error(resource: str, resource_id: str = None) -> JSONResponse:
    """Handle not found errors"""
    return not_found_response(resource, resource_id)

def handle_unauthorized_error(message: str = None) -> JSONResponse:
    """Handle unauthorized errors"""
    return unauthorized_response(message or "Authentication required")

def handle_forbidden_error(message: str = None) -> JSONResponse:
    """Handle forbidden errors"""
    return forbidden_response(message or "Insufficient permissions")

# Utility functions for common response patterns
def with_meta(data: Any, **meta) -> Dict[str, Any]:
    """Add metadata to response data"""
    return {
        "data": data,
        "meta": meta
    }

def paginate_query(query, page: int, per_page: int):
    """Paginate a SQLAlchemy query"""
    offset = (page - 1) * per_page
    return query.offset(offset).limit(per_page)

def calculate_pagination_meta(total: int, page: int, per_page: int) -> Dict[str, Any]:
    """Calculate pagination metadata"""
    total_pages = (total + per_page - 1) // per_page
    
    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }
