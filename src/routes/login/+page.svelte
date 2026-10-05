<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok || !data.success) {
				error = data.error || 'No se pudo iniciar sesión';
				return;
			}

			await goto('/');
		} catch {
			error = 'No se pudo conectar con el servidor de autenticación';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Iniciar sesión · GPX Tracker</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
	<div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
		<div class="text-center">
			<div class="text-3xl">🏃</div>
			<h1 class="mt-4 text-2xl font-bold text-gray-900">Iniciar sesión</h1>
			<p class="mt-2 text-sm text-gray-500">Accede con tu cuenta para ver tus actividades</p>
		</div>

		{#if error}
			<p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{error}
			</p>
		{/if}

		<form
			class="mt-6 space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				handleLogin();
			}}
		>
			<label class="block text-sm font-medium text-gray-700">
				Email
				<input
					bind:value={email}
					type="email"
					required
					autocomplete="email"
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm transition outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
					placeholder="tu@correo.com"
				/>
			</label>

			<label class="block text-sm font-medium text-gray-700">
				Contraseña
				<input
					bind:value={password}
					type="password"
					required
					autocomplete="current-password"
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm transition outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
					placeholder="••••••••"
				/>
			</label>

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loading ? 'Conectando…' : 'Entrar'}
			</button>
		</form>
	</div>
</div>
