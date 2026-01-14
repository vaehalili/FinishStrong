<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { seedExercises } from '$lib/db/seed';
  import AppHeader from '$lib/components/AppHeader.svelte';
  import TabNav from '$lib/components/TabNav.svelte';
  import { isOnline } from '$lib/stores/online';
  import { auth, isAuthenticated, isAuthLoading } from '$lib/stores/auth';

  let { children } = $props();

  const publicRoutes = ['/login'];

  onMount(() => {
    auth.initialize();
    seedExercises();
  });

  $effect(() => {
    const currentPath = $page.url.pathname;
    const isPublicRoute = publicRoutes.includes(currentPath);
    
    if (!$isAuthLoading && !$isAuthenticated && !isPublicRoute) {
      goto('/login');
    }
  });
</script>

<div class="app-container">
  <AppHeader isOnline={$isOnline} isAuthenticated={$isAuthenticated} />
  <main class="main-content">
    {@render children()}
  </main>
  <TabNav />
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-top: calc(60px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
  }
</style>
