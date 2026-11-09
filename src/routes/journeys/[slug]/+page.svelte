<script lang="ts">
	import JourneyView from '$lib/components/JourneyView.svelte';

	let { data } = $props();
</script>

{#key data.journey.id}
	<JourneyView journey={data.journey} steps={data.steps} />
{/key}
