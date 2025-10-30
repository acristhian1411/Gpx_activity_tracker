<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import MapGenerator from '$lib/components/MapGenerator.svelte';
  import type { Activity, GPSPoint } from '$lib/types';
  import { goto } from '$app/navigation';

  let activity: Activity | null = null;
  let gpsPoints: GPSPoint[] = [];
  let loading = true;
  let error: string | null = null;
  let mapGenerator: MapGenerator;

  // Customization options
  let width = 800;
  let height = 600;
  let trackColor = '#3b82f6';
  let trackWidth = 3;
  let showMetadata = true;
  let showStartEnd = true;
  let backgroundColor = '#ffffff';
  let mapStyle: 'streets' | 'satellite' | 'terrain' = 'streets';
  let metadataPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'top-left';
  let showBranding = true;
  let brandingText = 'Activity Tracker';

  // Export options
  let exportFormat: 'png' | 'jpeg' = 'png';
  let exportQuality = 0.9;
  let exportScale = 2;
  let isExporting = false;

  onMount(async () => {
    await loadMapData();
  });

  async function loadMapData() {
    try {
      loading = true;
      error = null;

      const activityId = $page.params.id;
      const response = await fetch(`/api/map/${activityId}`);
      const result = await response.json();

      if (!result.success) {
        error = result.error?.message || 'Failed to load map data';
        return;
      }

      activity = {
        ...result.data.activity,
        startTime: new Date(result.data.activity.startTime),
        endTime: new Date(result.data.activity.endTime),
        createdAt: new Date(result.data.activity.createdAt),
        updatedAt: new Date(result.data.activity.updatedAt)
      };
      gpsPoints = result.data.gpsPoints.map((point: any) => ({
        ...point,
        timestamp: new Date(point.timestamp)
      }));
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  async function handleExport() {
    if (!mapGenerator) return;

    try {
      isExporting = true;
      const success = await mapGenerator.downloadImage({
        format: exportFormat,
        quality: exportQuality,
        scale: exportScale
      });

      if (!success) {
        alert('Failed to export map image');
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export map image');
    } finally {
      isExporting = false;
    }
  }

  async function handleShare() {
    if (!mapGenerator) return;

    try {
      isExporting = true;
      const blob = await mapGenerator.getImageBlob();
      
      if (!blob) {
        alert('Failed to generate image for sharing');
        return;
      }

      if (navigator.share && navigator.canShare({ files: [new File([blob], 'map.png', { type: blob.type })] })) {
        await navigator.share({
          title: activity?.name || 'Activity Map',
          text: `Check out my ${activity?.name || 'activity'} route!`,
          files: [new File([blob], 'activity_map.png', { type: blob.type })]
        });
      } else {
        // Fallback: copy image to clipboard
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
          ]);
          alert('Map image copied to clipboard!');
        } catch {
          // Final fallback: download
          await mapGenerator.downloadImage({
            format: exportFormat,
            quality: exportQuality,
            scale: exportScale
          });
        }
      }
    } catch (err) {
      console.error('Share error:', err);
      alert('Failed to share map image');
    } finally {
      isExporting = false;
    }
  }

  function goBack() {
    goto('/activities');
  }
</script>

