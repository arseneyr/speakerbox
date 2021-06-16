import { browser } from "$app/env";

let audioContext;

if (browser) {
  audioContext = new AudioContext();
}
export default audioContext;
