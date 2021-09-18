<script lang="ts">
  import Dialog, { Title, Content } from "@smui/dialog/styled";
  import Select, { Option } from "@smui/select/styled";
  import AddButton from "./AddButton.svelte";

  export let open: boolean;

  let devices: { id: string; label?: string }[] = [];
  // let value: string | undefined;
  $: value = (devices.find(({ id }) => id === "default") ?? devices[0])?.id;
  navigator.mediaDevices.enumerateDevices().then((dev) => {
    // console.log(dev);
    devices = dev
      .filter((d) => d.kind === "audiooutput")
      .map((d, i) => ({
        label: d.label,
        id: d.deviceId || `device-${i}`,
      }));
  });
  $: namesAvailable = devices.length && !!devices[0].label;
  $: console.log(value);
  $: console.log(devices);
</script>

<Dialog
  bind:open
  class="dialogRoot"
  surface$class="allowBreakout dialogSurface"
  surface$style="width: 400px"
>
  <Title>Settings</Title>
  <Content class="allowBreakout">
    <Select
      bind:value
      label="Output Device"
      class="fullWidth"
      menu$class="menuClass"
    >
      {#each devices as device, i (device.id)}
        <Option value={device.id}>{device.label || "Output Device" + i}</Option>
      {/each}
    </Select>
  </Content>
</Dialog>

<style lang="scss">
  @use 'smui-theme' as theme;

  :global(.mdc-dialog .mdc-dialog__surface) {
    background-color: theme.$darkColor;
  }
  :global(.dialogRoot .fullWidth) {
    width: 100%;
  }

  :global(.dialogRoot .menuClass) {
    background-color: theme.$darkColor;
  }

  :global(.allowBreakout) {
    overflow: visible;
  }
</style>
