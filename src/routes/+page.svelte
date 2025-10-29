<script lang="ts">
	import DashboardStats from '$lib/components/DashboardStats.svelte';
</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
		<div class="text-sm text-gray-500">
			Your activity overview
		</div>
	</div>
	
	<DashboardStats />
</div>
