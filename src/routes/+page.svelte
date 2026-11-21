<script lang="ts">
	import { HomeView } from '$lib/components';

	let { data } = $props();
</script>

<HomeView title={data.home.title} lede={data.home.lede} blocks={data.home.blocks} />
