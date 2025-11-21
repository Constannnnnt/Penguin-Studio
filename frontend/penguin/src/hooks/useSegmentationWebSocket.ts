import { useEffect, useRef, useCallback } from 'react';
import { useSegmentationStore } from '@/store/segmentationStore';
import type { SegmentationResponse } from '@/store/segmentationStore';

interface WebSocketMessage {
  type: 'connected' | 'progress' | 'result' | 'error';
  data: {
    progress?: number;
    message?: string;
    error?: string;
    [key: string]: unknown;
  };
  timestamp: string;
}

interface UseSegmentationWebSocketReturn {
  sendSegmentationRequest: (imageData: string, prompts?: string[]) => void;
  isConnected: boolean;
}

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

export const useSegmentationWebSocket = (): UseSegmentationWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const setProgress = useSegmentationStore((state) => state.setProgress);
  const setResults = useSegmentationStore((state) => state.setResults);
  const setError = useSegmentationStore((state) => state.setError);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const websocket = new WebSocket(`${WS_BASE_URL}/ws/segment`);

      websocket.onopen = () => {
        isConnectedRef.current = true;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              break;

            case 'progress':
              if (typeof message.data.progress === 'number') {
                setProgress(message.data.progress);
              }
              break;

            case 'result':
              setResults(message.data as unknown as SegmentationResponse);
              break;

            case 'error':
              setError(message.data.error || 'Segmentation failed');
              break;

            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectedRef.current = false;
      };

      websocket.onclose = () => {
        isConnectedRef.current = false;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current = websocket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectedRef.current = false;
    }
  }, [setProgress, setResults, setError]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      isConnectedRef.current = false;
    };
  }, [connect]);

  const sendSegmentationRequest = useCallback((imageData: string, prompts?: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'segment',
        image_data: imageData,
        prompts: prompts || [],
      }));
    } else {
      setError('WebSocket connection not available');
    }
  }, [setError]);

  return {
    sendSegmentationRequest,
    isConnected: isConnectedRef.current,
  };
};
