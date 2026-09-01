export interface MemorySnapshot {
  capturedAt: number;
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export class DiagnosticSampler {
  private readonly samples: MemorySnapshot[];
  private baseline: MemorySnapshot;

  public constructor(
    baseline: MemorySnapshot,
    private readonly maximumSamples = 60
  ) {
    this.baseline = { ...baseline };
    this.samples = [{ ...baseline }];
  }

  public record(sample: MemorySnapshot): void {
    this.samples.push(sample);
    while (this.samples.length > this.maximumSamples) {
      this.samples.shift();
    }
  }

  public getBaseline(): MemorySnapshot {
    return { ...this.baseline };
  }

  public getLatest(): MemorySnapshot {
    return { ...this.samples[this.samples.length - 1] };
  }

  public getSamples(): MemorySnapshot[] {
    return this.samples.map((sample) => ({ ...sample }));
  }

  public getRssDelta(): number {
    return this.getLatest().rss - this.baseline.rss;
  }

  public resetBaseline(sample: MemorySnapshot): void {
    this.baseline = { ...sample };
    this.samples.splice(0, this.samples.length, { ...sample });
  }
}
