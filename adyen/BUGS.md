## Medusa Bugs Identified During Plugin Development

- The `Payment` model unnecessarily splits data across two entities—`PaymentSession` and `Payment`—which increases complexity and makes the model harder to maintain.
  [Reference](https://github.com/medusajs/medusa/blob/v2.12.3/packages/modules/payment/src/models/payment.ts#L7)

- The `cancelPayment` method does not persist the `data` returned by the payment provider.
  [Reference](https://github.com/medusajs/medusa/blob/v2.12.3/packages/modules/payment/src/services/payment-module.ts#L939)

- The `capturePayment` method accepts a `CreateCaptureDTO` with an optional `amount`. While the `captureService_` method creates a new record using the provided `amount` (if present), the `capturePaymentFromProvider_` method never forwards this `amount` to the payment provider.
  [Reference](https://github.com/medusajs/medusa/blob/v2.12.3/packages/modules/payment/src/services/payment-module.ts#L686)

- The `refundPayment` method accepts a `CreateRefundDTO` with an optional `amount`. If no amount is provided, the `refundPayment_` method assumes a full refund. A more robust approach would be to calculate the remaining unrefunded amount, which may be less than or equal to the full payment amount.
  [Reference](https://github.com/medusajs/medusa/blob/v2.12.3/packages/modules/payment/src/services/payment-module.ts#L868)

- Running integration tests in a Dockerized development environment (with custom service names, such as a database host named `postgres`) is problematic due to hard-coded constraints that enforce SSL on database connections.
  [Reference](https://github.com/medusajs/medusa/blob/v2.12.3/packages/medusa-test-utils/src/medusa-test-runner-utils/config.ts#L33)

### The following is the fix, recommended by a Cursor agent, for solving custom workflow hook registration inside integration tests.

Showing the exact fix to apply in `createWorkflow`. Reading the relevant section:


[1 tool called]


Fix for `createWorkflow`:

## The Fix

**File:** `https://github.com/medusajs/medusa/blob/v2.12.3/packages/core/workflows-sdk/src/utils/composer/create-workflow.ts`

**Lines to change:** 126-132

### Current Code (Buggy):
```typescript
const handlers: WorkflowHandler = new Map()

let newWorkflow = false
if (!WorkflowManager.getWorkflow(name)) {
  newWorkflow = true
  WorkflowManager.register(name, undefined, handlers, options)
}
```

### Fixed Code:
```typescript
let existingWorkflow = WorkflowManager.getWorkflow(name)
const handlers: WorkflowHandler = existingWorkflow?.handlers_ || new Map()

let newWorkflow = false
if (!existingWorkflow) {
  newWorkflow = true
  WorkflowManager.register(name, undefined, handlers, options)
}
```

## Complete Context

Here's the fix in context:

```typescript
export function createWorkflow<TData, TResult, THooks extends any[]>(
  /**
   * The name of the workflow or its configuration.
   */
  nameOrConfig: string | ({ name: string } & TransactionModelOptions),
  /**
   * The constructor function that is executed when the `run` method in {@link ReturnWorkflow} is used.
   * The function can't be an arrow function or an asynchronus function. It also can't directly manipulate data.
   * You'll have to use the {@link transform} function if you need to directly manipulate data.
   */
  composer: (
    input: WorkflowData<TData>
  ) => void | WorkflowResponse<TResult, THooks>
): ReturnWorkflow<TData, TResult, THooks> {
  const fileSourcePath = getCallerFilePath() as string
  const name = isString(nameOrConfig) ? nameOrConfig : nameOrConfig.name
  const options = isString(nameOrConfig) ? {} : nameOrConfig

  registerDevServerResource({
    sourcePath: fileSourcePath,
    id: name,
    type: "workflow",
  })

  // FIX: Reuse existing handlers map if workflow already exists
  let existingWorkflow = WorkflowManager.getWorkflow(name)
  const handlers: WorkflowHandler = existingWorkflow?.handlers_ || new Map()

  let newWorkflow = false
  if (!existingWorkflow) {
    newWorkflow = true
    WorkflowManager.register(name, undefined, handlers, options)
  }

  const context: CreateWorkflowComposerContext = {
    __type: OrchestrationUtils.SymbolMedusaWorkflowComposerContext,
    workflowId: name,
    flow: WorkflowManager.getEmptyTransactionDefinition(),
    isAsync: false,
    handlers, // This now references the existing handlers map if workflow exists
    // ... rest of context
  }

  // ... rest of the function remains the same
}
```

## What This Fix Does

1. Checks if the workflow already exists in `WorkflowManager`.
2. Reuses the existing `handlers_` map if it exists; otherwise creates a new one.
3. Ensures hook registrations update the same map that `WorkflowManager` uses.

## Why This Fixes the Issue

- Before: A new handlers map was always created, so hook registrations updated a different map than the one in `WorkflowManager`.
- After: If the workflow exists, we reuse its handlers map, so hook registrations update the same map that `WorkflowManager` uses.

## Impact

- Fixes hook registration for custom workflows that are pre-registered.
- No breaking changes; new workflows still work as before.
- Core workflows continue to work (they're typically loaded fresh).

## Testing

After applying this fix, your test should work:

```typescript
beforeAll(() => {
  processNotificationWorkflow.hooks.notificationProcessed(
    (input: NotificationRequestItem) => {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        'processCaptureSuccessStep failed',
      )
    },
  )
  // This should now work without manual handler registration!
})
```

This ensures hook registrations persist and are used when the workflow runs.