<script>
  import { compute_slots } from "svelte/internal";
</script>

<div class="root">
  {#if $$slots.panel}
    <div class="panel">
      <slot name="panel" />
    </div>
  {/if}
  <slot />
</div>

<style>
  .root {
    width: 100%;
    display: grid;
    grid-gap: 0.8rem;
    grid-auto-rows: 48px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  .panel {
    grid-row-end: span 2;
    grid-column-end: span 1;
  }

  @media (min-width: 632px) {
    .panel {
      grid-column-end: span 2;
    }
  }

  @media (min-width: 800px) {
    .panel {
      grid-column-end: span 2;
    }
  }

  /* @media (min-width: 500px) {
    div {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 900px) {
    div {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (min-width: 1200px) {
    div {
      grid-template-columns: repeat(4, 1fr);
    }
  } */
</style>
