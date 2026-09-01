/**
 * Suppress duplicate page-limit notifications for one extension-host session.
 *
 * Tree refreshes and "Show next" create new TreeItem instances for the same
 * URI. Keeping the key here, rather than on a TreeItem, guarantees that a
 * large directory warns once without becoming a notification loop.
 */
export class DirectoryLimitWarningGate {
  private readonly warnedDirectoryUris = new Set<string>();

  public shouldWarn(directoryUri: string): boolean {
    if (this.warnedDirectoryUris.has(directoryUri)) {
      return false;
    }
    this.warnedDirectoryUris.add(directoryUri);
    return true;
  }
}
