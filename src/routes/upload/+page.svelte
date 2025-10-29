<script lang="ts">
	import FileUploader from '$lib/components/FileUploader.svelte';
</script>

<div class="space-y-8">
	<!-- Header -->
	<div class="text-center">
		<h1 class="text-3xl font-bold text-gray-900">Upload GPX File</h1>
		<p class="mt-2 text-gray-600">
			Upload your GPS activity files to track your workouts and analyze your performance.
		</p>
	</div>
	
	<!-- File Uploader -->
	<FileUploader />
	
	<!-- Help Section -->
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
		<h3 class="text-lg font-medium text-blue-900 mb-3">About GPX Files</h3>
		<div class="text-sm text-blue-800 space-y-2">
			<p>
				GPX (GPS Exchange Format) files contain GPS tracking data from your activities. 
				Most fitness apps and GPS devices can export activities as GPX files.
			</p>
			<div class="mt-4">
				<h4 class="font-medium mb-2">Supported sources:</h4>
				<ul class="list-disc list-inside space-y-1 ml-4">
					<li>Strava (export individual activities)</li>
					<li>Garmin Connect</li>
					<li>Polar Flow</li>
					<li>Suunto Movescount</li>
					<li>GPS watches and cycling computers</li>
					<li>Mobile fitness apps</li>
				</ul>
			</div>
		</div>
	</div>
</div>