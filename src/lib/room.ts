const configuration = {
	iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

class WebRTCManager {
	private static instance: WebRTCManager;
	private connections: Record<string, RTCPeerConnection> = {};
	private watchPeer: RTCPeerConnection | null = null;
	private wsc: WebSocketClient | null = null;
	private roomManager: RoomManager | null = null;

	private constructor(user: User) {
		this.watchPeer = new RTCPeerConnection(configuration);
		this.wsc = WebSocketClient.getInstance(user);
		this.roomManager = RoomManager.getInstance(user);
	}

	public static getInstance(user: User): WebRTCManager {
		if (!WebRTCManager.instance) {
			WebRTCManager.instance = new WebRTCManager(user);
		}
		return WebRTCManager.instance;
	}

	public broadcast(stream: MediaStream, userId: string) {
		console.log('broadcast from wrtc', this.roomManager?.getCurrentRoom()?.participants, stream);
		this.roomManager
			?.getCurrentRoom()
			?.participants.filter((participantUserId) => participantUserId !== userId)
			.forEach((participantUserId) => {
				console.log('inside participants loop');
				if (!this.connections[participantUserId]) {
					this.connections[participantUserId] = new RTCPeerConnection(configuration);
				}
				this.connections[participantUserId].onicecandidate = (event) => {
					if (event.candidate) {
						this.wsc?.sendMessage({
							candidate: event.candidate,
							command: 'iceCandidate',
							roomId: this.roomManager?.getCurrentRoom()?.id,
							userId,
							targetUserId: participantUserId
						});
					}
				};
				console.log(participantUserId, this.connections[participantUserId]);

				console.log(participantUserId, stream);
				if (stream) {
					stream.getTracks().forEach((track) => {
						this.connections[participantUserId].addTrack(track, stream);
					});
					this.createOfferAndSend(participantUserId, userId);
				}
			});
	}

	private createOfferAndSend(participantUserId, userId: string) {
		this.connections[participantUserId]
			?.createOffer()
			.then((desc) => {
				this.connections[participantUserId].setLocalDescription(desc);
				this.wsc?.sendMessage({
					desc,
					command: 'offer',
					roomId: this.roomManager?.getCurrentRoom()?.id,
					userId,
					targetUserId: participantUserId
				});
			})
			.catch((error) => console.log(`Error creating offer ${JSON.stringify(error)}`));
	}

	public setOnTrack(handler: (event: Event) => void) {
		if (handler && this.watchPeer) {
			this.watchPeer.ontrack = handler;
		}
	}

	public gotOffer(message: any, userId: string) {
		if (message?.targetUserId === userId) {
			this.watchPeer?.setRemoteDescription(message.desc);
			this.watchPeer?.createAnswer().then(
				(desc) => {
					this.watchPeer?.setLocalDescription(desc);

					this.wsc?.sendMessage({
						desc,
						command: 'answer',
						roomId: this.roomManager?.getCurrentRoom()?.id,
						userId,
						targetUserId: message?.userId
					});
				},
				(e) => console.log(`Error creating SDP ${JSON.stringify(e)}`)
			);
		}
	}

	public gotAnswer(message: any, userId: string) {
		if (message?.targetUserId === userId) {
			this.connections[message?.userId].setRemoteDescription(message?.desc);
		}
	}

	public onIceCandidate(message: any, userId: string) {
		if (message?.targetUserId === userId && message?.candidate) {
			if (this.roomManager?.getCurrentRoom()?.broadcasterId === userId) {
				this.connections[message?.userId]
					?.addIceCandidate(message.candidate)
					.then(() => console.log(`Added IceCandidate`))
					.catch((error) => console.log(`Error in adding IceCandidate ${JSON.stringify(error)}`));
			} else {
				this.watchPeer
					?.addIceCandidate(message.candidate)
					.then(() => console.log(`Added IceCandidate`))
					.catch((error) => console.log(`Error in adding IceCandidate ${JSON.stringify(error)}`));
			}
		}
	}

	// ... other methods
}

export type User = {
	id: string;
	userName: string;
	fullName: string;
	email: string;
};

class WebSocketClient {
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

export type Room = {
	id: string;
	name: string;
	participants: string[];
	broadcasterId: string;
};

export class RoomManager {
	private static instance: RoomManager;
	private room: Room | null = null;
	private wsc?: WebSocketClient;

	private constructor(user: User) {
		this.wsc = WebSocketClient.getInstance(user);
	}

	public static getInstance(user: User): RoomManager {
		if (!RoomManager.instance) {
			RoomManager.instance = new RoomManager(user);
		}
		return RoomManager.instance;
	}

	public createRoom(roomName: string, roomId: string, userId: string) {
		if (!this.room) {
			this.room = {
				id: roomId,
				name: roomName,
				participants: [userId],
				broadcasterId: userId
			};

			this.wsc?.createRoom(roomName, roomId, userId);
		}
	}

	public joinRoom(roomId: string, userId: string) {
		if (!this.room) {
			this.wsc?.joinRoom(roomId, userId);
		}
	}

	public setRoom(room: Room) {
		this.room = room;
	}

	public getCurrentRoom(): Room | null {
		return this.room;
	}

	public broadcast(stream: MediaStream, userId: string): void {
		console.log('broadcast from room');
		this.wsc?.broadcast(stream, userId);
	}

	public makeMeBroadCaster(userId: string) {
		if (this.room) this.room.broadcasterId = userId;
	}

	public setOnTrack(handler: (event: Event) => void) {
		if (handler) this.wsc?.setOnTrack(handler);
	}

	public sendMessage(message: any) {
		this.wsc?.sendMessage(message);
	}

	public isConnected() {
		return this.wsc?.isConnected();
	}
}
