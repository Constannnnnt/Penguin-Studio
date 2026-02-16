import { Delta } from './observer';

export interface LogEntry extends Delta {
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * SRP: HistoryTracker is responsible ONLY for maintaining a log of changes and formatting them.
 */
export class HistoryTracker {
  private entries: LogEntry[] = [];

  public log(deltas: Delta[], metadata?: Record<string, any>): void {
    const timestamp = Date.now();
    const newEntries = deltas.map(d => ({
      ...d,
      timestamp,
      metadata
    }));
    this.entries.push(...newEntries);
  }

  public getEntries(): LogEntry[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries = [];
  }

  /**
   * Formats the history into human-readable prompts using a provided strategy.
   */
  public format(strategy: (entry: LogEntry) => string | undefined): string[] {
    return this.entries
      .map(strategy)
      .filter((s): s is string => s !== undefined);
  }
}
