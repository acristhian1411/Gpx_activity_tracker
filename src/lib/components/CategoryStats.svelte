<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    categoryStatsLoading, 
    categoryStatsError, 
    formattedCategoryStats, 
    fetchCategoryStats 
  } from '$lib/stores/categoryStats';

  onMount(() => {
    fetchCategoryStats();
  });
</script>

{#if $categoryStatsError}
  <div class="bg-red-50 border border-red-200 rounded-lg p-4">
    <div class="flex">
      <div class="flex-shrink-0">
        <span class="text-red-400">⚠</span>
      </div>
      <div class="ml-3">
        <h3 class="text-sm font-medium text-red-800">Error loading category statistics</h3>
        <p class="mt-1 text-sm text-red-700">{$categoryStatsError}</p>
        <button 
          on:click={fetchCategoryStats}
          class="mt-2 text-sm text-red-600 hover:text-red-500 underline"
        >
          Try again
        </button>
      </div>
    </div>
  </div>
{:else if $formattedCategoryStats.length === 0 && !$categoryStatsLoading}
  <!-- Empty state - no categories with data -->
  <div class="text-center py-6 bg-gray-50 rounded-lg">
    <div class="text-4xl mb-2">📊</div>
    <p class="text-gray-600">No activity categories yet</p>
    <p class="text-sm text-gray-500">Upload activities to see category breakdowns</p>
  </div>
{:else}
  <!-- Category Statistics Grid -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-gray-900">Statistics by Category</h2>
    
    {#if $categoryStatsLoading}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each Array(3) as _}
          <div class="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div class="flex items-center mb-4">
              <div class="w-8 h-8 bg-gray-200 rounded mr-3"></div>
              <div class="h-5 bg-gray-200 rounded w-20"></div>
            </div>
            <div class="space-y-3">
              <div class="h-4 bg-gray-200 rounded w-full"></div>
              <div class="h-4 bg-gray-200 rounded w-3/4"></div>
              <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each $formattedCategoryStats as category}
          <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <!-- Category Header -->
            <div class="flex items-center mb-4">
              <span class="text-2xl mr-3">{category.icon}</span>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">{category.displayName}</h3>
                <p class="text-sm text-gray-500">{category.totalActivities} activities</p>
              </div>
            </div>
            
            <!-- Category Stats -->
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Total Distance:</span>
                <span class="font-semibold text-blue-600">{category.totalDistance}</span>
              </div>
              
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Total Time:</span>
                <span class="font-semibold text-green-600">{category.totalDuration}</span>
              </div>
              
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Avg Distance:</span>
                <span class="font-semibold text-purple-600">{category.averageDistance}</span>
              </div>
              
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Avg Duration:</span>
                <span class="font-semibold text-orange-600">{category.averageDuration}</span>
              </div>
            </div>
            
            <!-- Progress Bar for Visual Comparison -->
            <div class="mt-4 pt-4 border-t border-gray-100">
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>Activity Distribution</span>
                <span>{category.totalActivities}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style="width: {Math.min(100, (parseInt(category.totalActivities) / Math.max(...$formattedCategoryStats.map(c => parseInt(c.totalActivities)))) * 100)}%"
                ></div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}