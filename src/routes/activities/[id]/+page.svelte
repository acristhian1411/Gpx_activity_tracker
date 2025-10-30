<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import MapViewer from '$lib/components/MapViewer.svelte';
	import type { Activity, GPSPoint, ActivityType } from '$lib/types';
	import { formatters } from '$lib/utils/formatters';

	// Data
	let activity: Activity | null = null;
	let gpsPoints: GPSPoint[] = [];
	let loading = true;
	let error: string | null = null;

	// Editing state
	let isEditing = false;
	let editedName = '';
	let editedType: ActivityType = 'unknown';
	let saving = false;

	// Map reference for external control
	let mapViewer: MapViewer;

	onMount(async () => {
		await loadActivityData();
	});

	async function loadActivityData() {
		try {
			loading = true;
			error = null;

			const activityId = $page.params.id;

			// Fetch map data (includes activity and GPS points)
			const response = await fetch(`/api/map/${activityId}?simplify=3`);
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error?.message || 'Failed to load activity data');
			}

			activity = result.data.activity;
			gpsPoints = result.data.gpsPoints.map((point: any) => ({
				...point,
				timestamp: new Date(point.timestamp)
			}));

			// Initialize editing values
			if (activity) {
				editedName = activity.name;
				editedType = activity.type;
			}
		} catch (err) {
			console.error('Error loading activity:', err);
			error = err instanceof Error ? err.message : 'Unknown error occurred';
		} finally {
			loading = false;
		}
	}

	function handleZoomToFit() {
		if (mapViewer) {
			mapViewer.zoomToFit();
		}
	}

	function handleDeleteActivity() {
		if (confirm('Are you sure you want to delete this activity?')) {
			deleteActivity();
		}
	}

	async function deleteActivity() {
		if (!activity) return;

		try {
			const response = await fetch(`/api/activities/${activity.id}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (result.success) {
				// Redirect to activities list
				window.location.href = '/activities';
			} else {
				throw new Error(result.error?.message || 'Failed to delete activity');
			}
		} catch (err) {
			console.error('Error deleting activity:', err);
			alert('Failed to delete activity. Please try again.');
		}
	}

	function startEditing() {
		if (!activity) return;
		isEditing = true;
		editedName = activity.name;
		editedType = activity.type;
	}

	function cancelEditing() {
		isEditing = false;
		if (activity) {
			editedName = activity.name;
			editedType = activity.type;
		}
	}

	async function saveActivity() {
		if (!activity || saving) return;

		try {
			saving = true;

			const response = await fetch(`/api/activities/${activity.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: editedName.trim(),
					type: editedType
				})
			});

			const result = await response.json();

			if (result.success) {
				// Update local activity data
				activity = { ...activity, name: editedName.trim(), type: editedType };
				isEditing = false;
			} else {
				throw new Error(result.error?.message || 'Failed to update activity');
			}
		} catch (err) {
			console.error('Error updating activity:', err);
			alert('Failed to update activity. Please try again.');
		} finally {
			saving = false;
		}
	}

	async function shareActivity() {
		if (!activity) return;

		const shareData = {
			title: `${activity.name} - GPX Activity`,
			text: `Check out my ${activity.type} activity: ${formatters.formatDistance(activity.distance)} in ${formatters.formatDuration(activity.duration)}`,
			url: window.location.href
		};

		try {
			if (navigator.share && navigator.canShare(shareData)) {
				await navigator.share(shareData);
			} else {
				// Fallback: copy to clipboard
				await navigator.clipboard.writeText(
					`${shareData.title}\n${shareData.text}\n${shareData.url}`
				);
				alert('Activity details copied to clipboard!');
			}
		} catch (err) {
			console.error('Error sharing activity:', err);
			// Fallback: copy to clipboard
			try {
				await navigator.clipboard.writeText(
					`${shareData.title}\n${shareData.text}\n${shareData.url}`
				);
				alert('Activity details copied to clipboard!');
			} catch (clipboardErr) {
				console.error('Error copying to clipboard:', clipboardErr);
				alert('Unable to share activity. Please copy the URL manually.');
			}
		}
	}
</script>

