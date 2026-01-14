<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { seedExercises } from '$lib/db/seed';
  import AppHeader from '$lib/components/AppHeader.svelte';
  import TabNav from '$lib/components/TabNav.svelte';
  import { isOnline } from '$lib/stores/online';

  let { children } = $props();

  onMount(() => {
    seedExercises();
  });
</script>

<div class="app-container">
  <AppHeader isOnline={$isOnline} />
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
