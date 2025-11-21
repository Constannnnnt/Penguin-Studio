"""
Metrics collection service for monitoring application performance.

Tracks request counts, success/error rates, and processing times.
"""

import time
from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock
from typing import Dict, List


@dataclass
class MetricsData:
    """Container for application metrics."""
    
    request_count: int = 0
    success_count: int = 0
    error_count: int = 0
    processing_times: List[float] = field(default_factory=list)
    start_time: datetime = field(default_factory=datetime.utcnow)
    
    def get_error_rate(self) -> float:
        """Calculate error rate as percentage."""
        if self.request_count == 0:
            return 0.0
        return (self.error_count / self.request_count) * 100
    
    def get_success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.request_count == 0:
            return 0.0
        return (self.success_count / self.request_count) * 100
    
    def get_avg_processing_time(self) -> float:
        """Calculate average processing time in milliseconds."""
        if not self.processing_times:
            return 0.0
        return sum(self.processing_times) / len(self.processing_times)


class MetricsService:
    """
    Service for collecting and reporting application metrics.
    
    Thread-safe singleton for tracking request metrics across the application.
    """
    
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._data = MetricsData()
        self._data_lock = Lock()
        self._initialized = True
    
    def record_request(self) -> None:
        """Record a new request."""
        with self._data_lock:
            self._data.request_count += 1
    
    def record_success(self) -> None:
        """Record a successful request."""
        with self._data_lock:
            self._data.success_count += 1
    
    def record_error(self) -> None:
        """Record a failed request."""
        with self._data_lock:
            self._data.error_count += 1
    
    def record_processing_time(self, duration_ms: float) -> None:
        """
        Record processing time for a request.
        
        Args:
            duration_ms: Processing duration in milliseconds
        """
        with self._data_lock:
            self._data.processing_times.append(duration_ms)
            
            if len(self._data.processing_times) > 1000:
                self._data.processing_times = self._data.processing_times[-1000:]
    
    def get_metrics(self) -> Dict[str, any]:
        """
        Get current metrics snapshot.
        
        Returns:
            Dictionary containing all metrics
        """
        with self._data_lock:
            uptime_seconds = (datetime.utcnow() - self._data.start_time).total_seconds()
            
            return {
                "requests_total": self._data.request_count,
                "requests_success": self._data.success_count,
                "requests_failed": self._data.error_count,
                "success_rate_percent": round(self._data.get_success_rate(), 2),
                "error_rate_percent": round(self._data.get_error_rate(), 2),
                "avg_processing_time_ms": round(self._data.get_avg_processing_time(), 2),
                "uptime_seconds": round(uptime_seconds, 2),
                "start_time": self._data.start_time.isoformat(),
            }
    
    def reset(self) -> None:
        """Reset all metrics (useful for testing)."""
        with self._data_lock:
            self._data = MetricsData()


_metrics_service_instance = None


def get_metrics_service() -> MetricsService:
    """
    Get the singleton metrics service instance.
    
    Returns:
        MetricsService instance
    """
    global _metrics_service_instance
    if _metrics_service_instance is None:
        _metrics_service_instance = MetricsService()
    return _metrics_service_instance
