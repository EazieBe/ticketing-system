import { useEffect, useRef, useCallback, useState } from 'react';
import { config } from '../config';

// Global registry to prevent multiple WebSocket connections to the same URL
const activeConnections = new Map();

const useWebSocket = (url, onMessage, onError, onOpen, onClose) => {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = config.MAX_RECONNECT_ATTEMPTS;
  const reconnectDelay = config.RECONNECT_DELAY;
  const isConnecting = useRef(false);
  const pingInterval = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Store callback functions in refs to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  
  // Update refs when callbacks change - but don't trigger reconnection
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  }); // Remove dependency array to avoid reconnections

  const connect = useCallback(() => {
    if (!url) return; // nothing to connect to
    
    // Check if there's already an active connection to this URL
    if (activeConnections.has(url)) {
      console.log('WebSocket connection already exists for URL:', url);
      const existingWs = activeConnections.get(url);
      if (existingWs && existingWs.readyState === WebSocket.OPEN) {
        console.log('Using existing WebSocket connection');
        ws.current = existingWs;
        setIsConnected(true);
        return;
      }
    }
    
    if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.CONNECTING)) {
      return; // Already connecting
    }
    
    try {
      isConnecting.current = true;
      ws.current = new WebSocket(url);
      
      // Register this connection
      activeConnections.set(url, ws.current);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        isConnecting.current = false;
        reconnectAttempts.current = 0;
        setIsConnected(true);
        
        // Start ping interval to keep connection alive
        pingInterval.current = setInterval(() => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, config.PING_INTERVAL);
        
        if (onOpenRef.current) onOpenRef.current();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Ignore ping messages
          if (data.type === 'ping' || data.type === 'pong') {
            return;
          }
          if (onMessageRef.current) onMessageRef.current(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnecting.current = false;
        setIsConnected(false);
        if (onErrorRef.current) onErrorRef.current(error);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        isConnecting.current = false;
        setIsConnected(false);
        
        // Clear ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }
        
        if (onCloseRef.current) onCloseRef.current(event);
        
        // Only attempt to reconnect for unexpected closures and not too many times
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current - 1); // Exponential backoff
          
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
    }
  }, [url, maxReconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Component unmounting');
      // Remove from registry
      activeConnections.delete(url);
      ws.current = null;
    }
    isConnecting.current = false;
    setIsConnected(false);
  }, [url]);

  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { sendMessage, disconnect, isConnected };
};

export default useWebSocket; 