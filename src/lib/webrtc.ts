import RoomManager from './room';
import WebSocketClient, { type User } from './websockets';

const configuration = {
	iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export default class WebRTCManager {
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
}
