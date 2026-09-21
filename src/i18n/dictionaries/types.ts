import type tr from "./tr";

type WidenStrings<T> = {
  [K in keyof T]: T[K] extends string ? string : WidenStrings<T[K]>;
};

export type AppDictionary = WidenStrings<typeof tr>;
