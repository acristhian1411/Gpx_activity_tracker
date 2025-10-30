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

<div class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
	<!-- Header -->
	<a href="/activities/{activity.id}" class="block p-6 pb-4">
		<div class="flex justify-between items-start mb-4">
			<div class="flex items-center space-x-3">
				<span class="text-2xl">{getActivityIcon(activity.type)}</span>
				<div>
					<h3 class="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">{activity.name}</h3>
					<p class="text-sm text-gray-500">{formatDate(activity.startTime)}</p>
				</div>
			</div>
			
			<div class="flex items-center space-x-2">
				<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getActivityTypeColor(activity.type)}">
					{activity.type}
				</span>
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
	</a>
	
	<!-- Action buttons outside the link -->
	<div class="px-6 pb-4">
		<div class="flex space-x-2">
			<a
				href="/map/{activity.id}"
				class="flex-1 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors text-center flex items-center justify-center"
				title="Generate shareable map"
			>
				<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
				</svg>
				Generate Map
			</a>
			{#if onDelete}
				<button
					onclick={() => showDeleteConfirm = true}
					class="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
					title="Delete activity"
				>
					Delete
				</button>
			{/if}
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