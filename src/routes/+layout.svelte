<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { seedExercises } from '$lib/db/seed';

  let { children } = $props();

  onMount(() => {
    seedExercises();
  });
</script>

{@render children()}
