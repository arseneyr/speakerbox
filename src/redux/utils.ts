import { Action, AnyAction, Reducer as ReduxReducer } from "redux";

export interface ActionWithPayload<T extends string, P> extends Action<T> {
  payload: P;
}

export function createAction<T extends string>(type: T): Action<T>;
export function createAction<T extends string, P>(
  type: T,
  payload: P
): ActionWithPayload<T, P>;
export function createAction<T extends string, P>(type: T, payload?: P) {
  return payload === undefined ? { type } : { type, payload };
}

type ActionCreatorsMapObject = {
  [actionCreator: string]: (...args: any[]) => any;
};
export type ActionsUnion<A extends ActionCreatorsMapObject> = ReturnType<
  A[keyof A]
>;

type Reducer<S = any, A extends Action = AnyAction> = (
  state: S,
  action: A
) => S;

export function reduceReducers<
  S,
  A extends ActionWithPayload<string, any> | Action<string>
>(
  initialState: Exclude<S, undefined> | null,
  ...reducers: Reducer<S, A>[]
): ReduxReducer<S, A> {
  if (typeof initialState === "undefined") {
    throw new TypeError(
      "The initial state may not be undefined. If you do not want to set a value for this reducer, you can use null instead of undefined."
    );
  }

  return (prevState: S | undefined, value: A | undefined) => {
    const prevStateIsUndefined = typeof prevState === "undefined";
    const valueIsUndefined = typeof value === "undefined";

    if (prevStateIsUndefined && valueIsUndefined && initialState) {
      return initialState;
    }

    return reducers.reduce(
      (newState, reducer, index) => {
        if (typeof reducer === "undefined") {
          throw new TypeError(
            `An undefined reducer was passed in at index ${index}`
          );
        }

        return reducer(newState, value as A);
      },
      prevStateIsUndefined && !valueIsUndefined && initialState
        ? initialState
        : (prevState as S)
    );
  };
}

reduceReducers({});
