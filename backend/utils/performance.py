"""
Performance monitoring utilities for the backend
"""

import time
import functools
import psutil
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timezone
from contextlib import contextmanager
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Performance monitoring class for tracking various metrics"""
    
    def __init__(self):
        self.metrics = {}
        self.start_time = time.time()
    
    def record_metric(self, name: str, value: float, unit: str = "seconds", **metadata):
        """Record a performance metric"""
        if name not in self.metrics:
            self.metrics[name] = []
        
        self.metrics[name].append({
            "value": value,
            "unit": unit,
            "timestamp": datetime.now(timezone.utc),
            "metadata": metadata
        })
        
        logger.info(
            f"Performance metric recorded: {name} = {value} {unit}",
            extra={
                "metric_name": name,
                "metric_value": value,
                "metric_unit": unit,
                **metadata
            }
        )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all recorded metrics"""
        return self.metrics.copy()
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system performance metrics"""
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent,
            "uptime": time.time() - self.start_time,
            "timestamp": datetime.now(timezone.utc)
        }

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

def time_function(func: Callable) -> Callable:
    """Decorator to time function execution"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            performance_monitor.record_metric(
                f"function_{func.__name__}",
                duration,
                "seconds",
                function=func.__name__,
                module=func.__module__
            )
            return result
        except Exception as e:
            duration = time.time() - start_time
            performance_monitor.record_metric(
                f"function_{func.__name__}_error",
                duration,
                "seconds",
                function=func.__name__,
                module=func.__module__,
                error=str(e)
            )
            raise
    return wrapper

@contextmanager
def time_operation(operation_name: str, **metadata):
    """Context manager to time an operation"""
    start_time = time.time()
    try:
        yield
    finally:
        duration = time.time() - start_time
        performance_monitor.record_metric(
            operation_name,
            duration,
            "seconds",
            **metadata
        )

def time_database_query(query_name: str):
    """Decorator to time database queries"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                performance_monitor.record_metric(
                    f"db_query_{query_name}",
                    duration,
                    "seconds",
                    query_name=query_name,
                    function=func.__name__
                )
                return result
            except Exception as e:
                duration = time.time() - start_time
                performance_monitor.record_metric(
                    f"db_query_{query_name}_error",
                    duration,
                    "seconds",
                    query_name=query_name,
                    function=func.__name__,
                    error=str(e)
                )
                raise
        return wrapper
    return decorator

def time_api_endpoint(endpoint_name: str):
    """Decorator to time API endpoints"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                performance_monitor.record_metric(
                    f"api_endpoint_{endpoint_name}",
                    duration,
                    "seconds",
                    endpoint=endpoint_name,
                    function=func.__name__
                )
                return result
            except Exception as e:
                duration = time.time() - start_time
                performance_monitor.record_metric(
                    f"api_endpoint_{endpoint_name}_error",
                    duration,
                    "seconds",
                    endpoint=endpoint_name,
                    function=func.__name__,
                    error=str(e)
                )
                raise
        return wrapper
    return decorator

class DatabasePerformanceMonitor:
    """Monitor database performance"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_query_stats(self) -> Dict[str, Any]:
        """Get database query statistics"""
        try:
            # PostgreSQL specific queries
            result = self.db.execute(text("""
                SELECT 
                    query,
                    calls,
                    total_time,
                    mean_time,
                    rows
                FROM pg_stat_statements 
                ORDER BY total_time DESC 
                LIMIT 10
            """)).fetchall()
            
            return {
                "slow_queries": [
                    {
                        "query": row[0][:100] + "..." if len(row[0]) > 100 else row[0],
                        "calls": row[1],
                        "total_time": row[2],
                        "mean_time": row[3],
                        "rows": row[4]
                    }
                    for row in result
                ]
            }
        except Exception as e:
            logger.warning(f"Failed to get query stats: {e}")
            return {"error": str(e)}
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get database connection statistics"""
        try:
            result = self.db.execute(text("""
                SELECT 
                    state,
                    COUNT(*) as count
                FROM pg_stat_activity 
                GROUP BY state
            """)).fetchall()
            
            return {
                "connections": {
                    row[0]: row[1] for row in result
                }
            }
        except Exception as e:
            logger.warning(f"Failed to get connection stats: {e}")
            return {"error": str(e)}
    
    def get_table_stats(self) -> Dict[str, Any]:
        """Get table statistics"""
        try:
            result = self.db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins,
                    n_tup_upd,
                    n_tup_del,
                    n_live_tup,
                    n_dead_tup
                FROM pg_stat_user_tables 
                ORDER BY n_live_tup DESC 
                LIMIT 20
            """)).fetchall()
            
            return {
                "table_stats": [
                    {
                        "schema": row[0],
                        "table": row[1],
                        "inserts": row[2],
                        "updates": row[3],
                        "deletes": row[4],
                        "live_tuples": row[5],
                        "dead_tuples": row[6]
                    }
                    for row in result
                ]
            }
        except Exception as e:
            logger.warning(f"Failed to get table stats: {e}")
            return {"error": str(e)}

def get_performance_summary() -> Dict[str, Any]:
    """Get a comprehensive performance summary"""
    system_metrics = performance_monitor.get_system_metrics()
    app_metrics = performance_monitor.get_metrics()
    
    # Calculate averages for key metrics
    summary = {
        "system": system_metrics,
        "application": {},
        "timestamp": datetime.now(timezone.utc)
    }
    
    # Process application metrics
    for metric_name, values in app_metrics.items():
        if values:
            avg_value = sum(v["value"] for v in values) / len(values)
            max_value = max(v["value"] for v in values)
            min_value = min(v["value"] for v in values)
            
            summary["application"][metric_name] = {
                "count": len(values),
                "average": avg_value,
                "max": max_value,
                "min": min_value,
                "unit": values[0]["unit"]
            }
    
    return summary

def log_slow_operations(threshold: float = 1.0):
    """Log operations that take longer than the threshold"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                if duration > threshold:
                    logger.warning(
                        f"Slow operation detected: {func.__name__} took {duration:.3f}s",
                        extra={
                            "function": func.__name__,
                            "duration": duration,
                            "threshold": threshold,
                            "module": func.__module__
                        }
                    )
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    f"Operation failed: {func.__name__} after {duration:.3f}s",
                    extra={
                        "function": func.__name__,
                        "duration": duration,
                        "error": str(e),
                        "module": func.__module__
                    }
                )
                raise
        return wrapper
    return decorator

# Utility functions for common performance monitoring patterns
def monitor_memory_usage():
    """Monitor memory usage of the current process"""
    process = psutil.Process()
    memory_info = process.memory_info()
    
    return {
        "rss": memory_info.rss,  # Resident Set Size
        "vms": memory_info.vms,  # Virtual Memory Size
        "percent": process.memory_percent(),
        "timestamp": datetime.now(timezone.utc)
    }

def monitor_cpu_usage():
    """Monitor CPU usage of the current process"""
    process = psutil.Process()
    
    return {
        "cpu_percent": process.cpu_percent(),
        "num_threads": process.num_threads(),
        "timestamp": datetime.now(timezone.utc)
    }

def get_disk_usage(path: str = "/") -> Dict[str, Any]:
    """Get disk usage for a given path"""
    usage = psutil.disk_usage(path)
    
    return {
        "total": usage.total,
        "used": usage.used,
        "free": usage.free,
        "percent": (usage.used / usage.total) * 100,
        "path": path,
        "timestamp": datetime.now(timezone.utc)
    }
