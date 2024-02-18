export interface ObjectWithState {
  state?: State;
}

export type State = "loading" | "finished" | "errored";
