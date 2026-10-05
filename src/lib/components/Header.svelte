<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	type User = { id: number; email: string; name?: string } | null;

	let { user = null }: { user?: User } = $props();
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

	function displayName(): string {
		return user?.name || user?.email || 'Usuario';
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
		await goto('/login');
	}
</script>

<header class="border-b border-gray-200 bg-white shadow-sm">
	<div class="container mx-auto px-4">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo/Brand -->
			<div class="flex items-center">
				<button
					onclick={() => goto('/')}
					class="text-xl font-bold text-gray-900 transition-colors hover:text-blue-600"
				>
					🏃 GPX Tracker
				</button>
			</div>

			<!-- Desktop Navigation -->
			<nav class="hidden space-x-8 md:flex">
				{#each navigationItems as item}
					<a
						href={item.href}
						class="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors
							{isCurrentPage(item.href)
							? 'bg-blue-50 text-blue-600'
							: 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'}"
					>
						<span>{item.icon}</span>
						<span>{item.name}</span>
					</a>
				{/each}
			</nav>

			<!-- Desktop user area -->
			<div class="hidden items-center gap-3 md:flex">
				<span class="text-sm font-medium text-gray-700">{displayName()}</span>
				<button
					onclick={logout}
					class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
				>
					Cerrar sesión
				</button>
			</div>

			<!-- Mobile menu button -->
			<div class="md:hidden">
				<button
					onclick={toggleMobileMenu}
					class="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset"
					aria-expanded={mobileMenuOpen}
				>
					<span class="sr-only">Open main menu</span>
					{#if mobileMenuOpen}
						<!-- Close icon -->
						<svg class="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					{:else}
						<!-- Menu icon -->
						<svg class="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							/>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<!-- Mobile Navigation Menu -->
		{#if mobileMenuOpen}
			<div class="md:hidden">
				<div class="space-y-1 border-t border-gray-200 px-2 pt-2 pb-3 sm:px-3">
					{#each navigationItems as item}
						<a
							href={item.href}
							onclick={closeMobileMenu}
							class="flex items-center space-x-3 rounded-md px-3 py-2 text-base font-medium transition-colors
								{isCurrentPage(item.href)
								? 'bg-blue-50 text-blue-600'
								: 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'}"
						>
							<span>{item.icon}</span>
							<span>{item.name}</span>
						</a>
					{/each}

					<div class="border-t border-gray-200 px-3 pt-2">
						<div class="text-sm font-medium text-gray-700">{displayName()}</div>
						<button
							onclick={() => {
								closeMobileMenu();
								logout();
							}}
							class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
						>
							Cerrar sesión
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</header>
