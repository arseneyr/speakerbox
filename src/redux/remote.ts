import samples from "./samples";
import produce, { enablePatches } from "immer";

enablePatches();

export function remoteSamplesReducer(
  samplesReducer: typeof samples
): typeof samples {
  return (state, action) =>
    produce(
      state,
      (draft) => samplesReducer(draft, action),
      (patches) => {
        patches.length && console.log(action, patches);
      }
    );
}
