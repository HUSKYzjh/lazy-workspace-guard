import * as vscode from "vscode";
import { DiagnosticSampler, type MemorySnapshot } from "./diagnosticSampling";
import { t } from "./i18n";
import type { LazyTreeMetrics, LazyTreeMetricsSnapshot } from "./metrics";

export interface DiagnosticsReport {
  schemaVersion: 1;
  generatedAt: string;
  environment: {
    remoteKind: string;
  };
  extensionHostMemory: {
    scope: "shared-extension-host";
    baseline: MemorySnapshot;
    samples: MemorySnapshot[];
  };
  lazyTree: LazyTreeMetricsSnapshot;
  managedExclusionRules: number;
  limitations: {
    coreFileWatcherMemory: "not-exposed-by-vscode-extension-api";
    workspacePathsIncluded: false;
  };
}

export class DiagnosticsProvider implements vscode.TreeDataProvider<vscode.TreeItem>, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  private readonly metricsSubscription: () => void;
  private readonly sampler = new DiagnosticSampler(captureMemory());
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public constructor(
    private readonly metrics: LazyTreeMetrics,
    private readonly getManagedRuleCount: () => number
  ) {
    this.metricsSubscription = metrics.onDidChange(() => this.refresh());
  }

  public getTreeItem(item: vscode.TreeItem): vscode.TreeItem {
    return item;
  }

  public getChildren(): vscode.TreeItem[] {
    const memory = this.sampler.getLatest();
    const metrics = this.metrics.snapshot();
    const averageRead = metrics.directoryReads === 0
      ? 0
      : metrics.totalReadMilliseconds / metrics.directoryReads;

    return [
      this.item(t("diagnosticHostMemory"), "symbol-server", t("diagnosticHostMemoryTooltip")),
      this.item(t("diagnosticRss", formatMiB(memory.rss)), "pulse", t("diagnosticRssTooltip")),
      this.item(t("diagnosticRssDelta", formatSignedMiB(this.sampler.getRssDelta())), "graph-line", t("diagnosticRssDeltaTooltip")),
      this.item(t("diagnosticHeap", formatMiB(memory.heapUsed), formatMiB(memory.heapTotal)), "database", t("diagnosticHeapTooltip")),
      this.item(t("diagnosticExternal", formatMiB(memory.external)), "symbol-variable", t("diagnosticExternalTooltip")),
      this.item(t("diagnosticSampleCount", this.sampler.getSamples().length), "history", t("diagnosticSampleCountTooltip")),
      this.item(t("diagnosticRemoteKind", vscode.env.remoteName ?? t("diagnosticLocal")), "remote", t("diagnosticRemoteKindTooltip")),
      this.item(t("diagnosticReads", metrics.directoryReads), "folder-opened", t("diagnosticReadsTooltip")),
      this.item(t("diagnosticEntries", metrics.entriesListed), "list-tree", t("diagnosticEntriesTooltip")),
      this.item(t("diagnosticLargestDirectory", metrics.largestDirectoryListing), "symbol-number", t("diagnosticLargestDirectoryTooltip")),
      this.item(t("diagnosticAverageRead", formatMilliseconds(averageRead)), "watch", t("diagnosticAverageReadTooltip")),
      this.item(t("diagnosticFailures", metrics.failedDirectoryReads), "error", t("diagnosticFailuresTooltip")),
      this.item(t("diagnosticManagedRules", this.getManagedRuleCount()), "settings-gear", t("diagnosticManagedRulesTooltip")),
      this.item(t("diagnosticWatcherUnavailable"), "info", t("diagnosticWatcherUnavailableTooltip"))
    ];
  }

  public refresh(): void {
    this.sampler.record(captureMemory());
    this.changeEmitter.fire();
  }

  public reset(): void {
    this.metrics.reset();
    this.sampler.resetBaseline(captureMemory());
    this.changeEmitter.fire();
  }

  public createReport(): DiagnosticsReport {
    this.sampler.record(captureMemory());
    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      environment: {
        remoteKind: vscode.env.remoteName ?? "local"
      },
      extensionHostMemory: {
        scope: "shared-extension-host",
        baseline: this.sampler.getBaseline(),
        samples: this.sampler.getSamples()
      },
      lazyTree: this.metrics.snapshot(),
      managedExclusionRules: this.getManagedRuleCount(),
      limitations: {
        coreFileWatcherMemory: "not-exposed-by-vscode-extension-api",
        workspacePathsIncluded: false
      }
    };
  }

  public dispose(): void {
    this.metricsSubscription();
    this.changeEmitter.dispose();
  }

  private item(label: string, icon: string, tooltip: string): vscode.TreeItem {
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon(icon);
    item.tooltip = tooltip;
    return item;
  }
}

export function formatMiB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

export function formatMilliseconds(milliseconds: number): string {
  return `${milliseconds.toFixed(1)} ms`;
}

function captureMemory(): MemorySnapshot {
  const memory = process.memoryUsage();
  return {
    capturedAt: Date.now(),
    rss: memory.rss,
    heapUsed: memory.heapUsed,
    heapTotal: memory.heapTotal,
    external: memory.external
  };
}

function formatSignedMiB(bytes: number): string {
  const sign = bytes > 0 ? "+" : "";
  return `${sign}${formatMiB(bytes)}`;
}
