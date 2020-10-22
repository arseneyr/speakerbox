import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Sink {
  sinkId: string;
  sinkName: string;
}

interface SettingsState {
  preferredSink: Sink | null;
  sink: Sink;
}

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    preferredSink: null,
    sink: { sinkId: "default", sinkName: "Default Output" },
  } as SettingsState,
  reducers: {
    setSink: (state, { payload }: PayloadAction<Sink>) => {
      state.sink = payload;
    },
    setPreferredSink: (state, { payload }: PayloadAction<Sink>) => {
      state.sink = payload;
      state.preferredSink = payload;
    },
  },
});

export const { setSink, setPreferredSink } = settingsSlice.actions;
export default settingsSlice.reducer;
