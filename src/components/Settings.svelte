<script lang="ts">
  import { setSink } from "$lib/audioContext";

  import Button from "@smui/button/styled";
  import Dialog, { Title, Content } from "@smui/dialog/styled";
  import IconButton from "@smui/icon-button/styled";
  import Select, { Option } from "@smui/select/styled";
  import { createEventDispatcher, tick } from "svelte";

  // export let open: boolean;

  const dispatch = createEventDispatcher();

  let devices: { id: string; label?: string }[] = [];
  let value: string | undefined;

  async function getDevices() {
    value = undefined;
    devices = (await navigator.mediaDevices.enumerateDevices())

      .filter((d) => d.kind === "audiooutput")
      .map((d, i) => ({
        label: d.label,
        id: d.deviceId || `device-${i}`,
      }));
    await tick();
    value = (devices.find(({ id }) => id === "default") || devices[0])?.id;
    console.log(devices);
  }
  getDevices();

  $: value && setSink(value);

  async function revealNames() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    getDevices();
  }

  $: namesAvailable = devices.length && !!devices[0].label;
</script>

<Dialog
  open
  class="dialogRoot"
  surface$class="allowBreakout dialogSurface"
  surface$style="width: 400px"
  on:MDCDialog:closed={() => dispatch("close")}
>
  <h2 class="mdc-dialog__title">Settings</h2>
  <div class="allowBreakout mdc-dialog__content">
    {#if namesAvailable}
      <Select
        bind:value
        label="Output Device"
        class={`fullWidth${namesAvailable ? "" : " italed"}`}
        menu$class="menuClass"
      >
        {#each devices as device, i (device.id)}
          <Option value={device.id}
            >{device.label || "Unknown Device " + i}</Option
          >
        {/each}
      </Select>
    {:else}
      <Button on:click={revealNames}>Select Output Device</Button>
    {/if}
  </div>
</Dialog>

<style lang="scss">
  @use 'smui-theme' as theme;

  .outputSelector {
    display: flex;
  }

  :global(.dialogRoot .mdc-dialog__surface) {
    background-color: theme.$darkColor;
  }
  :global(.dialogRoot .fullWidth) {
    width: 100%;
  }

  :global(.dialogRoot .mdc-select.italed :is(span, li)) {
    font-style: italic;
  }

  :global(.dialogRoot .menuClass) {
    background-color: theme.$darkColor;
  }

  :global(.allowBreakout) {
    overflow: visible;
  }
</style>
