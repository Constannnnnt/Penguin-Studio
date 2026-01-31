
type MessageHandler = (data: any) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private url: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    private messageQueue: string[] = [];
    private isConnecting = false;

    constructor(url: string = 'ws://127.0.0.1:8000/ws/segment') {
        this.url = url;
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;

        this.isConnecting = true;
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('[WS] Connected to', this.url);
            this.reconnectAttempts = 0;
            this.isConnecting = false;
            
            // Send queued messages
            while (this.messageQueue.length > 0) {
                const msg = this.messageQueue.shift();
                if (msg) this.ws?.send(msg);
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const { type } = message;
                
                if (this.handlers.has(type)) {
                    this.handlers.get(type)?.forEach(handler => handler(message));
                }
                
                if (this.handlers.has('*')) {
                    this.handlers.get('*')?.forEach(handler => handler(message));
                }
            } catch (e) {
                console.error('[WS] Error parsing message:', e);
            }
        };

        this.ws.onclose = () => {
            console.log('[WS] Disconnected');
            this.isConnecting = false;
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
            }
        };

        this.ws.onerror = (error) => {
            console.error('[WS] Error:', error);
            this.isConnecting = false;
        };
    }

    send(action: string, data: any) {
        const message = JSON.stringify({ action, ...data });
        
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        } else {
            console.log('[WS] Socket not open, queuing message');
            this.messageQueue.push(message);
            if (this.ws?.readyState !== WebSocket.CONNECTING) {
                this.connect();
            }
        }
    }

    on(type: string, handler: MessageHandler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)?.add(handler);
    }

    off(type: string, handler: MessageHandler) {
        this.handlers.get(type)?.delete(handler);
    }

    disconnect() {
        this.ws?.close();
    }
}

export const wsService = new WebSocketService();
