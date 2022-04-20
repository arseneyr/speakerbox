<script>
  import SampleButton from "../components/SampleButton.svelte";

  let startTime = null;
  let iconButton = null;
  export let duration = null;
  export let title = "";
  let timer = null;
</script>

<SampleButton
  {title}
  {startTime}
  {duration}
  on:click={() => {
    startTime = Date.now();
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      iconButton = null;
      timer = null;
    }, duration);
    iconButton = {
      icon: "stop",
      onClick: () => {
        timer && clearTimeout(timer);
        timer = null;
        iconButton = null;
        startTime = null;
      },
    };
  }}
  {iconButton}
/>
