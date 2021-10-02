import type { Entries } from "$lib/utils";
import type { FreezeObject } from "automerge";
import type { OpId } from "automerge";
import type { BinaryDocument, Doc, Patch } from "automerge";
import * as t from "io-ts";

// declare module "automerge" {
//   interface ListDiff {
//     props: {
//       [propName: string]: { [opId: string]: MapDiff | ListDiff | ValueDiff };
//     };
//   }
// }
type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U>
    ? Mutable<U>[]
    : Mutable<T[P]>;
};

// interface ConflictMap {
//   [key: string]: ConflictMap | { actorId: string; value: any }[];
// }

type ConflictMap<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? ConflictMap<T[K]>
    : { actorId: string; value: T[K] }[];
};

type PropDiff<T> = {
  objectId: OpId;
  type: "map" | "list";
  props: {
    [K in keyof T]: { [opId: string]: PropDiff<T[K]> };
  };
};

// type ConflictMapValues<T> = ConflictMap<T>[keyof ConflictMap<T>];
type ConflictMapValues = ConflictMap<any> | { actorId: string; value: any }[];

type ExtendedDoc<T> = Doc<T> & {
  _conflicts?: ConflictMap<T>;
  _actorId: string;
};

let Automerge: typeof import("automerge");

export async function loadAutomerge(): Promise<typeof Automerge> {
  if (Automerge) {
    return Automerge;
  }
  Automerge = (await import("automerge")).default;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (import.meta.env.DEV) {
    Automerge.init({ freeze: true });
  }
  return Automerge;
}

export const AutomergeCodec = <C extends t.Mixed>(base: C) =>
  new t.Type<ExtendedDoc<t.TypeOf<C>>, Uint8Array, unknown>(
    "Automerge Doc",
    (input): input is ExtendedDoc<t.TypeOf<C>> =>
      typeof input === "object" &&
      input !== null &&
      "_actorId" in input &&
      base.is(input),
    (input, context) => {
      try {
        if (!(input instanceof Uint8Array)) {
          throw new Error("non uint8array passed");
        }
        const doc = mergeableLoad(input);
        return base.validate(doc, context);
      } catch (e: unknown) {
        return t.failure(
          input,
          context,
          e instanceof Error ? e.message : undefined
        );
      }
    },
    (input) => mergeableSave(input)
  );

// interface ConflictRecord {
//   path: string[];
//   values: { setByNewDoc: boolean; value: any }[];
// }

// type ConflictMap = Record<string, ConflictMap | ConflictRecord>;
// function getConflictPaths(
//   diff: ListDiff | MapDiff,
//   path: string[]
// ): string[][] {
//   let ret: string[][] = [];
//   if (!diff.props) {
//     return ret;
//   }
//   for (const [propName, value] of Object.entries(diff.props)) {
//     if (Object.keys(value).length > 1) {
//       // conflict exists
//       ret.push(path.concat(propName));
//     } else {
//       ret = ret.concat(
//         ...Object.values(value)
//           .filter(
//             (innerVal): innerVal is ListDiff | MapDiff =>
//               innerVal.type === "map" || innerVal.type === "list"
//           )
//           .map((innerVal) => getConflictPaths(innerVal, path.concat(propName)))
//       );
//     }
//   }
//   return ret;
// }

function extractConflicts<T>(
  doc: Doc<T>,
  diff: PropDiff<T>
): ConflictMapValues | null {
  if (!diff.props) {
    return null;
  }

  let ret: ConflictMapValues | null = null;

  for (const [propName, propValue] of Object.entries(diff.props) as Entries<
    typeof diff.props
  >) {
    if (Object.keys(propValue).length > 1) {
      (ret ?? (ret = {} as any))[propName] = Object.entries(
        Automerge.getConflicts(doc, propName)
      ).map(([changeId, value]) => ({
        actorId: changeId.split("@", 2)[1],
        value,
      }));
      // ret[propName] = Object.entries(propValue)
      //   .filter((entry): entry is [string, ValueDiff] => {
      //     const valid = entry[1].type === "value";
      //     assert(valid, "merging conflicting nested maps/lists");
      //     return valid;
      //   })
      //   .map(([actor, diff]) => ({
      //     actorId: actor.split("@", 2)[1],
      //     value: diff.value,
      //   }));
    } else {
      const nestedDiffs = Object.values(propValue).filter(
        (nestedDiff): nestedDiff is PropDiff<T[keyof T]> =>
          nestedDiff.type === "map" || nestedDiff.type === "list"
      );
      for (const nestedDiff of nestedDiffs) {
        const nestedConflict = extractConflicts(
          doc[propName] as FreezeObject<T[keyof T]>,
          nestedDiff
        );
        if (nestedConflict) {
          (ret ?? (ret = {} as any))[propName] = nestedConflict;
        }
      }
    }
  }
  return ret;
}

