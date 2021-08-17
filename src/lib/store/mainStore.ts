import { derived, Readable, writable } from "svelte/store";

interface SimplePlayer {
  playing: Readable<boolean>;
}

export function createAnyPlayingStore(): Readable<boolean> & {
  add(player: Readable<SimplePlayer | null>);
  delete(player: Readable<SimplePlayer>);
} {
  // setStore: Readable<Set<Readable<{ playing: Readable<boolean> } | null>>>
  const setStore = writable(
    new Set<Readable<{ playing: Readable<boolean> } | null>>()
  );
  return Object.assign(
    derived<typeof setStore, boolean>(setStore, (playerSet, s1) =>
      derived(
        Array.from(playerSet) as any,
        (players: (SimplePlayer | null)[], s2) =>
          derived(
            players.filter((p) => p).map((p) => p.playing) as any,
            (playing: boolean[]) => playing.some((v) => v)
          ).subscribe(s2)
      ).subscribe(s1)
    ),
    {
      add(player: Readable<SimplePlayer | null>) {
        setStore.update((set) => set.add(player));
      },
      delete(player: Readable<SimplePlayer>) {
        setStore.update((set) => (set.delete(player), set));
      },
    }
  );
}
