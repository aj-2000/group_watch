<!-- App.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import uuid from 'uuid';
	const signalingServerUrl = 'ws://localhost:8080';
	let id = uuid.v4();
	let ws: WebSocket;

	let video1: HTMLVideoElement, stream: MediaStream, video2: HTMLVideoElement;

	let localConnection: any;
	let remoteConnection: any;
	let sendChannel: any;
	let receiveChannel: any;
	let dataChannelSendValue = '';
	let dataChannelReceiveValue = '';
	let isSendChannelOpen = false;

	onMount(() => {
		ws = new WebSocket(signalingServerUrl);
		console.log(ws);

		// Handle incoming messages from the signaling server
		ws.onmessage = (event) => {
			const message = JSON.parse(event.data);

			if (message.type === 'offer') {
				gotOffer(message);
			} else if (message.type === 'answer') {
				gotDescription2(message);
			} else if (message.type === 'iceCandidate') {
				onIceCandidate(localConnection!, message);
			}
		};
	});

	const createConnection = () => {
		const servers = null;
		localConnection = localConnection = new RTCPeerConnection(servers);
		console.log('Created local peer connection object localConnection');

		sendChannel = localConnection.createDataChannel('sendDataChannel');
		console.log('Created send data channel');

		localConnection.onicecandidate = (e) => {
			onIceCandidate(localConnection, e);
		};
		sendChannel.onopen = onSendChannelStateChange;
		sendChannel.onclose = onSendChannelStateChange;

		if (stream) {
			stream.getTracks().forEach((track) => {
				localConnection!.addTrack(track, stream!);
			});
		}

		remoteConnection = remoteConnection = new RTCPeerConnection(servers);
		console.log('Created remote peer connection object remoteConnection');

		remoteConnection.onicecandidate = (e) => {
			onIceCandidate(remoteConnection, e);
		};
		remoteConnection.ondatachannel = receiveChannelCallback;
		remoteConnection.ontrack = (event) => {
			// Event contains the received MediaStreamTrack
			// You can attach it to the video element as shown below
			if (video2.srcObject !== event.streams[0]) {
				video2.srcObject = event.streams[0];
			}
		};

		localConnection
			.createOffer()
			.then((desc) => sendMessage({ id, desc, type: 'offer' }), onCreateSessionDescriptionError);
	};

	// Function to send data to the signaling server
	const sendMessage = (message: any) => {
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
		}
		console.log(ws);
	};

	const sendData = () => {
		sendChannel.send(dataChannelSendValue);
		console.log('Sent Data: ' + dataChannelSendValue);
	};

	const closeDataChannels = () => {
		console.log('Closing data channels');
		sendChannel.close();
		console.log('Closed data channel with label: ' + sendChannel.label);
		receiveChannel.close();
		console.log('Closed data channel with label: ' + receiveChannel.label);
		localConnection.close();
		remoteConnection.close();
		localConnection = null;
		remoteConnection = null;
		console.log('Closed peer connections');
		dataChannelSendValue = '';
		dataChannelReceiveValue = '';
	};

	const gotDescription1 = (desc) => {
		localConnection.setLocalDescription(desc);
		console.log(`Offer from localConnection\n${desc.sdp}`);
		sendMessage({ type: 'offer', desc: desc });
		remoteConnection.setRemoteDescription(desc);
		remoteConnection.createAnswer().then(gotDescription2, onCreateSessionDescriptionError);
	};

	const gotDescription2 = (desc) => {
		remoteConnection.setLocalDescription(desc);
		console.log(`Answer from remoteConnection\n${desc.sdp}`);
		localConnection.setRemoteDescription(desc);
	};

	const getOtherPc = (pc) => {
		return pc === localConnection ? remoteConnection : localConnection;
	};

	const getName = (pc) => {
		return pc === localConnection ? 'localPeerConnection' : 'remotePeerConnection';
	};

	const onIceCandidate = (pc, event) => {
		getOtherPc(pc)
			.addIceCandidate(event.candidate)
			.then(onAddIceCandidateSuccess, onAddIceCandidateError);
		console.log(
			`${getName(pc)} ICE candidate: ${event.candidate ? event.candidate.candidate : '(null)'}`
		);
	};

	function onAddIceCandidateSuccess() {
		console.log('AddIceCandidate success.');
	}

	function onAddIceCandidateError(error) {
		console.log(`Failed to add Ice Candidate: ${error.toString()}`);
	}
	function receiveChannelCallback(event) {
		console.log('Receive Channel Callback');
		receiveChannel = event.channel;
		receiveChannel.onmessage = onReceiveMessageCallback;
		receiveChannel.onopen = onReceiveChannelStateChange;
		receiveChannel.onclose = onReceiveChannelStateChange;
	}

	const onReceiveMessageCallback = (event) => {
		dataChannelReceiveValue = event.data;
	};

	const onSendChannelStateChange = () => {
		const readyState = sendChannel.readyState;
		isSendChannelOpen = readyState === 'open';
	};

	const onReceiveChannelStateChange = () => {
		const readyState = receiveChannel.readyState;
		console.log(`Receive channel state is: ${readyState}`);
	};

	function onCreateSessionDescriptionError(error) {
		console.log('Failed to create session description: ' + error.toString());
	}

	const handleFileChange = (event: any) => {
		const file = event.target.files[0];
		if (file) {
			const fileUrl = URL.createObjectURL(file);
			video1.src = fileUrl;

			// Get the MediaStream from the video element
			//@ts-ignore
			stream = video1.captureStream();
			// video2.srcObject = stream;
			// You can use the 'stream' variable as needed
		}
	};
</script>

<main>
	<button on:click={createConnection} disabled={isSendChannelOpen}>Start</button>
	<textarea id="dataChannelSend" bind:value={dataChannelSendValue} disabled={!isSendChannelOpen} />
	<button on:click={sendData} disabled={!isSendChannelOpen}>Send</button>
	<textarea
		id="dataChannelReceive"
		bind:value={dataChannelReceiveValue}
		disabled={!isSendChannelOpen}
	/>
	<button on:click={closeDataChannels} disabled={!isSendChannelOpen}>Close</button>
</main>

<video id="user1" bind:this={video1} controls><track kind="captions" /></video>

<video id="user1" bind:this={video2} controls><track kind="captions" /></video>

<input type="file" on:change={handleFileChange} />

<button
	on:click={() => {
		sendMessage('Hello world');
	}}>send message</button
>
