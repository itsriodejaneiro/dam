<script lang="ts">
	import JourneyView from '$lib/components/JourneyView.svelte';

	let { data } = $props();
</script>

{#key data.id}
	<JourneyView journey={data.journey} />
{/key}
