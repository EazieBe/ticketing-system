import { useEffect, useRef, useCallback, useState } from 'react';
import { config } from '../config';

// Global registry to prevent multiple WebSocket connections to the same URL
const activeConnections = new Map();
const connectionMetrics = new Map();

/**
 * Optimized WebSocket hook with proper cleanup, connection pooling, and performance monitoring
 */
const useOptimizedWebSocket = (url, onMessage, onError, onOpen, onClose) => {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = config.MAX_RECONNECT_ATTEMPTS;
  const reconnectDelay = config.RECONNECT_DELAY;
  const isConnecting = useRef(false);
  const pingInterval = useRef(null);
  const heartbeatInterval = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  
  // Store callback functions in refs to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  
  // Performance monitoring
  const performanceMetrics = useRef({
    messagesReceived: 0,
    messagesSent: 0,
    reconnectionAttempts: 0,
    averageLatency: 0,
    lastPingTime: 0,
    connectionUptime: 0,
    startTime: Date.now()
  });

  // Update refs when callbacks change - but don't trigger reconnection
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  });

  // Connection quality monitoring
  const updateConnectionQuality = useCallback(() => {
    const metrics = performanceMetrics.current;
    const uptime = Date.now() - metrics.startTime;
    
    if (metrics.reconnectionAttempts > 3) {
      setConnectionQuality('poor');
    } else if (metrics.averageLatency > 1000) {
      setConnectionQuality('fair');
    } else if (metrics.reconnectionAttempts === 0 && metrics.averageLatency < 100) {
      setConnectionQuality('excellent');
    } else {
      setConnectionQuality('good');
    }
  }, []);

  // Enhanced ping with latency measurement
  const sendPing = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const pingTime = Date.now();
      performanceMetrics.current.lastPingTime = pingTime;
      
      ws.current.send(JSON.stringify({ 
        type: 'ping', 
        timestamp: pingTime 
      }));
    }
  }, []);

  // Heartbeat to keep connection alive
  const sendHeartbeat = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ 
        type: 'heartbeat',
        timestamp: Date.now()
      }));
    }
  }, []);

  const connect = useCallback(() => {
    if (!url) return;
    
    // Check if there's already an active connection to this URL
    if (activeConnections.has(url)) {
      const existingConnection = activeConnections.get(url);
      if (existingConnection && existingConnection.readyState === WebSocket.OPEN) {
        console.log('Reusing existing WebSocket connection');
        ws.current = existingConnection;
        setIsConnected(true);
        updateConnectionQuality();
        return;
      } else {
        // Remove stale connection
        activeConnections.delete(url);
      }
    }
    
    if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    try {
      isConnecting.current = true;
      ws.current = new WebSocket(url);
      
      // Register this connection
      activeConnections.set(url, ws.current);
      
      // Initialize metrics for this connection
      if (!connectionMetrics.has(url)) {
        connectionMetrics.set(url, {
          totalConnections: 0,
          successfulConnections: 0,
          failedConnections: 0,
          averageConnectionTime: 0
        });
      }
      
      const connectionStartTime = Date.now();
      const metrics = connectionMetrics.get(url);
      metrics.totalConnections++;
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        isConnecting.current = false;
        reconnectAttempts.current = 0;
        setIsConnected(true);
        
        const connectionTime = Date.now() - connectionStartTime;
        metrics.successfulConnections++;
        metrics.averageConnectionTime = 
          (metrics.averageConnectionTime * (metrics.successfulConnections - 1) + connectionTime) / 
          metrics.successfulConnections;
        
        // Start ping interval to keep connection alive and measure latency
        pingInterval.current = setInterval(sendPing, config.PING_INTERVAL);
        
        // Start heartbeat interval
        heartbeatInterval.current = setInterval(sendHeartbeat, config.HEARTBEAT_INTERVAL || 30000);
        
        updateConnectionQuality();
        
        if (onOpenRef.current) onOpenRef.current();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle ping/pong for latency measurement
          if (data.type === 'ping') {
            ws.current.send(JSON.stringify({ 
              type: 'pong', 
              timestamp: data.timestamp 
            }));
            return;
          }
          
          if (data.type === 'pong') {
            const latency = Date.now() - data.timestamp;
            performanceMetrics.current.averageLatency = 
              (performanceMetrics.current.averageLatency * performanceMetrics.current.messagesReceived + latency) / 
              (performanceMetrics.current.messagesReceived + 1);
            updateConnectionQuality();
            return;
          }
          
          if (data.type === 'heartbeat') {
            return; // Ignore heartbeat messages
          }
          
          performanceMetrics.current.messagesReceived++;
          if (onMessageRef.current) onMessageRef.current(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnecting.current = false;
        setIsConnected(false);
        setConnectionQuality('poor');
        
        const metrics = connectionMetrics.get(url);
        metrics.failedConnections++;
        
        if (onErrorRef.current) onErrorRef.current(error);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        isConnecting.current = false;
        setIsConnected(false);
        setConnectionQuality('unknown');
        
        // Clear intervals
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }
        
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
          heartbeatInterval.current = null;
        }
        
        if (onCloseRef.current) onCloseRef.current(event);
        
        // Remove from registry
        activeConnections.delete(url);
        
        // Attempt to reconnect for unexpected closures
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          performanceMetrics.current.reconnectionAttempts++;
          
          const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current - 1);
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.log('Max reconnection attempts reached, giving up');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      isConnecting.current = false;
      setIsConnected(false);
      setConnectionQuality('poor');
    }
  }, [url, maxReconnectAttempts, reconnectDelay, sendPing, sendHeartbeat, updateConnectionQuality]);

  const disconnect = useCallback(() => {
    // Clear timeouts
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    // Clear intervals
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    
    // Close WebSocket connection
    if (ws.current) {
      ws.current.close(1000, 'Component unmounting');
      // Remove from registry
      activeConnections.delete(url);
      ws.current = null;
    }
    
    isConnecting.current = false;
    setIsConnected(false);
    setConnectionQuality('unknown');
  }, [url]);

  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      performanceMetrics.current.messagesSent++;
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Get connection statistics
  const getConnectionStats = useCallback(() => {
    const metrics = connectionMetrics.get(url) || {};
    return {
      ...performanceMetrics.current,
      connectionQuality,
      isConnected,
      url,
      ...metrics
    };
  }, [url, connectionQuality, isConnected]);

  // Cleanup all connections (for app shutdown)
  const cleanupAllConnections = useCallback(() => {
    for (const [url, connection] of activeConnections) {
      if (connection && connection.readyState === WebSocket.OPEN) {
        connection.close(1000, 'App shutdown');
      }
    }
    activeConnections.clear();
    connectionMetrics.clear();
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { 
    sendMessage, 
    disconnect, 
    isConnected, 
    connectionQuality,
    getConnectionStats,
    cleanupAllConnections
  };
};

export default useOptimizedWebSocket;
