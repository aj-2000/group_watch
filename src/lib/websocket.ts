export class WebSocketClient {
	private static instance: WebSocketClient;
	private ws: WebSocket | null = null;
	private connected: boolean = false; // Added connection state tracking

	private constructor() {
		this.connect();
	}

	public static getInstance(): WebSocketClient {
		if (!WebSocketClient.instance) {
			WebSocketClient.instance = new WebSocketClient();
		}
		return WebSocketClient.instance;
	}

	private connect() {
		this.ws = new WebSocket('wss://signalling-server-2br7.onrender.com');

		this.ws.onopen = (event) => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.connected = true;
				console.log('WebSocket connection established.');
				if (this.onConnectedListener) {
					this.onConnectedListener();
					this.onConnectedListener = undefined;
				}
			}
		};

		this.ws.onclose = (event) => {
			this.connected = false; // Update connection state when disconnected
			console.log('WebSocket connection closed.');
		};
	}

	public send(data: any) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data));
		}
	}

	public close() {
		if (this.ws?.close) {
			this.ws.close();
		} else {
			this.ws = null;
		}
	}

	// Added connection event listener and corresponding setter
	private onConnectedListener?: () => void;

	public setOnConnected(handler: () => void) {
		if (this.connected) {
			// If already connected, call the handler immediately
			handler();
		} else {
			// If not connected yet, set the listener to be called on connection
			this.onConnectedListener = handler;
		}
	}

	public setOnMessage(handler: (event: MessageEvent) => void) {
		if (this.ws) this.ws.onmessage = handler;
	}

	public setOnClose(handler: (event: Event) => void) {
		if (this.ws) this.ws.onclose = handler;
	}
}
