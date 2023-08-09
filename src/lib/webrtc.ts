export const configuration = {
	iceServers: [
		{ urls: 'stun:stun.l.google.com:19302' }
		// { urls: 'stun:stun2.l.google.com:19302' },
		// { urls: 'stun:stun3.l.google.com:19302' },
		// { urls: 'stun:stun4.l.google.com:19302' },
		// {
		// 	urls: 'stun:openrelay.metered.ca:80'
		// },
		// {
		// 	urls: 'turn:openrelay.metered.ca:80',
		// 	username: 'openrelayproject',
		// 	credential: 'openrelayproject'
		// },
		// {
		// 	urls: 'turn:openrelay.metered.ca:443',
		// 	username: 'openrelayproject',
		// 	credential: 'openrelayproject'
		// },
		// {
		// 	urls: 'turn:openrelay.metered.ca:443?transport=tcp',
		// 	username: 'openrelayproject',
		// 	credential: 'openrelayproject'
		// }
	]
};

export class WebRTC {
	private connection: RTCPeerConnection | null = null;
	private sendChannel: any;
	private receiveChannel: any;
	private isSendChannelOpen = false;
	private isReceiveChannelOpen = false;

	public static instance: WebRTC;

	private constructor() {
		this.connection = new RTCPeerConnection(configuration);
	}

	createConnection() {
		// this.sendChannel = this.connection?.createDataChannel('sendDataChannel');
		// this.connection.ondatachannel = (event) => (this.receiveChannel = event.channel);
		// this.sendChannel.onopen = () =>
		// 	(this.isSendChannelOpen = this.sendChannel?.readyState === 'open');
		// this.sendChannel.onclose = () =>
		// 	(this.isSendChannelOpen = this.sendChannel?.readyState === 'open');
		// this.receiveChannel.onopen = () =>
		// 	(this.isReceiveChannelOpen = this.receiveChannel?.readyState === 'open');
		// this.receiveChannel.onclose = () =>
		// 	(this.isReceiveChannelOpen = this.receiveChannel?.readyState === 'open');
	}

	public static getInstance() {
		if (!WebRTC.instance) {
			WebRTC.instance = new WebRTC();
		}
		return WebRTC.instance;
	}

	public setOnIceCandidate(handler: (event: Event) => void) {
		if (this.connection) this.connection.onicecandidate = handler;
	}

	public setOnTrack(handler: (event: Event) => void) {
		if (this.connection) this.connection.ontrack = handler;
	}

	public addTrack(track, stream) {
		this.connection?.addTrack(track, stream!);
	}

	public onReceiveChannelMessage(handler: (event: Event) => void) {
		if (this.receiveChannel) this.receiveChannel.onmessage = handler;
	}

	public getIsReceiveChannelOpen() {
		return this.isReceiveChannelOpen;
	}

	public getIsSendChannelOpen() {
		return this.isSendChannelOpen;
	}

	public close() {
		this.connection = null;
		//TODO
	}

	public send(data: any) {
		this.sendChannel.send(data);
	}

	public getConnectObject() {
		return this.connection;
	}
}