function patchCallback<T extends Record<string, unknown>>(
  patch: Patch,
  oldDoc: Doc<T>,
  newDoc: Doc<T>
) {
  // const conflicts: ConflictRecord[] = flattenDiff(patch.diffs, []).map(
  //   (conflictPath) => {
  //     const innerDocPath = conflictPath.slice(0, conflictPath.length - 1);
  //     const innerDoc = innerDocPath.reduce(
  //       (acc, cur) => acc[cur] as any,
  //       newDoc
  //     );

  //     return {
  //       path: conflictPath,
  //       values: Object.entries(
  //         Automerge.getConflicts(
  //           innerDoc,
  //           conflictPath[conflictPath.length - 1]
  //         )
  //       ).map(([editId, value]) => ({
  //         setByNewDoc: editId.split("@", 2)[1] === Automerge.getActorId(newDoc),
  //         value,
  //       })),
  //     };
  //   }
  // );

  const conflicts = extractConflicts(newDoc, patch.diffs as PropDiff<T>);
  // const conflictPaths = getConflictPaths(patch.diffs, []);
  // if (conflictPaths.length) {
  //   const conflictMap: ConflictMap = {};
  //   for (const conflictPath of conflictPaths) {
  //     const pathHead = conflictPath.slice(0, conflictPath.length - 1);
  //     const lastPathEl = conflictPath[conflictPath.length - 1];
  //     let innermostObj = conflictMap;
  //     let innerDoc = newDoc;
  //     for (const pathEl of pathHead) {
  //       innermostObj[pathEl] = {};
  //       innermostObj = innermostObj[pathEl] as any;
  //       innerDoc = innerDoc[pathEl] as any;
  //     }
  //     innermostObj[lastPathEl] = Object.entries(
  //       Automerge.getConflicts(innerDoc, lastPathEl)
  //     ).map(([changeId, value]) => ({
  //       actorId: changeId.split("@", 2)[1],
  //       value,
  //     }));
  //   }
  conflicts &&
    Object.defineProperty(newDoc, "_conflicts", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: conflicts,
    });
  // }
}

function addActorId<T>(
  doc: Doc<T> | ExtendedDoc<T>,
  actorId?: string
): ExtendedDoc<T> {
  return Object.defineProperty(doc, "_actorId", {
    enumerable: false,
    configurable: false,
    writable: false,
    value:
      actorId ?? ("_actorId" in doc ? doc._actorId : Automerge.getActorId(doc)),
  }) as ExtendedDoc<T>;
}

function mergeableInit<T extends Record<string, unknown>>(
  state: T,
  actorId?: string
): ExtendedDoc<T> {
  return addActorId(
    Automerge.from(state, {
      patchCallback: patchCallback as any,
      actorId,
    }),
    actorId
  );
}

function mergeableClone<T>(doc: Doc<T>, actorId?: string): ExtendedDoc<T> {
  return addActorId(
    Automerge.clone(doc, { patchCallback: patchCallback as any, actorId }),
    actorId
  );
}

function mergeableChange<T extends Record<string, unknown>>(
  doc: Doc<T>,
  updateFn: (contents: Mutable<T>) => void
): ExtendedDoc<T> {
  return addActorId(Automerge.change(doc, updateFn));
}

function mergeableMerge<T>(first: Doc<T>, second: Doc<T>): ExtendedDoc<T> {
  return addActorId(Automerge.merge(first, second));
}

function mergeableSave<T>(doc: Doc<T> | ExtendedDoc<T>): Uint8Array {
  const actorIdBuffer = new TextEncoder().encode(Automerge.getActorId(doc));
  const savedState = Automerge.save(doc);
  const outputBuffer = new Uint8Array(
    actorIdBuffer.length + 1 + savedState.length
  );
  outputBuffer.set(actorIdBuffer, 0);
  // Leave room for null byte
  outputBuffer.set(savedState, actorIdBuffer.length + 1);
  return outputBuffer;
}

function mergeableLoad<T>(data: Uint8Array): ExtendedDoc<T> {
  const actorIdSplitPoint = data.indexOf(0);
  if (actorIdSplitPoint < 0) {
    throw new Error("no actor id null byte found");
  }
  const actorId = new TextDecoder("utf-8", { fatal: true }).decode(
    data.subarray(0, actorIdSplitPoint)
  );
  return addActorId(
    Automerge.load<T>(data.subarray(actorIdSplitPoint + 1) as BinaryDocument, {
      patchCallback,
      actorId,
    }),
    actorId
  );
}

export {
  mergeableInit,
  mergeableMerge,
  mergeableChange,
  mergeableClone,
  mergeableLoad,
  mergeableSave,
};
