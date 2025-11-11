<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Activity, GPSPoint } from '$lib/types';
  import { formatters } from '$lib/utils/formatters';

  // Props
  export let activity: Activity;
  export let gpsPoints: GPSPoint[] = [];
  export let width: number = 800;
  export let height: number = 600;

  // Customization options
  export let trackColor: string = '#3b82f6';
  export let trackWidth: number = 3;
  export let showMetadata: boolean = true;
  export let showStartEnd: boolean = true;
  export let backgroundColor: string = '#ffffff';
  export let mapStyle: 'streets' | 'satellite' | 'terrain' = 'streets';
  export let metadataPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'top-left';
  export let showBranding: boolean = true;
  export let brandingText: string = 'GPX Activity Tracker';

  // Map container and instance
  let mapContainer: HTMLDivElement;
  let wrapperContainer: HTMLDivElement;
  let map: any = null;
  let polyline: any = null;
  let isGenerating = false;

  // Leaflet imports (dynamic to avoid SSR issues)
  let L: any = null;

  onMount(async () => {
    // Dynamic import to avoid SSR issues
    L = await import('leaflet');
    
    // Initialize the map
    initializeMap();
  });

  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
    }
  });

  function initializeMap() {
    if (!L || !mapContainer) return;

    // Create map instance without default controls for cleaner export
    map = L.map(mapContainer, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      dragging: false,
      touchZoom: false
    });

    // Add tile layer based on style
    addTileLayer();

    // Set default view
    map.setView([40.7128, -74.0060], 10);

    // Render GPS track if points exist
    if (gpsPoints.length > 0) {
      renderGPSTrack();
    }
  }

  function addTileLayer() {
    if (!L || !map) return;

    let tileUrl: string;
    let attribution: string;

    switch (mapStyle) {
      case 'satellite':
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attribution = '© Esri';
        break;
      case 'terrain':
        tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        attribution = '© OpenTopoMap';
        break;
      default: // streets
        tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        attribution = '© OpenStreetMap';
    }

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 18
    }).addTo(map);
  }

  function renderGPSTrack() {
    if (!L || !map || gpsPoints.length === 0) return;

    // Clear existing polyline
    if (polyline) {
      map.removeLayer(polyline);
    }

    // Convert GPS points to Leaflet LatLng format
    const latLngs = gpsPoints.map(point => [point.latitude, point.longitude]);

    // Create polyline with custom styling
    polyline = L.polyline(latLngs, {
      color: trackColor,
      weight: trackWidth,
      opacity: 0.9,
      smoothFactor: 1
    }).addTo(map);

    // Add start and end markers if enabled
    if (showStartEnd && gpsPoints.length > 0) {
      const startPoint = gpsPoints[0];
      const endPoint = gpsPoints[gpsPoints.length - 1];

      // Start marker (green)
      L.marker([startPoint.latitude, startPoint.longitude], {
        icon: L.divIcon({
          className: 'start-marker-export',
          html: '<div style="width: 24px; height: 24px; background-color: #10b981; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map);

      // End marker (red) - only if different from start
      if (gpsPoints.length > 1) {
        L.marker([endPoint.latitude, endPoint.longitude], {
          icon: L.divIcon({
            className: 'end-marker-export',
            html: '<div style="width: 24px; height: 24px; background-color: #ef4444; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(map);
      }
    }

    // Fit map to track bounds
    if (polyline) {
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }

  // Reactive statements to update map when options change
  $: if (map && L && gpsPoints.length > 0) {
    renderGPSTrack();
  }

  $: if (map && L && mapStyle) {
    // Update tile layer when style changes
    map.eachLayer((layer: any) => {
      if (layer._url) { // This is a tile layer
        map.removeLayer(layer);
      }
    });
    addTileLayer();
  }

  // Update track styling when colors or width change
  $: if (polyline && trackColor && trackWidth) {
    polyline.setStyle({
      color: trackColor,
      weight: trackWidth,
      opacity: 0.9
    });
  }

  // Export map as image with enhanced options
  export async function exportAsImage(options: {
    format?: 'png' | 'jpeg';
    quality?: number;
    scale?: number;
  } = {}): Promise<string | null> {
    if (!map || !wrapperContainer) return null;

    try {
      isGenerating = true;

      const { format = 'png', quality = 0.9, scale = 2 } = options;

      // Wait a bit for the UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Wait for tiles to load completely
      await waitForTilesToLoad();

      // Give more time for tiles to fully render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use html2canvas to capture the wrapper container
      // @ts-ignore - html2canvas doesn't have TypeScript definitions
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      
      const canvas = await html2canvas(wrapperContainer, {
        backgroundColor,
        useCORS: true,
        allowTaint: true,
        scale,
        logging: false,
        imageTimeout: 15000,
        onclone: (clonedDoc: any) => {
          // Find and remove the generation overlay from the clone
          const generationOverlay = clonedDoc.querySelector('.generation-overlay');
          if (generationOverlay) {
            generationOverlay.remove();
          }
          
          // Fix backdrop-filter which doesn't work in html2canvas
          const metadataOverlays = clonedDoc.querySelectorAll('.metadata-overlay');
          metadataOverlays.forEach((overlay: any) => {
            overlay.style.backdropFilter = 'none';
            overlay.style.background = 'rgba(255, 255, 255, 0.95)';
          });
        }
      });

      // Convert to data URL with specified format
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = canvas.toDataURL(mimeType, quality);
      
      return dataUrl;
    } catch (error) {
      console.error('Error exporting map:', error);
      return null;
    } finally {
      isGenerating = false;
    }
  }

  // Helper function to wait for map tiles to load
  async function waitForTilesToLoad(): Promise<void> {
    return new Promise((resolve) => {
      if (!map) {
        resolve();
        return;
      }

      let tilesLoading = 0;
      let tilesLoaded = 0;

      const checkTiles = () => {
        if (tilesLoading > 0 && tilesLoading === tilesLoaded) {
          resolve();
        }
      };

      map.eachLayer((layer: any) => {
        if (layer._url) { // This is a tile layer
          layer.on('tileloadstart', () => {
            tilesLoading++;
          });
          
          layer.on('tileload', () => {
            tilesLoaded++;
            checkTiles();
          });
          
          layer.on('tileerror', () => {
            tilesLoaded++;
            checkTiles();
          });
        }
      });

      // Fallback timeout
      setTimeout(resolve, 2000);
    });
  }

  // Download map as image file with enhanced options
  export async function downloadImage(options: {
    filename?: string;
    format?: 'png' | 'jpeg';
    quality?: number;
    scale?: number;
  } = {}) {
    const { filename, format = 'png', quality = 0.9, scale = 2 } = options;
    
    const dataUrl = await exportAsImage({ format, quality, scale });
    if (!dataUrl) return false;

    const link = document.createElement('a');
    const defaultFilename = `${activity.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_map.${format}`;
    link.download = filename || defaultFilename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  }

  // Get shareable image blob
  export async function getImageBlob(): Promise<Blob | null> {
    const dataUrl = await exportAsImage();
    if (!dataUrl) return null;

    try {
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      console.error('Error creating blob:', error);
      return null;
    }
  }
</script>

<!-- HTML2Canvas for image export -->
<svelte:head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""
  />
</svelte:head>

<!-- Wrapper container que contiene todo -->
<div 
  bind:this={wrapperContainer}
  class="map-generator-container" 
  style="background-color: {backgroundColor}; width: {width}px; height: {height}px;"
>
  <!-- Map Container -->
  <div
    bind:this={mapContainer}
    class="map-export-container"
    style="width: 100%; height: 100%;"
  >
    {#if !map}
      <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
        <div style="color: #6b7280;">Preparing map...</div>
      </div>
    {/if}
  </div>

  <!-- Metadata Overlay -->
  {#if showMetadata}
    <div class="metadata-overlay {metadataPosition}">
      <div class="metadata-content">
        <h2 class="activity-title">{activity.name}</h2>
        <div class="activity-stats">
          <div class="stat-item">
            <span class="stat-label">Distancia:</span>
            <span class="stat-value">{formatters.formatDistance(activity.distance)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Duración:</span>
            <span class="stat-value">{formatters.formatDuration(activity.duration)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Velocidad media:</span>
            <span class="stat-value">{formatters.formatSpeed(activity.averageSpeed)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Fecha:</span>
            <span class="stat-value">{formatters.formatDate(activity.startTime)}</span>
          </div>
          {#if activity.elevationGain > 0}
            <div class="stat-item">
              <span class="stat-label">Elevación:</span>
              <span class="stat-value">{formatters.formatElevation(activity.elevationGain)}</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Branding Overlay -->
  {#if showBranding}
    <div class="branding-overlay">
      <span class="branding-text">{brandingText}</span>
    </div>
  {/if}

  <!-- Generation Status - Outside the capture area visually -->
  {#if isGenerating}
    <div class="generation-overlay">
      <div style="display: flex; align-items: center; justify-content: center; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="animation: spin 1s linear infinite; border-radius: 50%; height: 32px; width: 32px; border-bottom: 2px solid #2563eb; margin-right: 12px;"></div>
        <span style="color: #374151; font-weight: 500;">Generando Imagen...</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .map-generator-container {
    position: relative;
    display: inline-block;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .map-export-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .metadata-overlay {
    position: absolute;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-width: 280px;
    pointer-events: none;
  }

  .metadata-overlay.top-left {
    top: 20px;
    left: 20px;
  }

  .metadata-overlay.top-right {
    top: 20px;
    right: 20px;
  }

  .metadata-overlay.bottom-left {
    bottom: 60px;
    left: 20px;
  }

  .metadata-overlay.bottom-right {
    bottom: 60px;
    right: 20px;
  }

  .metadata-content {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .activity-title {
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 12px 0;
  }

  .activity-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 14px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
  }

  .stat-label {
    color: #6b7280;
    font-weight: 500;
  }

  .stat-value {
    color: #1f2937;
    font-weight: 600;
  }

  .generation-overlay {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 3000;
  }

  :global(.start-marker-export),
  :global(.end-marker-export) {
    background: transparent !important;
    border: none !important;
  }

  .branding-overlay {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    z-index: 1000;
    pointer-events: none;
  }

  .branding-text {
    opacity: 0.8;
  }

  :global(.leaflet-container) {
    font-family: inherit;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>