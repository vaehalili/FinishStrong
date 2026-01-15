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
    padding: 0.75rem 1rem;
    padding-top: calc(0.75rem + env(safe-area-inset-top, 0px));
    z-index: 100;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .logo {
    font-size: 1.25rem;
  }

  .title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-center {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex: 1;
    justify-content: center;
  }

  .nav-btn {
    background: var(--bg-medium);
    border: none;
    color: var(--text-primary);
    font-size: 1rem;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }

  .nav-btn:hover {
    background-color: var(--bg-darkest);
  }

  .date-display {
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.375rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .date-display:hover {
    background-color: var(--bg-medium);
  }

  .today-btn {
    background: var(--orange-accent);
    border: none;
    color: var(--bg-darkest);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    margin-left: 0.25rem;
  }

  .today-btn:hover {
    opacity: 0.9;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .status {
    font-size: 0.75rem;
  }

  .status.offline {
    animation: pulse 2s infinite;
  }

  .logout-btn {
    background: var(--bg-medium);
    border: none;
    color: var(--text-primary);
    font-size: 1rem;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }

  .logout-btn:hover {
    background-color: var(--bg-darkest);
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
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
  }

  .date-picker-modal {
    background: var(--bg-dark);
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 1px solid var(--bg-medium);
  }

  .date-input {
    background: var(--bg-medium);
    border: 1px solid var(--bg-darkest);
    color: var(--text-primary);
    padding: 0.75rem;
    border-radius: 0.25rem;
    font-size: 1rem;
    cursor: pointer;
  }

  .date-input:focus {
    outline: none;
    border-color: var(--orange-accent);
  }
</style>
