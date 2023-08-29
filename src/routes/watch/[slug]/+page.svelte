<script lang="ts">
	import { RoomManager } from '$lib';
	import { onMount } from 'svelte';

	import { goto } from '$app/navigation';
	import { user } from '../../../stores';

	let roomManager: RoomManager | null = null;

	onMount(() => {
		if ($user) {
			roomManager = RoomManager.getInstance($user);
			if (!roomManager.getCurrentRoom()) {
				goto('/');
				return;
			}
			roomManager.setOnTrack((event: any) => {
				if (video.srcObject !== event.streams[0]) {
					video.srcObject = event.streams[0];
				}
			});
		}
	});

	let video: HTMLVideoElement;
</script>

<video id="user2" bind:this={video} controls autoplay><track kind="captions" /></video>

<span> WS connected: {roomManager?.isConnected()}</span>