<svelte:head>
	<title>{activity ? activity.name : 'Activity'} - GPX Activity Tracker</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<nav class="breadcrumbs mb-4 text-sm">
			<a href="/" class="text-blue-600 hover:text-blue-800">Dashboard</a>
			<span class="mx-2 text-gray-400">/</span>
			<a href="/activities" class="text-blue-600 hover:text-blue-800">Activities</a>
			<span class="mx-2 text-gray-400">/</span>
			<span class="text-gray-600">Activity Details</span>
		</nav>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div
					class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"
				></div>
				<p class="text-gray-600">Loading activity...</p>
			</div>
		</div>
	{:else if error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
			<h2 class="mb-2 text-xl font-semibold text-red-800">Error Loading Activity</h2>
			<p class="mb-4 text-red-600">{error}</p>
			<button
				on:click={loadActivityData}
				class="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
			>
				Try Again
			</button>
		</div>
	{:else if activity}
		<!-- Activity Header -->
		<div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-start justify-between">
				<div class="mr-4 flex-1">
					{#if isEditing}
						<!-- Editing Mode -->
						<div class="space-y-3">
							<input
								bind:value={editedName}
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-3xl font-bold text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								placeholder="Activity name"
							/>
							<div class="flex items-center space-x-4">
								<select
									bind:value={editedType}
									class="rounded-lg border border-gray-300 bg-white px-3 py-1 capitalize focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								>
									<option value="running">Running</option>
									<option value="cycling">Cycling</option>
									<option value="walking">Walking</option>
									<option value="hiking">Hiking</option>
									<option value="unknown">Unknown</option>
								</select>
								<span class="text-sm text-gray-600"
									>{formatters.formatDate(activity.startTime)}</span
								>
								<span class="text-sm text-gray-600"
									>{formatters.formatTime(activity.startTime)}</span
								>
							</div>
							<div class="flex space-x-2">
								<button
									on:click={saveActivity}
									disabled={saving || !editedName.trim()}
									class="rounded bg-green-600 px-3 py-1 text-sm text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{saving ? 'Saving...' : 'Save'}
								</button>
								<button
									on:click={cancelEditing}
									disabled={saving}
									class="rounded bg-gray-500 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
								>
									Cancel
								</button>
							</div>
						</div>
					{:else}
						<!-- Display Mode -->
						<div>
							<h1 class="mb-2 text-3xl font-bold text-gray-900">{activity.name}</h1>
							<div class="flex items-center space-x-4 text-sm text-gray-600">
								<span class="rounded bg-gray-100 px-2 py-1 capitalize">{activity.type}</span>
								<span>{formatters.formatDate(activity.startTime)}</span>
								<span>{formatters.formatTime(activity.startTime)}</span>
							</div>
						</div>
					{/if}
				</div>

				<div class="flex flex-wrap gap-2">
					{#if !isEditing}
						<button
							on:click={startEditing}
							class="flex items-center rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
						>
							<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
							Edit
						</button>
					{/if}

					<button
						on:click={shareActivity}
						class="flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
							/>
						</svg>
						Share
					</button>

					<a
						href="/map/{activity.id}"
						class="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
							/>
						</svg>
						Generate Map
					</a>

					<button
						on:click={handleZoomToFit}
						class="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
							/>
						</svg>
						Zoom to Fit
					</button>

					<button
						on:click={handleDeleteActivity}
						class="flex items-center rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
						Delete
					</button>
				</div>
			</div>

			<!-- Activity Stats -->
			<div class="grid grid-cols-2 gap-4 md:grid-cols-6">
				<div class="text-center">
					<div class="text-2xl font-bold text-blue-600">
						{formatters.formatDistance(activity.distance)}
					</div>
					<div class="text-sm text-gray-600">Distance</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600">
						{formatters.formatDuration(activity.duration)}
					</div>
					<div class="text-sm text-gray-600">Duration</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-purple-600">
						{formatters.formatSpeed(activity.averageSpeed)}
					</div>
					<div class="text-sm text-gray-600">Avg Speed</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-red-600">
						{formatters.formatSpeed(activity.maxSpeed)}
					</div>
					<div class="text-sm text-gray-600">Max Speed</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-orange-600">
						{formatters.formatElevation(activity.elevationGain)}
					</div>
					<div class="text-sm text-gray-600">Elevation Gain</div>
				</div>
				<!-- <div class="text-center">
          <div class="text-2xl font-bold text-gray-600">{gpsPoints.length}</div>
          <div class="text-sm text-gray-600">GPS Points</div>
        </div> -->
			</div>
		</div>

		<!-- Map Section -->
		<div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-gray-900">Route Map</h2>
				<div class="text-sm text-gray-600">
					{gpsPoints.length} GPS points
				</div>
			</div>

			{#if gpsPoints.length > 0}
				<MapViewer
					bind:this={mapViewer}
					{gpsPoints}
					height="500px"
					showControls={true}
					fitBounds={true}
				/>
			{:else}
				<div class="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
					<p class="text-gray-600">No GPS data available for this activity</p>
				</div>
			{/if}
		</div>

		<!-- Detailed GPS and Elevation Data -->
		{#if gpsPoints.length > 0}
			<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Elevation Profile -->
				<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Elevation Profile</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Total Elevation Gain:</span>
							<span class="font-semibold">{formatters.formatElevation(activity.elevationGain)}</span
							>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Highest Point:</span>
							<span class="font-semibold">
								{#if gpsPoints.some((p) => p.elevation !== null && p.elevation !== undefined)}
									{formatters.formatElevation(
										Math.max(
											...gpsPoints
												.filter((p) => p.elevation !== null && p.elevation !== undefined)
												.map((p) => p.elevation!)
										)
									)}
								{:else}
									N/A
								{/if}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Lowest Point:</span>
							<span class="font-semibold">
								{#if gpsPoints.some((p) => p.elevation !== null && p.elevation !== undefined)}
									{formatters.formatElevation(
										Math.min(
											...gpsPoints
												.filter((p) => p.elevation !== null && p.elevation !== undefined)
												.map((p) => p.elevation!)
										)
									)}
								{:else}
									N/A
								{/if}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Points with Elevation:</span>
							<span class="font-semibold"
								>{gpsPoints.filter((p) => p.elevation !== null && p.elevation !== undefined).length}
								/ {gpsPoints.length}</span
							>
						</div>
					</div>
				</div>

				<!-- Speed Analysis -->
				<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Speed Analysis</h3>
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Average Speed:</span>
							<span class="font-semibold">{formatters.formatSpeed(activity.averageSpeed)}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Maximum Speed:</span>
							<span class="font-semibold">{formatters.formatSpeed(activity.maxSpeed)}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Average Pace:</span>
							<span class="font-semibold">{formatters.formatPace(activity.averageSpeed)}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-gray-600">Moving Time:</span>
							<span class="font-semibold">{formatters.formatDuration(activity.duration)}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- GPS Data Summary -->
			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">GPS Data Summary</h3>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
					<div>
						<h4 class="mb-2 font-medium text-gray-900">Start Location</h4>
						<div class="space-y-1 text-sm text-gray-600">
							<div>Lat: {gpsPoints[0].latitude.toFixed(6)}</div>
							<div>Lng: {gpsPoints[0].longitude.toFixed(6)}</div>
							{#if gpsPoints[0].elevation !== null && gpsPoints[0].elevation !== undefined}
								<div>Elevation: {formatters.formatElevation(gpsPoints[0].elevation!)}</div>
							{/if}
							<div>Time: {formatters.formatTime(gpsPoints[0].timestamp)}</div>
						</div>
					</div>

					<div>
						<h4 class="mb-2 font-medium text-gray-900">End Location</h4>
						<div class="space-y-1 text-sm text-gray-600">
							<div>Lat: {gpsPoints[gpsPoints.length - 1].latitude.toFixed(6)}</div>
							<div>Lng: {gpsPoints[gpsPoints.length - 1].longitude.toFixed(6)}</div>
							{#if gpsPoints[gpsPoints.length - 1].elevation !== null && gpsPoints[gpsPoints.length - 1].elevation !== undefined}
								<div>
									Elevation: {formatters.formatElevation(
										gpsPoints[gpsPoints.length - 1].elevation!
									)}
								</div>
							{/if}
							<div>Time: {formatters.formatTime(gpsPoints[gpsPoints.length - 1].timestamp)}</div>
						</div>
					</div>

					<div>
						<h4 class="mb-2 font-medium text-gray-900">Data Quality</h4>
						<div class="space-y-1 text-sm text-gray-600">
							<div>Total Points: {gpsPoints.length}</div>
							<div>
								Recording Frequency: {gpsPoints.length > 1
									? Math.round(activity.duration / gpsPoints.length)
									: 0}s avg
							</div>
							<div>Distance Covered: {formatters.formatDistance(activity.distance)}</div>
							<div>Duration: {formatters.formatDuration(activity.duration)}</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
			<h2 class="mb-2 text-xl font-semibold text-gray-800">Activity Not Found</h2>
			<p class="mb-4 text-gray-600">The requested activity could not be found.</p>
			<a
				href="/activities"
				class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
			>
				Back to Activities
			</a>
		</div>
	{/if}
</div>
