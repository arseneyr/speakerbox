import type { BinaryDocument, Doc } from "automerge";
import * as t from "io-ts";

let Automerge: typeof import("automerge");

export async function loadAutomerge(): Promise<typeof Automerge> {
  Automerge = (await import("automerge")).default;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (import.meta.env.DEV) {
    Automerge.init({ freeze: true });
  }
  return Automerge;
}

export const AutomergeCodec = <C extends t.Mixed>(base: C) =>
  new t.Type<Doc<t.TypeOf<C>>, Uint8Array, unknown>(
    "Automerge Doc",
    (input): input is Doc<t.TypeOf<C>> => base.is(input),
    (input, context) => {
      if (input instanceof Uint8Array) {
        try {
          return base.validate(
            Automerge.load(input as BinaryDocument),
            context
          );
        } catch {
          return t.failure(input, context);
        }
      }
      return t.failure(input, context);
    },
    (input) => Automerge.save(input)
  );
