<script lang="ts">
	import { onMount } from 'svelte';
	import type { Activity, ActivityListResponse } from '$lib/types';
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	
	let activities: Activity[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let sortBy = $state<'date' | 'distance' | 'duration'>('date');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	
	onMount(() => {
		loadActivities();
	});
	
	async function loadActivities() {
		try {
			loading = true;
			error = null;
			
			const response = await fetch('/api/activities');
			const result: ActivityListResponse = await response.json();
			
			if (result.success && result.data) {
				// Convert date strings back to Date objects
				activities = result.data.map(activity => ({
					...activity,
					startTime: new Date(activity.startTime),
					endTime: new Date(activity.endTime),
					createdAt: new Date(activity.createdAt),
					updatedAt: new Date(activity.updatedAt)
				}));
				
				sortActivities();
			} else {
				error = result.error?.message || 'Failed to load activities';
			}
		} catch (err) {
			console.error('Error loading activities:', err);
			error = 'Failed to load activities';
		} finally {
			loading = false;
		}
	}
	
	function sortActivities() {
		activities = [...activities].sort((a, b) => {
			let aValue: number;
			let bValue: number;
			
			switch (sortBy) {
				case 'date':
					aValue = a.startTime.getTime();
					bValue = b.startTime.getTime();
					break;
				case 'distance':
					aValue = a.distance;
					bValue = b.distance;
					break;
				case 'duration':
					aValue = a.duration;
					bValue = b.duration;
					break;
				default:
					aValue = a.startTime.getTime();
					bValue = b.startTime.getTime();
			}
			
			return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
		});
	}
	
	function handleSortChange(newSortBy: typeof sortBy) {
		if (sortBy === newSortBy) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = newSortBy;
			sortOrder = 'desc';
		}
		sortActivities();
	}
	
	async function handleDeleteActivity(activityId: number) {
		try {
			const response = await fetch(`/api/activities/${activityId}`, {
				method: 'DELETE'
			});
			
			if (response.ok) {
				activities = activities.filter(activity => activity.id !== activityId);
			} else {
				const result = await response.json();
				error = result.error?.message || 'Failed to delete activity';
			}
		} catch (err) {
			console.error('Error deleting activity:', err);
			error = 'Failed to delete activity';
		}
	}
	
	function getSortIcon(field: typeof sortBy): string {
		if (sortBy !== field) return '↕️';
		return sortOrder === 'asc' ? '↑' : '↓';
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold text-gray-900">Activities</h1>
		<div class="text-sm text-gray-500">
			{activities.length} {activities.length === 1 ? 'activity' : 'activities'}
		</div>
	</div>
	
	<!-- Error Message -->
	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-md p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				</div>
				<div class="ml-3">
					<p class="text-sm text-red-800">{error}</p>
				</div>
				<div class="ml-auto pl-3">
					<button
						onclick={() => error = null}
						class="inline-flex text-red-400 hover:text-red-600"
					>
						<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Loading State -->
	{#if loading}
		<div class="text-center py-12">
			<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<p class="mt-2 text-gray-500">Loading activities...</p>
		</div>
	{:else if activities.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12">
			<div class="text-6xl mb-4">🏃</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
			<p class="text-gray-500 mb-6">Upload your first GPX file to get started tracking your activities.</p>
			<a 
				href="/upload"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
			>
				Upload GPX File
			</a>
		</div>
	{:else}
		<!-- Sort Controls -->
		<div class="flex flex-wrap gap-2 items-center">
			<span class="text-sm text-gray-500">Sort by:</span>
			<button
				onclick={() => handleSortChange('date')}
				class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors
					{sortBy === 'date' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
			>
				Date {getSortIcon('date')}
			</button>
			<button
				onclick={() => handleSortChange('distance')}
				class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors
					{sortBy === 'distance' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
			>
				Distance {getSortIcon('distance')}
			</button>
			<button
				onclick={() => handleSortChange('duration')}
				class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors
					{sortBy === 'duration' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
			>
				Duration {getSortIcon('duration')}
			</button>
		</div>
		
		<!-- Activities List -->
		<div class="space-y-4">
			{#each activities as activity (activity.id)}
				<ActivityCard 
					{activity} 
					onDelete={handleDeleteActivity}
				/>
			{/each}
		</div>
	{/if}
</div>