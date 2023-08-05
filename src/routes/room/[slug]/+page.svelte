<!-- App.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { WebSocketClient, WebRTC } from '$lib';

	import { onDestroy, onMount } from 'svelte';
	import { v4 } from 'uuid';

	let id = v4();
	let wsc: WebSocketClient | null = null;
	let wrtc: WebRTC | null = null;
	let roomId = $page.params.slug;

	onMount(() => {
		wsc = WebSocketClient.getInstance();
		wrtc = WebRTC.getInstance();

		// Handle incoming messages from the signaling server
		wsc.setOnMessage((event) => {
			if (!wrtc?.getConnectObject()) return;
			const message = JSON.parse(event.data);
			console.log(message, 'room');

			if (message.type === 'offer') {
				gotOffer(message);
			} else if (message.type === 'answer') {
				gotAnswer(message);
			} else if (message.type === 'iceCandidate') {
				onIceCandidate(message);
			}
		});

		wsc?.setOnConnected(() => {
			setupWebRTC();
			joinRoom();
		});
	});

	function joinRoom() {
		console.log('joining room', roomId);
		if (roomId) {
			wsc?.send({
				roomId: roomId,
				command: 'createRoom'
			});
		}
	}

	function setupWebRTC() {
		wrtc?.createConnection();

		wrtc?.setOnIceCandidate((event: any) => {
			if (event.candidate) {
				wsc?.send({ id, candidate: event.candidate, type: 'iceCandidate', roomId });
			}
		});

		if (stream) {
			stream.getTracks().forEach((track) => {
				console.log(track.id);
				wrtc?.getConnectObject()!.addTrack(track, stream!);
			});
		}

		wrtc?.setOnTrack((event: any) => {
			if (video2.srcObject !== event.streams[0]) {
				video2.srcObject = event.streams[0];
			}
		});

		wrtc
			?.getConnectObject()
			?.createOffer()
			.then(
				(desc) => {
					wrtc?.getConnectObject()?.setLocalDescription(desc);
					wsc?.send({ id, desc, type: 'offer', roomId });
				},
				(e) => console.log(`Error creating offer ${JSON.stringify(e)}`)
			);
	}

	onDestroy(() => {
		wsc?.close();
		wrtc?.close();
	});

	let video1: HTMLVideoElement, stream: MediaStream, video2: HTMLVideoElement;

	const gotOffer = (message) => {
		if (message?.id !== id) {
			wrtc?.getConnectObject()?.setRemoteDescription(message.desc);
			wrtc
				?.getConnectObject()
				?.createAnswer()
				.then(
					(desc) => {
						wrtc?.getConnectObject()?.setLocalDescription(desc);
						wsc?.send({ id, desc, type: 'answer', roomId });
					},
					(e) => console.log(`Error creating SDP ${JSON.stringify(e)}`)
				);
		}
	};

	const gotAnswer = (message) => {
		if (message?.id !== id) {
			wrtc?.getConnectObject()?.setRemoteDescription(message?.desc);
		}
	};

	const onIceCandidate = (message) => {
		if (message?.id !== id && message?.candidate) {
			wrtc
				?.getConnectObject()
				?.addIceCandidate(message.candidate)
				.then(() => console.log(`Added IceCandidate`))
				.catch((error) => console.log(`Error in adding IceCandidate ${JSON.stringify(error)}`));
		}
	};

	const handleFileChange = (event: any) => {
		const file = event.target.files[0];
		if (file) {
			const fileUrl = URL.createObjectURL(file);
			video1.src = fileUrl;

			// Get the MediaStream from the video element
			//@ts-ignore
			stream = video1.captureStream();
			if (stream) {
				console.log(stream.getTracks());
				stream.getTracks().forEach((track) => {
					wrtc?.getConnectObject()?.addTrack(track, stream!);
					console.log(wrtc, 'wow');
				});
			}
		}
	};
</script>

<main>
	<button disabled={false} on:click={setupWebRTC}>Start</button>
	<textarea id="dataChannelSend" disabled={!wrtc?.getIsSendChannelOpen()} />
	<button on:click={wrtc?.send} disabled={!wrtc?.getIsSendChannelOpen()}>Send</button>
	<textarea id="dataChannelReceive" disabled={!wrtc?.getIsSendChannelOpen()} />
</main>

<video id="user1" bind:this={video1} controls><track kind="captions" /></video>

<video id="user2" bind:this={video2} controls><track kind="captions" /></video>

<input type="file" on:change={handleFileChange} />

<button
	on:click={() => {
		wsc?.send('Hello world');
	}}>send message</button
>
