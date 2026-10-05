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
	export let metadataPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' =
		'top-left';
	export let showBranding: boolean = true;
	export let brandingText: string = 'GPX Activity Tracker';

	// Map container and instance
	let mapContainer: HTMLDivElement;
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
		map.setView([40.7128, -74.006], 10);

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
				tileUrl =
					'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
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
		const latLngs = gpsPoints.map((point) => [point.latitude, point.longitude]);

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
			if (layer._url) {
				// This is a tile layer
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

	// Recalculate the map size when the export dimensions change
	$: if (map && L && width && height) {
		requestAnimationFrame(() => {
			if (map) map.invalidateSize({ animate: false });
		});
	}

	// Resolve the tile URL for the currently selected map style
	function getTileUrl(z: number, x: number, y: number): string {
		const sub = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
		switch (mapStyle) {
			case 'satellite':
				return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
			case 'terrain':
				return `https://${sub}.tile.opentopomap.org/${z}/${x}/${y}.png`;
			default:
				return `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
		}
	}

	function loadTileImage(url: string): Promise<HTMLImageElement | null> {
		return new Promise((resolve) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => resolve(img);
			img.onerror = () => resolve(null);
			img.src = url;
		});
	}

	// Render the map (tiles + route + markers) directly onto a canvas so the
	// track aligns perfectly with the tiles (no html2canvas CSS-transform drift).
	async function renderMapToCanvas(scale: number): Promise<HTMLCanvasElement> {
		if (!L || !map || gpsPoints.length === 0) {
			throw new Error('Map is not ready');
		}

		const size = map.getSize();
		const zoom = map.getZoom();
		const center = map.getCenter();

		const canvas = document.createElement('canvas');
		canvas.width = Math.round(size.x * scale);
		canvas.height = Math.round(size.y * scale);
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas 2D context unavailable');
		ctx.scale(scale, scale);

		// Background
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, size.x, size.y);

		const centerPx = map.project(center, zoom);
		const origin = L.point(centerPx.x - size.x / 2, centerPx.y - size.y / 2);

		// Visible tile range
		const tileSize = 256;
		const startX = Math.floor(origin.x / tileSize);
		const startY = Math.floor(origin.y / tileSize);
		const endX = Math.floor((origin.x + size.x) / tileSize);
		const endY = Math.floor((origin.y + size.y) / tileSize);
		const worldTiles = Math.pow(2, zoom);

		const tiles: Array<{ img: HTMLImageElement | null; dx: number; dy: number }> = [];
		const pending: Promise<void>[] = [];

		for (let ty = startY; ty <= endY; ty++) {
			for (let tx = startX; tx <= endX; tx++) {
				if (ty < 0 || ty >= worldTiles) continue;
				const wrappedX = ((tx % worldTiles) + worldTiles) % worldTiles;
				const url = getTileUrl(zoom, wrappedX, ty);
				const dx = tx * tileSize - origin.x;
				const dy = ty * tileSize - origin.y;
				pending.push(
					loadTileImage(url).then((img) => {
						tiles.push({ img, dx, dy });
					})
				);
			}
		}

		await Promise.all(pending);

		for (const tile of tiles) {
			if (tile.img) {
				ctx.drawImage(tile.img, tile.dx, tile.dy, tileSize, tileSize);
			}
		}

		drawRoute(ctx, origin, zoom);
		drawMarkers(ctx, origin, zoom);
		drawOverlays(ctx, size.x, size.y);

		return canvas;
	}

	function drawRoute(ctx: CanvasRenderingContext2D, origin: any, zoom: number): void {
		if (gpsPoints.length < 2) return;

		const pts = gpsPoints.map((point) => {
			const p = map.project([point.latitude, point.longitude], zoom);
			return { x: p.x - origin.x, y: p.y - origin.y };
		});

		ctx.beginPath();
		ctx.moveTo(pts[0].x, pts[0].y);
		for (let i = 1; i < pts.length; i++) {
			ctx.lineTo(pts[i].x, pts[i].y);
		}
		ctx.strokeStyle = trackColor;
		ctx.lineWidth = trackWidth;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.globalAlpha = 0.9;
		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	function drawMarkers(ctx: CanvasRenderingContext2D, origin: any, zoom: number): void {
		if (!showStartEnd || gpsPoints.length === 0) return;

		drawCircleMarker(ctx, gpsPoints[0], '#10b981', origin, zoom);
		if (gpsPoints.length > 1) {
			drawCircleMarker(ctx, gpsPoints[gpsPoints.length - 1], '#ef4444', origin, zoom);
		}
	}

	function drawCircleMarker(
		ctx: CanvasRenderingContext2D,
		point: GPSPoint,
		color: string,
		origin: any,
		zoom: number
	): void {
		const p = map.project([point.latitude, point.longitude], zoom);
		const x = p.x - origin.x;
		const y = p.y - origin.y;

		ctx.beginPath();
		ctx.arc(x, y, 12, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.lineWidth = 3;
		ctx.strokeStyle = '#ffffff';
		ctx.stroke();
	}

	function drawOverlays(ctx: CanvasRenderingContext2D, mapW: number, mapH: number): void {
		drawMetadata(ctx, mapW, mapH);
		drawBranding(ctx, mapW, mapH);
	}

	function drawMetadata(ctx: CanvasRenderingContext2D, mapW: number, mapH: number): void {
		if (!showMetadata) return;

		const stats: Array<[string, string]> = [
			['Distancia', formatters.formatDistance(activity.distance)],
			['Duración', formatters.formatDuration(activity.duration)],
			['Velocidad media', formatters.formatSpeed(activity.averageSpeed)],
			['Fecha', formatters.formatDate(activity.startTime)]
		];
		if (activity.elevationGain > 0) {
			stats.push(['Elevación', formatters.formatElevation(activity.elevationGain)]);
		}

		const title = activity.name || '';
		const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

		ctx.font = `600 18px ${font}`;
		const titleW = ctx.measureText(title).width;
		ctx.font = `14px ${font}`;
		const labelW = Math.max(...stats.map(([label]) => ctx.measureText(label).width));
		ctx.font = `600 14px ${font}`;
		const valueW = Math.max(...stats.map(([, value]) => ctx.measureText(value).width));
		const gap = 16;

		const contentW = Math.max(titleW, labelW + gap + valueW);
		const padding = 16;
		const boxW = Math.min(280, Math.max(200, contentW + padding * 2));
		const titleH = 18;
		const titlePad = 12;
		const rowH = 22;
		const boxH = padding + titleH + titlePad + stats.length * rowH + padding;

		const pos = overlayPosition(metadataPosition, boxW, boxH, mapW, mapH);

		roundRectPath(ctx, pos.x, pos.y, boxW, boxH, 8);
		ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
		ctx.fill();

		ctx.textBaseline = 'top';
		ctx.textAlign = 'left';
		ctx.fillStyle = '#1f2937';
		ctx.font = `600 18px ${font}`;
		ctx.fillText(title, pos.x + padding, pos.y + padding);

		let y = pos.y + padding + titleH + titlePad;
		for (const [label, value] of stats) {
			ctx.font = `14px ${font}`;
			ctx.fillStyle = '#6b7280';
			ctx.fillText(label, pos.x + padding, y);
			ctx.font = `600 14px ${font}`;
			ctx.fillStyle = '#1f2937';
			ctx.textAlign = 'right';
			ctx.fillText(value, pos.x + boxW - padding, y);
			ctx.textAlign = 'left';
			y += rowH;
		}

		ctx.textBaseline = 'alphabetic';
	}

	function drawBranding(ctx: CanvasRenderingContext2D, mapW: number, mapH: number): void {
		if (!showBranding || !brandingText) return;

		const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
		ctx.font = `500 12px ${font}`;
		const textW = ctx.measureText(brandingText).width;
		const paddingX = 12;
		const paddingY = 8;
		const boxW = textW + paddingX * 2;
		const boxH = 12 + paddingY * 2;
		const x = mapW - boxW - 20;
		const y = mapH - boxH - 20;

		roundRectPath(ctx, x, y, boxW, boxH, 4);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
		ctx.fill();

		ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'left';
		ctx.fillText(brandingText, x + paddingX, y + boxH / 2);
		ctx.textBaseline = 'alphabetic';
	}

	function overlayPosition(
		position: string,
		boxW: number,
		boxH: number,
		mapW: number,
		mapH: number
	): { x: number; y: number } {
		const margin = 20;
		const bottomOffset = 60;
		switch (position) {
			case 'top-right':
				return { x: mapW - boxW - margin, y: margin };
			case 'bottom-left':
				return { x: margin, y: mapH - boxH - bottomOffset };
			case 'bottom-right':
				return { x: mapW - boxW - margin, y: mapH - boxH - bottomOffset };
			default:
				return { x: margin, y: margin };
		}
	}

	function roundRectPath(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number
	): void {
		const radius = Math.min(r, w / 2, h / 2);
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.arcTo(x + w, y, x + w, y + h, radius);
		ctx.arcTo(x + w, y + h, x, y + h, radius);
		ctx.arcTo(x, y + h, x, y, radius);
		ctx.arcTo(x, y, x + w, y, radius);
		ctx.closePath();
	}

	// Export map as image with enhanced options
	export async function exportAsImage(
		options: {
			format?: 'png' | 'jpeg';
			quality?: number;
			scale?: number;
		} = {}
	): Promise<string | null> {
		if (!map || !L) return null;

		try {
			isGenerating = true;

			const { format = 'png', quality = 0.9, scale = 2 } = options;

			map.invalidateSize({ animate: false });

			if (gpsPoints.length > 0) {
				const bounds = L.latLngBounds(gpsPoints.map((p) => [p.latitude, p.longitude]));
				map.fitBounds(bounds, { padding: [50, 50], animate: false });
			}

			// Let the map settle before projecting to pixels
			await new Promise((resolve) => setTimeout(resolve, 300));

			const canvas = await renderMapToCanvas(scale);

			const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
			return canvas.toDataURL(mimeType, quality);
		} catch (error) {
			console.error('Error exporting map:', error);
			return null;
		} finally {
			isGenerating = false;
		}
	}

	// Download map as image file with enhanced options
	export async function downloadImage(
		options: {
			filename?: string;
			format?: 'png' | 'jpeg';
			quality?: number;
			scale?: number;
		} = {}
	) {
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
	<link
		rel="stylesheet"
		href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
		integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
		crossorigin=""
	/>
</svelte:head>

<!-- Wrapper container que contiene todo -->
<div
	class="map-generator-container"
	style="background-color: {backgroundColor}; width: {width}px; height: {height}px;"
>
	<!-- Map Container -->
	<div bind:this={mapContainer} class="map-export-container" style="width: 100%; height: 100%;">
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
			<div
				style="display: flex; align-items: center; justify-content: center; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
			>
				<div
					style="animation: spin 1s linear infinite; border-radius: 50%; height: 32px; width: 32px; border-bottom: 2px solid #2563eb; margin-right: 12px;"
				></div>
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
