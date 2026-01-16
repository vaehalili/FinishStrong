<script lang="ts">
  import { viewingDate, getTodayString } from '$lib/stores/viewingDate';
  import { auth } from '$lib/stores/auth';

  let { title = 'FinishStrong', isOnline = true, isAuthenticated = false } = $props();

  async function handleLogout() {
    await auth.signOut();
  }

  let showDatePicker = $state(false);
  let datePickerValue = $state('');

  function formatDisplayDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  function handlePrevDay() {
    viewingDate.goToPreviousDay();
  }

  function handleNextDay() {
    viewingDate.goToNextDay();
  }

  function handleToday() {
    viewingDate.goToToday();
  }

  function handleDateClick() {
    datePickerValue = $viewingDate;
    showDatePicker = true;
  }

  function handleDatePickerChange(event: Event) {
    const target = event.target as HTMLInputElement;
    viewingDate.goToDate(target.value);
    showDatePicker = false;
  }

  function closeDatePicker() {
    showDatePicker = false;
  }

  const isToday = $derived($viewingDate === getTodayString());
</script>

<header class="app-header">
  <div class="header-left">
    <span class="logo">💪</span>
    <span class="title">{title}</span>
  </div>
  
  <div class="header-center">
    <button class="nav-btn" onclick={handlePrevDay} aria-label="Previous day">
      ←
    </button>
    <button class="date-display" onclick={handleDateClick} aria-label="Select date">
      {formatDisplayDate($viewingDate)}
    </button>
    <button class="nav-btn" onclick={handleNextDay} aria-label="Next day">
      →
    </button>
    {#if !isToday}
      <button class="today-btn" onclick={handleToday}>
        Today
      </button>
    {/if}
  </div>
  
  <div class="header-right">
    <span class="status" class:offline={!isOnline} title={isOnline ? 'Online' : 'Offline'}>
      {isOnline ? '🟢' : '🔴'}
    </span>
    {#if isAuthenticated}
      <button class="logout-btn" onclick={handleLogout} aria-label="Log out">
        ↪
      </button>
    {/if}
  </div>
</header>

{#if showDatePicker}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="date-picker-overlay" onclick={closeDatePicker} role="presentation">
    <div class="date-picker-modal" onclick={(e) => e.stopPropagation()}>
      <input
        type="date"
        value={datePickerValue}
        onchange={handleDatePickerChange}
        class="date-input"
      />
    </div>
  </div>
{/if}

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
    padding: var(--space-sm) var(--space-md);
    padding-top: calc(var(--space-sm) + env(safe-area-inset-top, 0px));
    z-index: 100;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-shrink: 0;
  }

  .logo {
    font-size: 1.375rem;
  }

  .title {
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .header-center {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex: 1;
    justify-content: center;
  }

  .nav-btn {
    background: var(--bg-medium);
    border: none;
    color: var(--text-primary);
    font-size: 1rem;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .nav-btn:hover {
    background-color: rgba(251, 146, 60, 0.2);
    color: var(--orange-accent);
  }

  .date-display {
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-weight: 600;
    padding: var(--space-sm) var(--space-sm);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .date-display:hover {
    background-color: var(--bg-medium);
  }

  .today-btn {
    background: var(--orange-accent);
    border: none;
    color: var(--bg-darkest);
    font-size: 0.6875rem;
    font-weight: 700;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    cursor: pointer;
    margin-left: var(--space-xs);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    transition: all 0.15s ease;
  }

  .today-btn:hover {
    transform: scale(1.05);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    flex-shrink: 0;
  }

  .status {
    font-size: 0.625rem;
  }

  .status.offline {
    animation: pulse 2s infinite;
  }

  .logout-btn {
    background: var(--bg-medium);
    border: none;
    color: var(--text-primary);
    font-size: 1rem;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .logout-btn:hover {
    background-color: rgba(248, 113, 113, 0.2);
    color: var(--red-destructive);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .date-picker-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
  }

  .date-picker-modal {
    background: var(--bg-dark);
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--bg-medium);
    box-shadow: var(--shadow-lg);
  }

  .date-input {
    background: var(--bg-medium);
    border: 2px solid var(--bg-darkest);
    color: var(--text-primary);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    font-size: 1rem;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .date-input:focus {
    outline: none;
    border-color: var(--orange-accent);
  }
</style>
