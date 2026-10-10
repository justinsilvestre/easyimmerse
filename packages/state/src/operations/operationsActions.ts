/** The action creators of the operations. */
export const operationsActions = {
  /** The wait after a job's last status has passed, so its status is asked for again. */
  jobPollDue: (key: string) => ({ type: "jobPollDue", key }) as const,
};

/** An action of the operations. */
export type OperationsAction = ReturnType<
  (typeof operationsActions)[keyof typeof operationsActions]
>;
