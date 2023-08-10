const configuration = {
	iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export class WebSocketClient {
	private static instance: WebSocketClient;
	private ws: WebSocket | null = null;
	private connected: boolean = false; // Added connection state tracking

	private watchPeer: any = null;
	private connections: any = {};

	private isBroadcaster: boolean = false;

	private room: Room | null = null;

	private constructor(user: User) {
		this.watchPeer = new RTCPeerConnection(configuration);
		this.connect(user);
	}

	public static getInstance(user: User): WebSocketClient {
		console.log(user);
		if (!WebSocketClient.instance) {
			WebSocketClient.instance = new WebSocketClient(user);
		}
		return WebSocketClient.instance;
	}

	private connect(user: User) {
		this.ws = new WebSocket('wss://signalling-server-2br7.onrender.com');
		// this.ws = new WebSocket('ws://localhost:8080');

		this.ws.onopen = (event) => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.connected = true;
				console.log('WebSocket connection established.');
				// Registering user
				this.send({
					...user,
					command: 'user'
				});
				if (this.onConnectedListener) {
					this.onConnectedListener();
					this.onConnectedListener = undefined;
				}
			}
		};

		this.ws.onmessage = ({ data }: MessageEvent) => {
			const message = JSON.parse(data);
			console.log(message, 'onMessage');

			if (message.command === 'roomUpdate') {
				const { roomId, participants } = message;
				this.room = {
					id: roomId,
					participants: participants,
					name: 'New room'
				};
			} else if (message.command === 'offer') {
				this.gotOffer(message, user.id);
			} else if (message.command === 'answer') {
				this.gotAnswer(message, user.id);
			} else if (message.command === 'iceCandidate') {
				this.onIceCandidate(message, user.id);
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

	public isConnected() {
		return this.connected;
	}

	public createRoom(roomName: string = 'New Room', roomId: string, userId: string) {
		const newRoom: Room = {
			id: roomId,
			name: roomName,
			participants: [userId]
		};

		this.send({
			roomId: newRoom.id,
			userId,
			command: 'createRoom'
		});
	}

	public joinRoom(roomId: string, userId: string) {
		this.send({
			roomId: roomId,
			userId,
			//TODO:
			command: 'createRoom'
		});
	}

	public getRoom() {
		return this.room;
	}

	public setOnTrack(handler: (event: Event) => void) {
		if (handler) {
			this.watchPeer.ontrack = handler;
		}
	}

	public broadcast(stream: MediaStream, userId: string) {
		this.room?.participants
			.filter((participantUserId) => participantUserId !== userId)
			.forEach((participantUserId) => {
				if (!this.connections[participantUserId]) {
					this.connections[participantUserId] = new RTCPeerConnection(configuration);
				}
				this.connections[participantUserId].onicecandidate = (event) => {
					if (event.candidate) {
						this.send({
							candidate: event.candidate,
							command: 'iceCandidate',
							roomId: this.room?.id,
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

	public makeMeBroadcaster() {
		this.isBroadcaster = true;
	}

	private gotAnswer = (message, userId: string) => {
		if (message?.targetUserId === userId) {
			this.connections[message?.userId].setRemoteDescription(message?.desc);
		}
	};

	private gotOffer = (message, userId: string) => {
		if (message?.targetUserId === userId) {
			this.watchPeer?.setRemoteDescription(message.desc);
			this.watchPeer?.createAnswer().then(
				(desc) => {
					this.watchPeer?.setLocalDescription(desc);
					this.send({
						desc,
						command: 'answer',
						roomId: this.room?.id,
						userId,
						targetUserId: message?.userId
					});
				},
				(e) => console.log(`Error creating SDP ${JSON.stringify(e)}`)
			);
		}
	};

	private onIceCandidate = (message, userId: string) => {
		if (message?.targetUserId === userId && message?.candidate) {
			if (this.isBroadcaster) {
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
	};

	private createOfferAndSend(participantUserId, userId: string) {
		this.connections[participantUserId]
			?.createOffer()
			.then((desc) => {
				this.connections[participantUserId].setLocalDescription(desc);
				this.send({
					desc,
					command: 'offer',
					roomId: this.room?.id,
					userId,
					targetUserId: participantUserId
				});
			})
			.catch((error) => console.log(`Error creating offer ${JSON.stringify(error)}`));
	}
}

export type Room = {
	id: string;
	name: string;
	participants: string[];
};

export type User = {
	id: string;
	userName: string;
	fullName: string;
	email: string;
};
