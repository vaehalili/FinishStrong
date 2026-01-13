<script lang="ts">
  let { title = 'FinishStrong', isOnline = true } = $props();

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  const today = new Date();
</script>

<header class="app-header">
  <div class="header-left">
    <span class="logo">💪</span>
    <span class="title">{title}</span>
  </div>
  
  <div class="header-right">
    <span class="date">{formatDate(today)}</span>
    <span class="status" class:offline={!isOnline} title={isOnline ? 'Online' : 'Offline'}>
      {isOnline ? '🟢' : '🔴'}
    </span>
  </div>
</header>

<style>
  .app-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--bg-dark);
    border-bottom: 1px solid var(--bg-medium);
    padding: 1rem;
    padding-top: calc(1rem + env(safe-area-inset-top, 0px));
    z-index: 100;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .logo {
    font-size: 1.5rem;
  }

  .title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .date {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .status {
    font-size: 0.75rem;
  }

  .status.offline {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
