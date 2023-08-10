<script lang="ts">
	import { WebSocketClient } from '$lib';
	import { onMount } from 'svelte';
	import { user } from '../../../stores';

	let wsc: WebSocketClient | null = null;

	onMount(() => {
		if (user) wsc = WebSocketClient.getInstance($user);
		wsc?.setOnTrack((event: any) => {
			if (video.srcObject !== event.streams[0]) {
				video.srcObject = event.streams[0];
			}
		});
		console.log(wsc);
	});

	let video: HTMLVideoElement;
</script>

<video id="user2" bind:this={video} controls autoplay><track kind="captions" /></video>

<button
	on:click={() => {
		wsc?.send('Hello world');
	}}>send message</button
>

<span> WS connected: {wsc?.isConnected()}</span>
