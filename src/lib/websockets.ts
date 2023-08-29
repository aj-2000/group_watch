import RoomManager, { type Room } from './room';
import WebRTCManager from './webrtc';

export type User = {
	id: string;
	userName: string;
	fullName: string;
	email: string;
};

export default class WebSocketClient {
	private static instance: WebSocketClient;
	private ws?: WebSocket;
	private webRTCManager?: WebRTCManager;
	private roomManager?: RoomManager;
	private connected: boolean = false; // Added connection state tracking
	private onConnectedListener?: (event: Event) => void;
	private onClosedListener?: (event: Event) => void;

	private constructor(user: User) {
		this.connect(user);
	}

	public static getInstance(user: User): WebSocketClient {
		if (!WebSocketClient.instance) {
			WebSocketClient.instance = new WebSocketClient(user);
		}
		return WebSocketClient.instance;
	}

	public connect(user: User) {
		// this.ws = new WebSocket('wss://signalling-server-2br7.onrender.com');
		this.ws = new WebSocket('ws://localhost:8080');

		this.ws.onopen = (event) => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.connected = true;
				console.log('WebSocket connection established.');
				// Registering user
				this.sendMessage({
					...user,
					command: 'user'
				});

				this.webRTCManager = WebRTCManager.getInstance(user);
				this.roomManager = RoomManager.getInstance(user);

				if (this.onConnectedListener) {
					this.onConnectedListener(event);
					this.onConnectedListener = undefined;
				}
			}
		};

		this.ws.onmessage = ({ data }: MessageEvent) => {
			const message = JSON.parse(data);
			console.log(message, 'onMessage');

			if (message.command === 'roomUpdate') {
				const { roomId, participants, name, broadcasterId } = message;

				this.roomManager?.setRoom({
					id: roomId,
					participants: participants,
					name,
					broadcasterId
				});
			} else if (message.command === 'offer') {
				this.webRTCManager?.gotOffer(message, user.id);
			} else if (message.command === 'answer') {
				this.webRTCManager?.gotAnswer(message, user.id);
			} else if (message.command === 'iceCandidate') {
				this.webRTCManager?.onIceCandidate(message, user.id);
			}
		};

		this.ws.onclose = (event) => {
			this.connected = false; // Update connection state when disconnected
			console.log('WebSocket connection closed.');
			if (this.onClosedListener) {
				this.onClosedListener(event);
				this.onClosedListener = undefined;
			}
		};
	}

	public sendMessage(data: any) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data));
		}
	}

	public setOnConnectedListener(handler: () => void) {
		if (typeof handler === 'function') this.onConnectedListener = handler;
	}

	public setOnCloseListener(handler: (event: Event) => void) {
		if (typeof handler === 'function') this.onClosedListener = handler;
	}

	public isConnected() {
		return this.connected;
	}

	public createRoom(roomName: string = 'New Room', roomId: string, userId: string) {
		const newRoom: Room = {
			id: roomId,
			name: roomName,
			participants: [userId],
			broadcasterId: userId
		};

		this.sendMessage({
			roomId: newRoom.id,
			userId,
			command: 'createRoom'
		});
	}

	public joinRoom(roomId: string, userId: string) {
		this.sendMessage({
			roomId: roomId,
			userId,
			//TODO:
			command: 'createRoom'
		});
	}

	public setOnTrack(handler: (event: Event) => void) {
		if (handler) this.webRTCManager?.setOnTrack(handler);
	}

	public broadcast(stream: MediaStream, userId: string): void {
		console.log('broadcast from wsc', this.webRTCManager);
		this.webRTCManager?.broadcast(stream, userId);
	}
}
