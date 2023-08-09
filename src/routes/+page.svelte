<script lang="ts">
	import { goto } from '$app/navigation';
	import { WebSocketClient } from '$lib';
	import { onMount } from 'svelte';
	import { user } from '../stores';
	import { v4 as uuidv4 } from 'uuid';

	let wsc;
	let roomId: string = '';
	let userId = $user.id;

	onMount(() => {
		wsc = WebSocketClient.getInstance();
		wsc.setOnMessage(({ data }) => {
			const message = JSON.parse(data);
			//TODO: isBroadcaster correct logic
			if (message.roomId) {
				message.roomId === roomId
					? goto(`/watch/${message.roomId}`)
					: goto(`/broadcast/${message.roomId}`);
			}
		});
	});

	function handleQuickCreateRoom() {
		const roomId = uuidv4();
		console.log(wsc);
		wsc?.send({
			roomId,
			command: 'createRoom',
			userId
		});
	}

	function handleJoinRoom() {
		if (!roomId) return;
		console.log(wsc);
		wsc?.send({
			roomId,
			command: 'createRoom',
			userId
		});
	}
</script>

<button on:click={handleQuickCreateRoom} class="text-green-700"> Quick Create </button>

<button on:click={handleJoinRoom}> Join </button>
<input type="text" bind:value={roomId} />
<!-- 
<button on:click={() => handleQuickCreateRoom()} disabled={!!wsc && !!wsc.isConnected()}>
	Quick Create Room
</button> -->
