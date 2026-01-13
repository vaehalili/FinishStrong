<script lang="ts">
</script>

<div class="dashboard-page">
  <div class="content">
    <p class="empty-state">Your workout stats and progress</p>
  </div>
</div>

<style>
  .dashboard-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1rem;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .empty-state {
    color: var(--text-muted);
    font-size: 1rem;
  }
</style>
