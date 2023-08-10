<script lang="ts">
	import { goto } from '$app/navigation';
	import { WebSocketClient } from '$lib';
	import { onMount } from 'svelte';
	import { v4 as uuidv4 } from 'uuid';
	import { user } from '../stores';

	let wsc: WebSocketClient | null;
	let roomId: string = '';
	let userId: string = $user.id;

	onMount(() => {
		wsc = WebSocketClient.getInstance($user);
	});

	function handleQuickCreateRoom() {
		let roomId = uuidv4();
		wsc?.makeMeBroadcaster();
		wsc?.createRoom('Ajay Room', 'a', userId);
		goto(`/broadcast/${'a'}`);
	}

	function handleJoinRoom() {
		if (!roomId) return;
		wsc?.joinRoom(roomId, userId);
		goto(`/watch/${roomId}`);
	}
</script>

<button on:click={handleQuickCreateRoom} class="text-green-700"> Quick Create </button>

<button on:click={handleJoinRoom}> Join </button>
<input type="text" bind:value={roomId} />
<pre> {JSON.stringify(wsc)} </pre>
<!-- 
<button on:click={() => handleQuickCreateRoom()} disabled={!!wsc && !!wsc.isConnected()}>
	Quick Create Room
</button> -->
