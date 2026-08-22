export interface TransactionOperation {
  label: string;
  apply(): PromiseLike<void>;
  rollback(): PromiseLike<void>;
}

export async function runTransaction(operations: readonly TransactionOperation[]): Promise<void> {
  const completed: TransactionOperation[] = [];

  try {
    for (const operation of operations) {
      await operation.apply();
      completed.push(operation);
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const operation of completed.reverse()) {
      try {
        await operation.rollback();
      } catch (rollbackError) {
        rollbackErrors.push(new Error(`${operation.label}: ${toErrorMessage(rollbackError)}`));
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError([error, ...rollbackErrors], "Settings update failed and rollback was incomplete.");
    }
    throw error;
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
