<script lang="ts">
	import { goto } from '$app/navigation';
	import type { UploadResponse, ActivityType } from '$lib/types';
	
	let dragActive = $state(false);
	let uploading = $state(false);
	let uploadProgress = $state(0);
	let selectedFile = $state<File | null>(null);
	let selectedActivityType = $state<ActivityType>('unknown');
	let uploadResult = $state<{ success: boolean; message: string; activityId?: number } | null>(null);
	
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}
	
	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
	}
	
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	}
	
	function handleFileInput(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			handleFileSelect(input.files[0]);
		}
	}
	
	function handleFileSelect(file: File) {
		// Validate file type
		if (!file.name.toLowerCase().endsWith('.gpx')) {
			uploadResult = {
				success: false,
				message: 'Please select a GPX file (.gpx extension required)'
			};
			return;
		}
		
		// Validate file size (10MB limit)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			uploadResult = {
				success: false,
				message: 'File size must be less than 10MB'
			};
			return;
		}
		
		selectedFile = file;
		uploadResult = null;
	}
	
	async function uploadFile() {
		if (!selectedFile) return;
		
		try {
			uploading = true;
			uploadProgress = 0;
			uploadResult = null;
			
			const formData = new FormData();
			formData.append('gpx', selectedFile);
			formData.append('activityType', selectedActivityType);
			
			// Simulate progress for better UX
			const progressInterval = setInterval(() => {
				if (uploadProgress < 90) {
					uploadProgress += Math.random() * 20;
				}
			}, 200);
			
			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});
			
			clearInterval(progressInterval);
			uploadProgress = 100;
			
			const result: UploadResponse = await response.json();
			
			if (result.success && result.data) {
				uploadResult = {
					success: true,
					message: result.data.message,
					activityId: result.data.activity.id
				};
				selectedFile = null;
				selectedActivityType = 'unknown';
			} else {
				uploadResult = {
					success: false,
					message: result.error?.message || 'Upload failed'
				};
			}
		} catch (error) {
			console.error('Upload error:', error);
			uploadResult = {
				success: false,
				message: 'Network error occurred during upload'
			};
		} finally {
			uploading = false;
			uploadProgress = 0;
		}
	}
	
	function clearSelection() {
		selectedFile = null;
		selectedActivityType = 'unknown';
		uploadResult = null;
	}
	
	function viewActivity() {
		if (uploadResult?.activityId) {
			goto('/activities');
		}
	}
</script>

<div class="max-w-2xl mx-auto">
	<!-- Drop Zone -->
	<div 
		class="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
			{dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
			{selectedFile ? 'border-green-400 bg-green-50' : ''}"
		role="button"
		tabindex="0"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		{#if selectedFile}
			<!-- File Selected State -->
			<div class="space-y-4">
				<div class="text-4xl">📁</div>
				<div>
					<h3 class="text-lg font-medium text-gray-900">{selectedFile.name}</h3>
					<p class="text-sm text-gray-500">
						{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
					</p>
				</div>
				
				<!-- Activity Type Selection -->
				<div class="space-y-2">
					<label for="activity-type" class="block text-sm font-medium text-gray-700">
						Activity Type
					</label>
					<select
						id="activity-type"
						bind:value={selectedActivityType}
						disabled={uploading}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<option value="unknown">Unknown</option>
						<option value="running">Running</option>
						<option value="cycling">Cycling</option>
						<option value="walking">Walking</option>
						<option value="hiking">Hiking</option>
					</select>
					<p class="text-xs text-gray-500">
						Select the type of activity for better organization and naming
					</p>
				</div>
				
				<div class="flex justify-center space-x-3">
					<button
						onclick={uploadFile}
						disabled={uploading}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{uploading ? 'Uploading...' : 'Upload File'}
					</button>
					<button
						onclick={clearSelection}
						disabled={uploading}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<!-- Default Drop Zone State -->
			<div class="space-y-4">
				<div class="text-6xl">📁</div>
				<div>
					<h3 class="text-lg font-medium text-gray-900">Upload GPX File</h3>
					<p class="text-gray-500">Drag and drop your GPX file here, or click to browse</p>
				</div>
				
				<div class="space-y-2">
					<label class="inline-block">
						<input
							type="file"
							accept=".gpx"
							onchange={handleFileInput}
							class="sr-only"
						/>
						<span class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
							Choose File
						</span>
					</label>
					<p class="text-xs text-gray-400">
						Supports GPX files up to 10MB
					</p>
				</div>
			</div>
		{/if}
	</div>
	
	<!-- Upload Progress -->
	{#if uploading}
		<div class="mt-6">
			<div class="flex justify-between text-sm text-gray-600 mb-2">
				<span>Uploading...</span>
				<span>{Math.round(uploadProgress)}%</span>
			</div>
			<div class="w-full bg-gray-200 rounded-full h-2">
				<div 
					class="bg-blue-600 h-2 rounded-full transition-all duration-300"
					style="width: {uploadProgress}%"
				></div>
			</div>
		</div>
	{/if}
	
	<!-- Upload Result -->
	{#if uploadResult}
		<div class="mt-6">
			{#if uploadResult.success}
				<div class="bg-green-50 border border-green-200 rounded-md p-4">
					<div class="flex items-start">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-3 flex-1">
							<h3 class="text-sm font-medium text-green-800">Upload Successful!</h3>
							<p class="mt-1 text-sm text-green-700">{uploadResult.message}</p>
							<div class="mt-3">
								<button
									onclick={viewActivity}
									class="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-md hover:bg-green-200 transition-colors"
								>
									View Activities
								</button>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="bg-red-50 border border-red-200 rounded-md p-4">
					<div class="flex items-start">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">Upload Failed</h3>
							<p class="mt-1 text-sm text-red-700">{uploadResult.message}</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>