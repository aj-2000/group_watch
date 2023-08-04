<!-- App.svelte -->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { v4 } from 'uuid';
	const signalingServerUrl = 'ws://localhost:8080';
	let id = v4();
	let ws: WebSocket | null = null;

	onMount(() => {
		ws = new WebSocket(signalingServerUrl);
		console.log(ws);

		// Handle incoming messages from the signaling server
		ws.onmessage = (event) => {
			if (!connection) return;
			const message = JSON.parse(event.data);

			if (message.type === 'offer') {
				gotOffer(message);
			} else if (message.type === 'answer') {
				gotAnswer(message);
			} else if (message.type === 'iceCandidate') {
				onIceCandidate(message);
			}
		};

		const servers = null;
		connection = new RTCPeerConnection(servers);
	});

	onDestroy(() => {
		ws = null;
		connection = null;
	});

	let video1: HTMLVideoElement, stream: MediaStream, video2: HTMLVideoElement;

	let connection: any;
	let sendChannel: any;
	let receiveChannel: any;
	let dataChannelSendValue = '';
	let dataChannelReceiveValue = '';
	let isSendChannelOpen = false;

	const createConnection = () => {
		console.log(connection);
		console.log('Created local peer connection object connection');

		sendChannel = connection.createDataChannel('sendDataChannel');
		console.log('Created send data channel');

		connection.onicecandidate = (event) => {
			console.log(event, 'ice');
			if (event.candidate) {
				sendMessage({ id, candidate: event.candidate, type: 'iceCandidate' });
			}
		};

		if (stream) {
			stream.getTracks().forEach((track) => {
				console.log(track.id);
				connection!.addTrack(track, stream!);
			});
		}
		sendChannel.onopen = onSendChannelStateChange;
		sendChannel.onclose = onSendChannelStateChange;

		connection.ondatachannel = receiveChannelCallback;
		connection.ontrack = (event) => {
			console.log(event);
			// Event contains the received MediaStreamTrack
			// You can attach it to the video element as shown below
			if (video2.srcObject !== event.streams[0]) {
				video2.srcObject = event.streams[0];
			}
		};

		connection.createOffer().then((desc) => {
			connection.setLocalDescription(desc);
			sendMessage({ id, desc, type: 'offer' });
		}, onCreateSessionDescriptionError);
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
		connection.close();
		connection = null;
		console.log('Closed peer connections');
		dataChannelSendValue = '';
		dataChannelReceiveValue = '';
	};

	const gotOffer = (message) => {
		if (message?.id !== id) {
			connection.setRemoteDescription(message.desc);
			console.log(`Offer from connection\n${message.desc}`);
			connection.createAnswer().then((desc) => {
				connection.setLocalDescription(desc);
				sendMessage({ id, desc, type: 'answer' });
			}, onCreateSessionDescriptionError);
		}
	};

	const gotAnswer = (message) => {
		if (message?.id !== id) {
			connection.setRemoteDescription(message?.desc);
			console.log(`Answer from remoteConnection\n${message?.desc.sdp}`);
		}
	};

	const onIceCandidate = (message) => {
		if (message?.id !== id && message?.candidate) {
			connection
				.addIceCandidate(message.candidate)
				.then(onAddIceCandidateSuccess)
				.catch(onAddIceCandidateError);
			console.log(`ICE candidate received and added.`, 'id', message.id, message.candidate);
		}
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
			if (stream) {
				console.log(stream);
				stream.getTracks().forEach((track) => {
					connection!.addTrack(track, stream!);
				});
			}
		}
	};
</script>

<main>
	<button on:click={createConnection} disabled={false}>Start</button>
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

<video id="user2" bind:this={video2} controls><track kind="captions" /></video>

<input type="file" on:change={handleFileChange} />

<button
	on:click={() => {
		sendMessage('Hello world');
	}}>send message</button
>
