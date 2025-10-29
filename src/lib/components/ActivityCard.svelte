<script lang="ts">
	import type { Activity } from '$lib/types';
	
	interface Props {
		activity: Activity;
		onDelete?: (id: number) => void;
	}
	
	let { activity, onDelete }: Props = $props();
	
	let showDeleteConfirm = $state(false);
	
	function formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		
		if (hours > 0) {
			return `${hours}h ${minutes}m ${secs}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	}
	
	function formatDistance(meters: number): string {
		if (meters >= 1000) {
			return `${(meters / 1000).toFixed(2)} km`;
		}
		return `${meters.toFixed(0)} m`;
	}
	
	function formatSpeed(mps: number): string {
		const kmh = mps * 3.6;
		return `${kmh.toFixed(1)} km/h`;
	}
	
	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
	
	function getActivityIcon(type: string): string {
		switch (type) {
			case 'running': return '🏃';
			case 'cycling': return '🚴';
			case 'walking': return '🚶';
			case 'hiking': return '🥾';
			default: return '📍';
		}
	}
	
	function getActivityTypeColor(type: string): string {
		switch (type) {
			case 'running': return 'bg-red-100 text-red-800';
			case 'cycling': return 'bg-blue-100 text-blue-800';
			case 'walking': return 'bg-green-100 text-green-800';
			case 'hiking': return 'bg-orange-100 text-orange-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}
	
	function handleDelete() {
		if (onDelete) {
			onDelete(activity.id);
		}
		showDeleteConfirm = false;
	}
	
	function cancelDelete() {
		showDeleteConfirm = false;
	}
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
	<!-- Header -->
	<div class="flex justify-between items-start mb-4">
		<div class="flex items-center space-x-3">
			<span class="text-2xl">{getActivityIcon(activity.type)}</span>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">{activity.name}</h3>
				<p class="text-sm text-gray-500">{formatDate(activity.startTime)}</p>
			</div>
		</div>
		
		<div class="flex items-center space-x-2">
			<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getActivityTypeColor(activity.type)}">
				{activity.type}
			</span>
			
			{#if onDelete}
				<button
					onclick={() => showDeleteConfirm = true}
					class="p-1 text-gray-400 hover:text-red-500 transition-colors"
					title="Delete activity"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
					</svg>
				</button>
			{/if}
		</div>
	</div>
	
	<!-- Stats Grid -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="text-center">
			<div class="text-2xl font-bold text-gray-900">{formatDistance(activity.distance)}</div>
			<div class="text-sm text-gray-500">Distance</div>
		</div>
		
		<div class="text-center">
			<div class="text-2xl font-bold text-gray-900">{formatDuration(activity.duration)}</div>
			<div class="text-sm text-gray-500">Duration</div>
		</div>
		
		<div class="text-center">
			<div class="text-2xl font-bold text-gray-900">{formatSpeed(activity.averageSpeed)}</div>
			<div class="text-sm text-gray-500">Avg Speed</div>
		</div>
		
		<div class="text-center">
			<div class="text-2xl font-bold text-gray-900">{activity.elevationGain.toFixed(0)}m</div>
			<div class="text-sm text-gray-500">Elevation</div>
		</div>
	</div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-sm mx-4">
			<h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Activity</h3>
			<p class="text-gray-600 mb-4">
				Are you sure you want to delete "{activity.name}"? This action cannot be undone.
			</p>
			<div class="flex space-x-3">
				<button
					onclick={cancelDelete}
					class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={handleDelete}
					class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}