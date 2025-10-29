<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	
	let mobileMenuOpen = $state(false);
	
	const navigationItems = [
		{ name: 'Dashboard', href: '/', icon: '📊' },
		{ name: 'Activities', href: '/activities', icon: '🏃' },
		{ name: 'Upload', href: '/upload', icon: '📁' }
	];
	
	function isCurrentPage(href: string): boolean {
		if (href === '/') {
			return $page.url.pathname === '/';
		}
		return $page.url.pathname.startsWith(href);
	}
	
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
	
	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<header class="bg-white shadow-sm border-b border-gray-200">
	<div class="container mx-auto px-4">
		<div class="flex justify-between items-center h-16">
			<!-- Logo/Brand -->
			<div class="flex items-center">
				<button 
					onclick={() => goto('/')}
					class="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
				>
					🏃 GPX Tracker
				</button>
			</div>
			
			<!-- Desktop Navigation -->
			<nav class="hidden md:flex space-x-8">
				{#each navigationItems as item}
					<a 
						href={item.href}
						class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
							{isCurrentPage(item.href) 
								? 'text-blue-600 bg-blue-50' 
								: 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'}"
					>
						<span>{item.icon}</span>
						<span>{item.name}</span>
					</a>
				{/each}
			</nav>
			
			<!-- Mobile menu button -->
			<div class="md:hidden">
				<button
					onclick={toggleMobileMenu}
					class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
					aria-expanded={mobileMenuOpen}
				>
					<span class="sr-only">Open main menu</span>
					{#if mobileMenuOpen}
						<!-- Close icon -->
						<svg class="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					{:else}
						<!-- Menu icon -->
						<svg class="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					{/if}
				</button>
			</div>
		</div>
		
		<!-- Mobile Navigation Menu -->
		{#if mobileMenuOpen}
			<div class="md:hidden">
				<div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
					{#each navigationItems as item}
						<a 
							href={item.href}
							onclick={closeMobileMenu}
							class="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors
								{isCurrentPage(item.href) 
									? 'text-blue-600 bg-blue-50' 
									: 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'}"
						>
							<span>{item.icon}</span>
							<span>{item.name}</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</header>