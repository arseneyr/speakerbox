import { h64 } from "xxhashjs";

export default (data) => h64(data, 0).toString();
