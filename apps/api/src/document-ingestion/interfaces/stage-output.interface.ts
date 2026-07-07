export interface IStageOutput<T> {
  data: T;
  metadata: Record<string, any>;
  durationMs: number;
}
