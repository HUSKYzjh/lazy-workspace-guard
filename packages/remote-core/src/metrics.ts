import { EventEmitter } from "node:events";

export interface LazyTreeMetricsSnapshot {
  directoryReads: number;
  entriesListed: number;
  largestDirectoryListing: number;
  failedDirectoryReads: number;
  totalReadMilliseconds: number;
}

export class LazyTreeMetrics {
  private readonly changeEmitter = new EventEmitter();
  private readonly metrics: LazyTreeMetricsSnapshot = {
    directoryReads: 0,
    entriesListed: 0,
    largestDirectoryListing: 0,
    failedDirectoryReads: 0,
    totalReadMilliseconds: 0
  };

  public onDidChange(listener: () => void): () => void {
    this.changeEmitter.on("change", listener);
    return () => this.changeEmitter.off("change", listener);
  }

  public recordDirectoryRead(entries: number, durationMilliseconds: number): void {
    this.metrics.directoryReads += 1;
    this.metrics.entriesListed += entries;
    this.metrics.largestDirectoryListing = Math.max(this.metrics.largestDirectoryListing, entries);
    this.metrics.totalReadMilliseconds += durationMilliseconds;
    this.changeEmitter.emit("change");
  }

  public recordDirectoryReadFailure(durationMilliseconds: number): void {
    this.metrics.directoryReads += 1;
    this.metrics.failedDirectoryReads += 1;
    this.metrics.totalReadMilliseconds += durationMilliseconds;
    this.changeEmitter.emit("change");
  }

  public snapshot(): LazyTreeMetricsSnapshot {
    return { ...this.metrics };
  }

  public reset(): void {
    this.metrics.directoryReads = 0;
    this.metrics.entriesListed = 0;
    this.metrics.largestDirectoryListing = 0;
    this.metrics.failedDirectoryReads = 0;
    this.metrics.totalReadMilliseconds = 0;
    this.changeEmitter.emit("change");
  }
}
