import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const settingsSlice = createSlice({
  name: "settings",
  initialState: { sinkId: "default" },
  reducers: {
    setSinkId: (state, { payload }: PayloadAction<string>) => {
      state.sinkId = payload;
    },
  },
});

export const { setSinkId } = settingsSlice.actions;
export default settingsSlice.reducer;
