<script lang="ts">
  import { page } from '$app/stores';

  const tabs = [
    { href: '/', label: 'Log' },
    { href: '/ask', label: 'Ask' },
    { href: '/dashboard', label: 'Dashboard' }
  ];

  function isActive(href: string, pathname: string): boolean {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  }
</script>

<nav class="tab-nav">
  {#each tabs as tab}
    <a
      href={tab.href}
      class="tab"
      class:active={isActive(tab.href, $page.url.pathname)}
    >
      <span class="icon">
        {#if tab.href === '/'}
          <!-- Dumbbell / Log icon -->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6.5 6.5a2.5 2.5 0 0 1 0 5h-1a2.5 2.5 0 0 1 0-5h1z"/>
            <path d="M17.5 6.5a2.5 2.5 0 0 1 0 5h1a2.5 2.5 0 0 1 0-5h-1z"/>
            <path d="M6 9h12"/>
            <path d="M3 9h1"/>
            <path d="M20 9h1"/>
            <path d="M6.5 11.5a2.5 2.5 0 0 1 0 5h-1a2.5 2.5 0 0 1 0-5h1z"/>
            <path d="M17.5 11.5a2.5 2.5 0 0 1 0 5h1a2.5 2.5 0 0 1 0-5h-1z"/>
            <path d="M6 14h12"/>
            <path d="M3 14h1"/>
            <path d="M20 14h1"/>
          </svg>
        {:else if tab.href === '/ask'}
          <!-- Message circle / Ask icon -->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
          </svg>
        {:else if tab.href === '/dashboard'}
          <!-- Bar chart / Dashboard icon -->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="20" x2="12" y2="10"/>
            <line x1="18" y1="20" x2="18" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="16"/>
          </svg>
        {/if}
      </span>
      <span class="label">{tab.label}</span>
    </a>
  {/each}
</nav>

<style>
  .tab-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    background-color: var(--bg-dark);
    border-top: 1px solid var(--bg-medium);
    padding: var(--space-sm) 0;
    padding-bottom: calc(var(--space-sm) + env(safe-area-inset-bottom, 0px));
    z-index: 100;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
  }

  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-sm) var(--space-md);
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s ease, transform 0.15s ease;
    min-width: 72px;
  }

  .tab:hover {
    color: var(--text-secondary);
    text-decoration: none;
  }

  .tab:active {
    transform: scale(0.95);
  }

  .tab.active {
    color: var(--orange-accent);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-bottom: var(--space-xs);
  }

  .icon svg {
    width: 22px;
    height: 22px;
  }

  .label {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
</style>
