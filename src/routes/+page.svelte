<script lang="ts">
	import { goto } from '$app/navigation';
	import { RoomManager } from '$lib';
	import { onMount } from 'svelte';
	import { v4 as uuidv4 } from 'uuid';
	import { user } from '../stores';
	let roomManager: RoomManager | null;

	let roomId: string = '';
	let userId: string = $user.id;

	onMount(() => {
		roomManager = RoomManager.getInstance($user);
	});

	function handleQuickCreateRoom() {
		let roomId = uuidv4();
		roomManager?.makeMeBroadCaster(userId);
		roomManager?.createRoom('Ajay Room', 'a', userId);
		goto(`/broadcast/${'a'}`);
	}

	function handleJoinRoom() {
		if (!roomId) return;
		roomManager?.joinRoom(roomId, userId);
		goto(`/watch/${roomId}`);
	}
</script>

<button on:click={handleQuickCreateRoom} class="text-green-700"> Quick Create </button>

<button on:click={handleJoinRoom}> Join </button>
<input type="text" bind:value={roomId} />
<pre> {JSON.stringify(roomManager)} </pre>
<!-- 
<button on:click={() => handleQuickCreateRoom()} disabled={!!wsc && !!wsc.isConnected()}>
	Quick Create Room
</button> -->
