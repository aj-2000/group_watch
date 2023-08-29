import WebSocketClient, { type User } from './websockets';

export type Room = {
	id: string;
	name: string;
	participants: string[];
	broadcasterId: string;
};

export default class RoomManager {
	private static instance: RoomManager;
	private room: Room | null = null;
	private wsc: WebSocketClient;
	private onRoomUpdate: () => void = () => {};

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

			this.wsc.createRoom(roomName, roomId, userId);
		}
	}

	public joinRoom(roomId: string, userId: string) {
		console.log('JoinRoom', roomId, userId, this.room);
		if (!this.room) {
			this.wsc.joinRoom(roomId, userId);
		}
	}

	public setRoom(room: Room) {
		this.room = room;
	}

	public getCurrentRoom(): Room | null {
		return this.room;
	}

	public broadcast(stream: MediaStream, userId: string): void {
		this.wsc.broadcast(stream, userId);
	}

	public makeMeBroadCaster(userId: string) {
		if (this.room) this.room.broadcasterId = userId;
	}

	public setOnTrack(handler: (event: Event) => void) {
		this.wsc.setOnTrack(handler);
	}

	public sendMessage(message: any) {
		this.wsc.sendMessage(message);
	}

	public isConnected() {
		return this.wsc.isConnected();
	}

	public setOnRoomUpdate(handler: () => void) {
		this.onRoomUpdate = handler;
	}

	public callOnRoomUpdate() {
		this.onRoomUpdate();
	}
}
