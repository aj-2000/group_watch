<script lang="ts">
	import { goto } from '$app/navigation';
	import { WebSocketClient } from '$lib';
	import { onMount } from 'svelte';
	import { v4 } from 'uuid';

	let wsc;

	onMount(() => {
		wsc = WebSocketClient.getInstance();
		wsc.setOnMessage(({ data }) => {
			const message = JSON.parse(data);
			console.log(message, 'home');

			if (message.roomId) {
				goto(`/room/${message.roomId}`);
			}
		});
	});

	function handleQuickCreateRoom() {
		const roomId = v4();
		wsc?.send({
			roomId: roomId,
			command: 'createRoom'
		});
	}
</script>

<button on:click={() => goto('/room/join')}> Join Room </button>

<button on:click={() => goto('/room/create')}> Create Room </button>

<button on:click={() => handleQuickCreateRoom()} disabled={!!wsc && !!wsc.isConnected()}>
	Quick Create Room
</button>
