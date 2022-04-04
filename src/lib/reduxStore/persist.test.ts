import {
  configureStore,
  createAction,
  createListenerMiddleware,
  type AnyAction,
} from "@reduxjs/toolkit";
import { loadAutomerge } from "./automerge";
import persist from "./persist";

beforeAll(() => loadAutomerge());

function testBackend() {
  const map = new Map<string, unknown>();

  return {
    getKey: jest.fn(async (key) =>
      map.has(key) ? { value: map.get(key) } : null
    ),
    setKey: jest.fn(async (key, value) => {
      map.set(key, value);
    }),
    __map: map,
  };
}

type State = {
  counter: number;
};
const initialState = { counter: 0 };
const increment = createAction("increment");
function innerReducer(state = initialState, action: AnyAction) {
  if (increment.match(action)) {
    state.counter++;
  }
  return state;
}

function createPersistedStore() {
  const { reducer, actions } = persist({
    reducer: innerReducer,
    selector: (s: State) => s,
    key: "testKey",
  });
  const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(createListenerMiddleware().middleware),
  });
  return { store, actions };
}

test("change immediately after starting", async () => {
  const backend = testBackend();
  const { store: store1, actions: actions1 } = createPersistedStore();
  store1.dispatch(actions1.start(backend));
  store1.dispatch(increment());
  await store1.dispatch(actions1.flush());

  const { store: store2, actions: actions2 } = createPersistedStore();
  await store2.dispatch(actions2.start(backend));
  expect(store2.getState().counter).toBe(1);
});
