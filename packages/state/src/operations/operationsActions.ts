/** The action creators of the operations. */
export const operationsActions = {
  /** The wait after a job's last status has passed, so its status is asked for again. */
  jobPollDue: (key: string) => ({ type: "jobPollDue", key }) as const,
  /** The request with this id has gone unanswered for its time limit, so it is aborted. */
  requestTimeLimitPassed: (id: string) =>
    ({ type: "requestTimeLimitPassed", id }) as const,
};

/** An action of the operations. */
export type OperationsAction = ReturnType<
  (typeof operationsActions)[keyof typeof operationsActions]
>;
