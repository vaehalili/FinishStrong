<script lang="ts">
  import { page } from '$app/stores';

  const tabs = [
    { href: '/', label: 'Log', icon: '📝' },
    { href: '/ask', label: 'Ask', icon: '💬' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' }
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
      <span class="icon">{tab.icon}</span>
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
    padding: 0.5rem 0;
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
    z-index: 100;
  }

  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s ease;
    min-width: 64px;
  }

  .tab:hover {
    color: var(--text-secondary);
    text-decoration: none;
  }

  .tab.active {
    color: var(--orange-accent);
  }

  .icon {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .label {
    font-size: 0.75rem;
    font-weight: 500;
  }
</style>
