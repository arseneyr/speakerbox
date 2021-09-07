import inMemory from "./inMemory";

export default jest.fn(() => {
  const ret = inMemory();
  for (const key of Object.keys(ret)) {
    ret[key] = jest.fn(ret[key]);
  }
  return ret;
});
