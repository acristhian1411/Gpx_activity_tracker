<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { GPSPoint } from '$lib/types';

  // Props
  export let gpsPoints: GPSPoint[] = [];
  export let height: string = '400px';
  export let width: string = '100%';
  export let showControls: boolean = true;
  export let fitBounds: boolean = true;

  // Map container and instance
  let mapContainer: HTMLDivElement;
  let map: any = null;
  let polyline: any = null;

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

    // Create map instance
    map = L.map(mapContainer, {
      zoomControl: showControls,
      attributionControl: showControls
    });

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    // Set default view (will be overridden if GPS points exist)
    map.setView([40.7128, -74.0060], 10); // Default to NYC

    // Render GPS track if points exist
    if (gpsPoints.length > 0) {
      renderGPSTrack();
    }
  }

  function renderGPSTrack() {
    if (!L || !map || gpsPoints.length === 0) return;

    // Clear existing polyline
    if (polyline) {
      map.removeLayer(polyline);
    }

    // Convert GPS points to Leaflet LatLng format
    const latLngs = gpsPoints.map(point => [point.latitude, point.longitude]);

    // Create polyline
    polyline = L.polyline(latLngs, {
      color: '#3b82f6', // Blue color
      weight: 3,
      opacity: 0.8,
      smoothFactor: 1
    }).addTo(map);

    // Add start and end markers
    if (gpsPoints.length > 0) {
      const startPoint = gpsPoints[0];
      const endPoint = gpsPoints[gpsPoints.length - 1];

      // Start marker (green)
      L.marker([startPoint.latitude, startPoint.longitude], {
        icon: L.divIcon({
          className: 'start-marker',
          html: '<div class="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(map).bindPopup('Start');

      // End marker (red) - only if different from start
      if (gpsPoints.length > 1) {
        L.marker([endPoint.latitude, endPoint.longitude], {
          icon: L.divIcon({
            className: 'end-marker',
            html: '<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(map).bindPopup('End');
      }
    }

    // Fit map to track bounds if requested
    if (fitBounds && polyline) {
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    }
  }

  // Reactive statement to update map when GPS points change
  $: if (map && L) {
    renderGPSTrack();
  }

  // Public methods for external control
  export function zoomToFit() {
    if (polyline && map) {
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    }
  }

  export function setView(lat: number, lng: number, zoom: number = 13) {
    if (map) {
      map.setView([lat, lng], zoom);
    }
  }
</script>

<!-- Leaflet CSS -->
<svelte:head>
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""
  />
</svelte:head>

<div
  bind:this={mapContainer}
  class="map-container rounded-lg overflow-hidden border border-gray-200 shadow-sm"
  style="height: {height}; width: {width};"
>
  {#if !map}
    <div class="flex items-center justify-center h-full bg-gray-100">
      <div class="text-gray-500">Loading map...</div>
    </div>
  {/if}
</div>

<style>
  .map-container {
    position: relative;
  }

  :global(.leaflet-container) {
    font-family: inherit;
  }

  :global(.start-marker),
  :global(.end-marker) {
    background: transparent !important;
    border: none !important;
  }

  :global(.leaflet-popup-content-wrapper) {
    border-radius: 8px;
  }

  :global(.leaflet-control-zoom) {
    border-radius: 6px;
    overflow: hidden;
  }

  :global(.leaflet-control-zoom a) {
    border-radius: 0;
  }
</style>