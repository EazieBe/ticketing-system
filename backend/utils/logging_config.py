"""
Comprehensive logging configuration for the backend
"""

import logging
import logging.config
import sys
from datetime import datetime, timezone
from typing import Dict, Any
import json
import os

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process_id": record.process,
            "thread_id": record.thread,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "lineno", "funcName", "created",
                "msecs", "relativeCreated", "thread", "threadName",
                "processName", "process", "getMessage", "exc_info",
                "exc_text", "stack_info"
            }:
                log_entry[key] = value
        
        return json.dumps(log_entry, default=str)

class RequestLoggingFilter(logging.Filter):
    """Filter to add request context to log records"""
    
    def filter(self, record: logging.LogRecord) -> bool:
        # Add request context if available
        if hasattr(record, 'request_id'):
            record.request_id = getattr(record, 'request_id', 'unknown')
        if hasattr(record, 'user_id'):
            record.user_id = getattr(record, 'user_id', 'anonymous')
        if hasattr(record, 'ip_address'):
            record.ip_address = getattr(record, 'ip_address', 'unknown')
        
        return True

def get_logging_config(environment: str = "development") -> Dict[str, Any]:
    """
    Get logging configuration based on environment
    
    Args:
        environment: Environment name (development, staging, production)
    
    Returns:
        Logging configuration dictionary
    """
    
    # Base configuration
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            },
            "detailed": {
                "format": "%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(funcName)s(): %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            },
            "json": {
                "()": JSONFormatter,
            }
        },
        "filters": {
            "request_context": {
                "()": RequestLoggingFilter,
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": "INFO",
                "formatter": "standard",
                "stream": sys.stdout,
                "filters": ["request_context"]
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "INFO",
                "formatter": "detailed",
                "filename": "logs/app.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "filters": ["request_context"]
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "detailed",
                "filename": "logs/error.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "filters": ["request_context"]
            }
        },
        "loggers": {
            "": {  # Root logger
                "level": "INFO",
                "handlers": ["console", "file", "error_file"],
                "propagate": False
            },
            "app": {
                "level": "DEBUG",
                "handlers": ["console", "file", "error_file"],
                "propagate": False
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["file"],
                "propagate": False
            },
            "sqlalchemy.engine": {
                "level": "WARNING",
                "handlers": ["file"],
                "propagate": False
            },
            "sqlalchemy.pool": {
                "level": "WARNING",
                "handlers": ["file"],
                "propagate": False
            }
        }
    }
    
    # Environment-specific modifications
    if environment == "production":
        # Production: Use JSON logging, higher log levels
        config["handlers"]["console"]["formatter"] = "json"
        config["handlers"]["file"]["formatter"] = "json"
        config["handlers"]["error_file"]["formatter"] = "json"
        
        # Reduce log levels for production
        config["loggers"][""]["level"] = "WARNING"
        config["loggers"]["app"]["level"] = "INFO"
        config["loggers"]["uvicorn"]["level"] = "WARNING"
        
        # Add structured logging handler
        config["handlers"]["structured"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "INFO",
            "formatter": "json",
            "filename": "logs/structured.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 10,
            "filters": ["request_context"]
        }
        
        # Add structured handler to app logger
        config["loggers"]["app"]["handlers"].append("structured")
        
    elif environment == "staging":
        # Staging: Use detailed logging, moderate log levels
        config["loggers"][""]["level"] = "INFO"
        config["loggers"]["app"]["level"] = "DEBUG"
        
    else:  # development
        # Development: Use detailed logging, lower log levels
        config["loggers"][""]["level"] = "DEBUG"
        config["loggers"]["app"]["level"] = "DEBUG"
        config["loggers"]["uvicorn"]["level"] = "DEBUG"
        
        # Add debug file handler
        config["handlers"]["debug_file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "formatter": "detailed",
            "filename": "logs/debug.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 3,
            "filters": ["request_context"]
        }
        
        # Add debug handler to app logger
        config["loggers"]["app"]["handlers"].append("debug_file")
    
    return config

def setup_logging(environment: str = None):
    """
    Setup logging configuration
    
    Args:
        environment: Environment name (defaults to NODE_ENV or 'development')
    """
    if environment is None:
        environment = os.getenv("NODE_ENV", "development")
    
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Get and apply logging configuration
    config = get_logging_config(environment)
    logging.config.dictConfig(config)
    
    # Log the setup
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured for environment: {environment}")

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name
    
    Args:
        name: Logger name
    
    Returns:
        Logger instance
    """
    return logging.getLogger(name)

# Context managers for request logging
class RequestLoggingContext:
    """Context manager for request logging"""
    
    def __init__(self, request_id: str, user_id: str = None, ip_address: str = None):
        self.request_id = request_id
        self.user_id = user_id
        self.ip_address = ip_address
        self.logger = logging.getLogger("app.request")
    
    def __enter__(self):
        # Add request context to all log records
        old_factory = logging.getLogRecordFactory()
        
        def record_factory(*args, **kwargs):
            record = old_factory(*args, **kwargs)
            record.request_id = self.request_id
            record.user_id = self.user_id or "anonymous"
            record.ip_address = self.ip_address or "unknown"
            return record
        
        logging.setLogRecordFactory(record_factory)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Restore original factory
        logging.setLogRecordFactory(logging.getLogRecordFactory())
        
        if exc_type:
            self.logger.error(
                f"Request {self.request_id} failed with exception",
                exc_info=(exc_type, exc_val, exc_tb)
            )
        else:
            self.logger.info(f"Request {self.request_id} completed successfully")

# Utility functions for common logging patterns
def log_api_call(logger: logging.Logger, method: str, url: str, user_id: str = None, **kwargs):
    """Log an API call"""
    logger.info(
        f"API {method} {url}",
        extra={
            "api_method": method,
            "api_url": url,
            "user_id": user_id,
            **kwargs
        }
    )

def log_api_response(logger: logging.Logger, method: str, url: str, status_code: int, 
                    duration: float = None, user_id: str = None, **kwargs):
    """Log an API response"""
    level = logging.ERROR if status_code >= 500 else logging.WARNING if status_code >= 400 else logging.INFO
    
    logger.log(
        level,
        f"API {method} {url} - {status_code}",
        extra={
            "api_method": method,
            "api_url": url,
            "status_code": status_code,
            "duration_ms": duration * 1000 if duration else None,
            "user_id": user_id,
            **kwargs
        }
    )

def log_database_operation(logger: logging.Logger, operation: str, table: str, 
                          record_id: str = None, user_id: str = None, **kwargs):
    """Log a database operation"""
    logger.info(
        f"Database {operation} on {table}",
        extra={
            "db_operation": operation,
            "db_table": table,
            "record_id": record_id,
            "user_id": user_id,
            **kwargs
        }
    )

def log_security_event(logger: logging.Logger, event_type: str, user_id: str = None, 
                      ip_address: str = None, **kwargs):
    """Log a security event"""
    logger.warning(
        f"Security event: {event_type}",
        extra={
            "security_event": event_type,
            "user_id": user_id,
            "ip_address": ip_address,
            **kwargs
        }
    )

def log_performance(logger: logging.Logger, operation: str, duration: float, 
                   **kwargs):
    """Log a performance metric"""
    logger.info(
        f"Performance: {operation} took {duration:.3f}s",
        extra={
            "performance_operation": operation,
            "duration_seconds": duration,
            **kwargs
        }
    )
