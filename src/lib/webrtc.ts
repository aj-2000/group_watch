export class WebRTC {
	private connection: RTCPeerConnection | null = null;
	private sendChannel: any;
	private receiveChannel: any;
	private isSendChannelOpen = false;
	private isReceiveChannelOpen = false;

	public static instance: WebRTC;

	private constructor() {
		this.connection = new RTCPeerConnection(null);
	}

	createConnection() {
		const configuration = {
			iceServers: [
				// { urls: 'stun:stun.l.google.com:19302' },
				// { urls: 'stun:stun1.l.google.com:19302' },
				// { urls: 'stun:stun2.l.google.com:19302' },
				// { urls: 'stun:stun3.l.google.com:19302' },
				{ urls: 'stun:stun4.l.google.com:19302' }
			]
		};
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

	setOnIceCandidate(handler: (event: Event) => void) {
		if (this.connection) this.connection.onicecandidate = handler;
	}

	setOnTrack(handler: (event: Event) => void) {
		if (this.connection) this.connection.ontrack = handler;
	}

	addTrack(track, stream) {
		this.connection?.addTrack(track, stream!);
	}

	onReceiveChannelMessage(handler: (event: Event) => void) {
		if (this.receiveChannel) this.receiveChannel.onmessage = handler;
	}

	getIsReceiveChannelOpen() {
		return this.isReceiveChannelOpen;
	}

	getIsSendChannelOpen() {
		return this.isSendChannelOpen;
	}

	close() {
		this.connection = null;
		//TODO
	}

	send(data: any) {
		this.sendChannel.send(data);
	}

	getConnectObject() {
		return this.connection;
	}
}
