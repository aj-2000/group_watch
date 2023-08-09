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
	let participantsList = $participants;
	const connections: any = {};

	onMount(() => {
		wsc = WebSocketClient.getInstance();

		// Handle incoming messages from the signaling server
		wsc.setOnMessage((event) => {
			const message = JSON.parse(event.data);
			console.log(message, 'room');
			if (message.command === 'roomUpdate') {
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

	function joinRoom() {
		console.log('joining room', roomId);
		if (roomId) {
			wsc?.send({
				roomId,
				userId,
				command: 'createRoom'
			});
		}
	}

	function setupWebRTC() {
		$participants
			.filter((participantUserId) => participantUserId !== userId)
			.forEach((participantUserId) => {
				if (!connections[participantUserId]) {
					console.log(participantUserId, connections[participantUserId]);
					connections[participantUserId] = new RTCPeerConnection(configuration);
					connections[participantUserId].onicecandidate = (event) => {
						onIceCandidateWRTC(event, participantUserId);
					};

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
				}
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

	// const switchStream = (event) => {
	// 	console.log(event);
	// 	//@ts-ignore
	// 	const stream = video.captureStream();

	// 	if (stream) {
	// 		console.log(stream.getTracks());

	// 		// Add tracks to the connections for each participant
	// 		$participants.forEach((participant) => {
	// 			connections[participant]?.addStream(stream);
	// 		});
	// 	}
	// };
</script>

<!-- <main>
	<button disabled={false} on:click={setupWebRTC}>Start</button>
</main> -->

<video id="user1" bind:this={video} controls><track kind="captions" /></video>

<input type="file" on:change={handleFileChange} />
{`userID: ${userId}`}

<button
	on:click={() => {
		wsc?.send('Hello world');
	}}>send message</button
>

<button on:click={() => setupWebRTC()}>Broadcast</button>
