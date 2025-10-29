<script lang="ts">
	import { onMount } from 'svelte';
	import StatsWidget from './StatsWidget.svelte';
	import { statsLoading, statsError, formattedStats, fetchStats } from '$lib/stores/stats';

	onMount(() => {
		fetchStats();
	});

	// Auto-refresh stats when component becomes visible (e.g., after adding new activity)
	function handleVisibilityChange() {
		if (!document.hidden) {
			fetchStats();
		}
	}

	onMount(() => {
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});
</script>

<div class="space-y-6">
	{#if $statsError}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<span class="text-red-400">⚠</span>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Error loading statistics</h3>
					<p class="mt-1 text-sm text-red-700">{$statsError}</p>
					<button 
						on:click={fetchStats}
						class="mt-2 text-sm text-red-600 hover:text-red-500 underline"
					>
						Try again
					</button>
				</div>
			</div>
		</div>
	{:else if !$formattedStats && !$statsLoading}
		<div class="text-center py-8">
			<p class="text-gray-500">No statistics available</p>
			<button 
				on:click={fetchStats}
				class="mt-2 text-blue-600 hover:text-blue-500 underline"
			>
				Refresh
			</button>
		</div>
	{:else}
		<!-- Overall Statistics -->
		<div>
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Overall Statistics</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatsWidget
					title="Total Distance"
					value={$formattedStats?.totalDistance || '0 km'}
					icon="🏃"
					loading={$statsLoading}
				/>
				
				<StatsWidget
					title="Total Activities"
					value={$formattedStats?.totalActivities || '0'}
					icon="📊"
					loading={$statsLoading}
				/>
				
				<StatsWidget
					title="Total Time"
					value={$formattedStats?.totalDuration || '0s'}
					icon="⏱️"
					loading={$statsLoading}
				/>
				
				<StatsWidget
					title="Longest Distance"
					value={$formattedStats?.longestDistance || 'No activities'}
					subtitle={$formattedStats?.hasActivities ? 'Personal record' : ''}
					icon="🏆"
					loading={$statsLoading}
				/>
			</div>
		</div>

		<!-- Monthly Comparison -->
		{#if $formattedStats?.hasActivities}
			<div>
				<h2 class="text-lg font-semibold text-gray-900 mb-4">This Month vs Last Month</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<StatsWidget
						title="Distance This Month"
						value={$formattedStats?.currentMonthDistance || '0 km'}
						trend={$formattedStats?.distanceChange.trend}
						trendValue={$formattedStats?.distanceChange.formatted}
						icon="📏"
						loading={$statsLoading}
					/>
					
					<StatsWidget
						title="Activities This Month"
						value={$formattedStats?.currentMonthActivities || '0'}
						trend={$formattedStats?.activitiesChange.trend}
						trendValue={$formattedStats?.activitiesChange.formatted}
						icon="🎯"
						loading={$statsLoading}
					/>
					
					<StatsWidget
						title="Time This Month"
						value={$formattedStats?.currentMonthDuration || '0s'}
						trend={$formattedStats?.durationChange.trend}
						trendValue={$formattedStats?.durationChange.formatted}
						icon="⏰"
						loading={$statsLoading}
					/>
				</div>
			</div>
		{/if}

		<!-- Empty State for New Users -->
		{#if !$formattedStats?.hasActivities && !$statsLoading}
			<div class="text-center py-12 bg-gray-50 rounded-lg">
				<div class="text-6xl mb-4">🏃‍♂️</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
				<p class="text-gray-600 mb-4">Upload your first GPX file to start tracking your activities!</p>
				<a 
					href="/upload" 
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					Upload GPX File
				</a>
			</div>
		{/if}
	{/if}
</div>