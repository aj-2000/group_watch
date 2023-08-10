<script lang="ts">
	import { page } from '$app/stores';
	import { WebSocketClient } from '$lib';
	import { configuration } from '$lib/webrtc';
	import { onDestroy, onMount } from 'svelte';
	import { user } from '../../../stores';

	let wsc: WebSocketClient | null = null;
	let wrtc: any | null = null;
	let roomId = $page.params.slug;
	let userId = $user.id;

	// Initialize WebSocketClient and RTCPeerConnection outside onMount
	if (typeof window !== 'undefined') {
		wsc = WebSocketClient.getInstance();
		wrtc = new RTCPeerConnection(configuration);
	}

	onMount(() => {
		// Check if the code is running in the browser before setting up WebSocket
		if (typeof WebSocket !== 'undefined') {
			wsc?.setOnMessage((event) => {
				const message = JSON.parse(event.data);
				console.log(message, 'watch');

				if (message.type === 'offer') {
					gotOffer(message);
				} else if (message.type === 'iceCandidate') {
					onIceCandidate(message);
				}
			});

			wsc?.setOnConnected(() => {
				console.log('wsc connected');
				setupWebRTC();
				console.log(wrtc, 'wrtc connected');
			});
		} else {
			console.error('WebSocket is not supported in this environment.');
		}
	});

	function setupWebRTC() {
		if (!wrtc) return;
		console.log(wrtc);

		// wrtc.onicecandidate = (event: any) => {
		// 	if (event.candidate) {
		// 		console.log('icecandidate', event.candidate);
		// 		wsc?.send({
		// 			candidate: event.candidate,
		// 			type: 'iceCandidate',
		// 			roomId,
		// 			userId,
		// 			targetUserId: '1'
		// 		});
		// 	}
		// };

		wrtc.ontrack = (event: any) => {
			if (video.srcObject !== event.streams[0]) {
				video.srcObject = event.streams[0];
			}
		};
	}

	onDestroy(() => {
		wrtc?.close();
		wsc = null;
		wrtc = null;
	});

	let video: HTMLVideoElement;

	const gotOffer = (message) => {
		if (message?.targetUserId === userId) {
			wrtc?.setRemoteDescription(message.desc);
			wrtc?.createAnswer().then(
				(desc) => {
					wrtc?.setLocalDescription(desc);
					wsc?.send({
						desc,
						type: 'answer',
						roomId,
						userId,
						targetUserId: message?.userId
					});
				},
				(e) => console.log(`Error creating SDP ${JSON.stringify(e)}`)
			);
		}
	};

	const onIceCandidate = (message) => {
		if (message?.targetUserId === userId && message?.candidate) {
			wrtc
				?.addIceCandidate(message.candidate)
				.then(() => console.log(`Added IceCandidate`))
				.catch((error) => console.log(`Error in adding IceCandidate ${JSON.stringify(error)}`));
		}
	};
</script>

<video id="user2" bind:this={video} controls autoplay><track kind="captions" /></video>

<button
	on:click={() => {
		wsc?.send('Hello world');
	}}>send message</button
>

<span> WS connected: {wsc?.isConnected()}</span>
