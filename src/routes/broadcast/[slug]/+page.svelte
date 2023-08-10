<!-- App.svelte -->
<script lang="ts">
	import { RoomManager } from '$lib';
	import { onMount } from 'svelte';
	import { user } from '../../../stores';

	let userId = $user.id;

	let roomManager: RoomManager | null = null;

	onMount(() => {
		if ($user) roomManager = RoomManager.getInstance($user);
		roomManager?.setOnTrack((event: any) => {
			if (video.srcObject !== event.streams[0]) {
				video.srcObject = event.streams[0];
			}
		});
		console.log(roomManager);
	});
	let video: HTMLVideoElement;

	const handleFileChange = (event: any) => {
		const file = event.target.files[0];
		if (file) {
			const fileUrl = URL.createObjectURL(file);
			video.src = fileUrl;
		}
	};

	const onVideoFileChange = (event: any) => {
		roomManager?.broadcast(video.captureStream(), userId);
	};
</script>

<video id="user1" on:loadeddata={onVideoFileChange} bind:this={video} controls
	><track kind="captions" /></video
>

<input type="file" on:change={handleFileChange} />
{`userID: ${userId}`}

<button on:click={() => roomManager?.broadcast(video.captureStream(), userId)}>Broadcast</button>
