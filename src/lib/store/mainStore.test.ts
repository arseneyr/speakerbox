import { MainStore } from "./mainStore";
import testBackend from "../backend/testBackend";
import { waitForValue } from "$lib/utils";
import { SampleStore } from "./sampleStore";

jest.mock("../player");

const backend = testBackend();
let store: MainStore;

beforeEach(async () => {
  await backend.setMainState({ version: "0", settings: {}, samples: [] });
  store = new MainStore(backend);
  await store.init();
});

describe("anyPlaying store", () => {
  test("empty set", () => {
    const subscriber = jest.fn();
    store.anyPlaying.subscribe(subscriber);
    expect(subscriber).toHaveBeenLastCalledWith(false);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
  test("adding false player", () => {
    const subscriber = jest.fn();
    store.anyPlaying.subscribe(subscriber);
    store.prepend(new SampleStore({ data: new ArrayBuffer(0) }));
    expect(subscriber).toHaveBeenLastCalledWith(false);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
  test("adding true player", async () => {
    const subscriber = jest.fn();
    store.anyPlaying.subscribe(subscriber);
    const sample = new SampleStore({ data: new ArrayBuffer(0) });
    store.prepend(sample);
    const player = await waitForValue(sample.player);

    expect(subscriber).toHaveBeenLastCalledWith(false);
    player.play();
    expect(subscriber).toHaveBeenLastCalledWith(true);
    expect(subscriber).toHaveBeenCalledTimes(2);
  });
});
