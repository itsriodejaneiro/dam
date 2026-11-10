<script lang="ts">
	import { page } from '$app/state';
	import JourneyView from '$lib/components/JourneyView.svelte';

	let { data } = $props();
</script>

{#key page.params.slug}
	<JourneyView journey={data.journey} />
{/key}
