<!-- App.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { WebSocketClient } from '$lib';
	import { onMount } from 'svelte';
	import { user } from '../../../stores';

	let wsc: WebSocketClient | null = null;
	let userId = $user.id;

	onMount(() => {
		if ($user) wsc = WebSocketClient.getInstance($user);
		console.log(wsc);
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
		wsc?.broadcast(video.captureStream(), userId);
	};
</script>

<video id="user1" on:loadeddata={onVideoFileChange} bind:this={video} controls
	><track kind="captions" /></video
>

<input type="file" on:change={handleFileChange} />
{`userID: ${userId}`}

<button on:click={() => wsc?.broadcast(video.captureStream(), userId)}>Broadcast</button>
