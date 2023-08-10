<!-- App.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { WebSocketClient } from '$lib';
	import { onDestroy, onMount } from 'svelte';
	import { participants, user } from '../../../stores';
	import { configuration } from '$lib/webrtc';
	import { writable } from 'svelte/store';

	let wsc: WebSocketClient | null = null;
	let roomId = $page.params.slug;
	let userId = $user.id;

	const connections: any = {};

	onMount(() => {
		wsc = WebSocketClient.getInstance();

		// Handle incoming messages from the signaling server
		wsc.setOnMessage((event) => {
			const message = JSON.parse(event.data);
			console.log(message, 'room');
			if (message.command === 'roomUpdate') {
				console.log(message, 'room');
				participants.set(message.participants);
				stream ?? setupWebRTC();
				// } else if (message.type === 'offer') {
				// 	gotOffer(message);
			} else if (message.type === 'answer') {
				gotAnswer(message);
			} else if (message.type === 'iceCandidate') {
				onIceCandidate(message);
			}
		});

		wsc?.setOnConnected(() => {});
	});

	function setupWebRTC() {
		$participants
			.filter((participantUserId) => participantUserId !== userId)
			.forEach((participantUserId) => {
				if (!connections[participantUserId]) {
					connections[participantUserId] = new RTCPeerConnection(configuration);
					connections[participantUserId].onicecandidate = (event) => {
						onIceCandidateWRTC(event, participantUserId);
					};
				}
				console.log(participantUserId, connections[participantUserId]);

				stream.set(video.captureStream());
				if ($stream) {
					console.log($stream, '2');
					$stream.getTracks().forEach((track) => {
						connections[participantUserId].addTrack(track, $stream);
					});
				}
				// connections[participantUserId].ontrack = (event) => {
				// 	handleRemoteTrack(event, participantUserId);
				// }; d
				console.log(participantUserId, connections[participantUserId]);
				createOfferAndSend(participantUserId);
			});
		console.log('webrtc', $participants, connections);
	}

	function onIceCandidateWRTC(event, participantUserId) {
		if (event.candidate) {
			console.log('boy');
			wsc?.send({
				candidate: event.candidate,
				type: 'iceCandidate',
				roomId,
				userId,
				targetUserId: participantUserId
			});
		}
	}

	// function handleRemoteTrack(event, participantUserId) {
	// 	if (video2.srcObject !== event.streams[0]) {
	// 		video2.srcObject = event.streams[0];
	// 	}
	// }

	function createOfferAndSend(participantUserId) {
		connections[participantUserId]
			?.createOffer()
			.then((desc) => {
				connections[participantUserId].setLocalDescription(desc);
				wsc?.send({ desc, type: 'offer', roomId, userId, targetUserId: participantUserId });
			})
			.catch((error) => console.log(`Error creating offer ${JSON.stringify(error)}`));
	}

	onDestroy(() => {
		for (let id in connections) {
			console.log(id);
			connections[id]?.close();
			connections[id] = null;
		}
	});

	let video: HTMLVideoElement;
	const stream = writable(null);

	const gotAnswer = (message) => {
		if (message?.targetUserId === userId) {
			connections[message?.userId].setRemoteDescription(message?.desc);
		}
	};

	const onIceCandidate = (message) => {
		if (message?.targetUserId === userId && message?.candidate) {
			connections[message?.userId]
				?.addIceCandidate(message.candidate)
				.then(() => console.log(`Added IceCandidate`))
				.catch((error) => console.log(`Error in adding IceCandidate ${JSON.stringify(error)}`));
		}
	};

	const handleFileChange = (event: any) => {
		const file = event.target.files[0];
		if (file) {
			const fileUrl = URL.createObjectURL(file);
			video.src = fileUrl;
		}
	};

	const onVideoFileChange = (event: any) => {
		if ($stream && $stream === video.captureStream()) {
			return;
		}
		if (!$stream) return;
		setupWebRTC();
	};
</script>

<video id="user1" bind:this={video} controls><track kind="captions" /></video>

<input type="file" on:change={handleFileChange} />
{`userID: ${userId}`}

<button on:click={() => setupWebRTC()}>Broadcast</button>
