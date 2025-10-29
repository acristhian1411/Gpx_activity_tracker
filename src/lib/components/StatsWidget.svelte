<script lang="ts">
	export let title: string;
	export let value: string | number;
	export let subtitle: string = '';
	export let icon: string = '';
	export let trend: 'up' | 'down' | 'neutral' | undefined = undefined;
	export let trendValue: string = '';
	export let loading: boolean = false;
</script>

<div class="bg-white rounded-lg shadow p-6">
	{#if loading}
		<div class="animate-pulse">
			<div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
			<div class="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
			<div class="h-3 bg-gray-200 rounded w-2/3"></div>
		</div>
	{:else}
		<div class="flex items-center justify-between">
			<div class="flex-1">
				<p class="text-sm font-medium text-gray-600">{title}</p>
				<p class="text-2xl font-bold text-gray-900">{value}</p>
				{#if subtitle}
					<p class="text-sm text-gray-500">{subtitle}</p>
				{/if}
			</div>
			{#if icon}
				<div class="flex-shrink-0">
					<div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
						<span class="text-blue-600 text-lg">{icon}</span>
					</div>
				</div>
			{/if}
		</div>
		
		{#if trend && trendValue}
			<div class="mt-4 flex items-center">
				<span class="text-sm font-medium {trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}">
					{#if trend === 'up'}
						↗ +{trendValue}
					{:else if trend === 'down'}
						↘ -{trendValue}
					{:else}
						→ {trendValue}
					{/if}
				</span>
				<span class="text-sm text-gray-500 ml-2">vs last month</span>
			</div>
		{/if}
	{/if}
</div>