<svelte:head>
  <title>{activity?.name || 'Mapa'} - GPX Activity Tracker</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <!-- Header -->
  <div class="mb-8">
    <button
      on:click={goBack}
      class="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
    >
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Volver a la lista de actividades
    </button>
    
    <h1 class="text-3xl font-bold text-gray-900">
      Mapa
    </h1>
    {#if activity}
      <p class="text-gray-600 mt-2">
        Genere un mapa personalizado para "{activity.name}"
      </p>
    {/if}
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
      <span class="text-gray-600">Cargando datos del mapa...</span>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-red-800 font-medium">Error: {error}</span>
      </div>
    </div>
  {:else if activity}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Map Preview -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Previsualización</h2>
          
          <div class="flex justify-center">
            <MapGenerator
              bind:this={mapGenerator}
              {activity}
              {gpsPoints}
              {width}
              {height}
              {trackColor}
              {trackWidth}
              {showMetadata}
              {showStartEnd}
              {backgroundColor}
              {mapStyle}
              {metadataPosition}
              {showBranding}
              {brandingText}
            />
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3 mt-6 justify-center">
            <button
              on:click={handleExport}
              disabled={isExporting}
              class="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {#if isExporting}
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {:else}
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              {/if}
              Download Image
            </button>

            <button
              on:click={handleShare}
              disabled={isExporting}
              class="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {#if isExporting}
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {:else}
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              {/if}
              Share Map
            </button>
          </div>
        </div>
      </div>

      <!-- Customization Panel -->
      <div class="space-y-6">
        <!-- Map Settings -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-lg font-semibold mb-4">Map Settings</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Map Style</label>
              <select bind:value={mapStyle} class="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="streets">Streets</option>
                <option value="satellite">Satellite</option>
                <option value="terrain">Terrain</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Width</label>
                <input
                  type="number"
                  bind:value={width}
                  min="400"
                  max="1200"
                  step="50"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Height</label>
                <input
                  type="number"
                  bind:value={height}
                  min="300"
                  max="800"
                  step="50"
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
              <input
                type="color"
                bind:value={backgroundColor}
                class="w-full h-10 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        <!-- Track Settings -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-lg font-semibold mb-4">Track Settings</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Track Color</label>
              <input
                type="color"
                bind:value={trackColor}
                class="w-full h-10 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Track Width</label>
              <input
                type="range"
                bind:value={trackWidth}
                min="1"
                max="8"
                step="1"
                class="w-full"
              />
              <div class="text-sm text-gray-500 text-center">{trackWidth}px</div>
            </div>

            <div class="flex items-center">
              <input
                type="checkbox"
                bind:checked={showStartEnd}
                id="showStartEnd"
                class="mr-2"
              />
              <label for="showStartEnd" class="text-sm font-medium text-gray-700">
                Show Start/End Markers
              </label>
            </div>
          </div>
        </div>

        <!-- Overlay Settings -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-lg font-semibold mb-4">Overlay Settings</h3>
          
          <div class="space-y-4">
            <div class="flex items-center">
              <input
                type="checkbox"
                bind:checked={showMetadata}
                id="showMetadata"
                class="mr-2"
              />
              <label for="showMetadata" class="text-sm font-medium text-gray-700">
                Show Activity Metadata
              </label>
            </div>

            {#if showMetadata}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Metadata Position</label>
                <select bind:value={metadataPosition} class="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
            {/if}

            <div class="flex items-center">
              <input
                type="checkbox"
                bind:checked={showBranding}
                id="showBranding"
                class="mr-2"
              />
              <label for="showBranding" class="text-sm font-medium text-gray-700">
                Show Branding
              </label>
            </div>

            {#if showBranding}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Branding Text</label>
                <input
                  type="text"
                  bind:value={brandingText}
                  class="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            {/if}
          </div>
        </div>

        <!-- Export Settings -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-lg font-semibold mb-4">Export Settings</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <select bind:value={exportFormat} class="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="png">PNG (Best Quality)</option>
                <option value="jpeg">JPEG (Smaller Size)</option>
              </select>
            </div>

            {#if exportFormat === 'jpeg'}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                <input
                  type="range"
                  bind:value={exportQuality}
                  min="0.1"
                  max="1"
                  step="0.1"
                  class="w-full"
                />
                <div class="text-sm text-gray-500 text-center">{Math.round(exportQuality * 100)}%</div>
              </div>
            {/if}

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Scale (Resolution)</label>
              <select bind:value={exportScale} class="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value={1}>1x (Standard)</option>
                <option value={2}>2x (High DPI)</option>
                <option value={3}>3x (Ultra High)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>