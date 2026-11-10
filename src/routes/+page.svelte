<script lang="ts">
	import { HomeView } from '$lib/components';

	let { data } = $props();
</script>

<HomeView blocks={data.blocks} />
