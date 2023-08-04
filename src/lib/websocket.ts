export class WebSocketClient {
	private static instance: WebSocketClient;
	private ws: WebSocket | null = null;

	private constructor() {
		this.ws = new WebSocket('ws://localhost:8080');
	}

	public static getInstance(): WebSocketClient {
		if (!WebSocketClient.instance) {
			WebSocketClient.instance = new WebSocketClient();
		}
		return WebSocketClient.instance;
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
	public setOnOpen(handler: (event: Event) => void) {
		if (this.ws) this.ws.onopen = handler;
	}

	public setOnMessage(handler: (event: MessageEvent) => void) {
		if (this.ws) this.ws.onmessage = handler;
	}

	public setOnClose(handler: (event: Event) => void) {
		if (this.ws) this.ws.onclose = handler;
	}
}
