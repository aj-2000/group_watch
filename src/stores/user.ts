import { writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';

export const user = writable({
	id: uuidv4(),
	isBroadcaster: false
});
