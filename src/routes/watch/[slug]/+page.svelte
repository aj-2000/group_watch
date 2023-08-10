<script lang="ts">
	import { RoomManager } from '$lib';
	import { onMount } from 'svelte';
	import { user } from '../../../stores';

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
</script>

<video id="user2" bind:this={video} controls autoplay><track kind="captions" /></video>

<button
	on:click={() => {
		roomManager?.sendMessage('Hello world');
	}}>send message</button
>

<span> WS connected: {roomManager?.isConnected()}</span>
