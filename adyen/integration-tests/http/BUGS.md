

### The following is the fix, recommended by a Cursor agent, for solving custom workflow hook registration inside integration tests.

Showing the exact fix to apply in `createWorkflow`. Reading the relevant section:


[1 tool called]


Fix for `createWorkflow`:

## The Fix

**File:** `/home/workspace/medusa/packages/core/workflows-sdk/src/utils/composer/create-workflow.ts`

**Lines to change:** 119-125

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
  nameOrConfig: string | ({ name: string } & TransactionModelOptions),
  composer: (
    input: WorkflowData<TData>
  ) => void | WorkflowResponse<TResult, THooks>
): ReturnWorkflow<TData, TResult, THooks> {
  const fileSourcePath = getCallerFilePath() as string
  const name = isString(nameOrConfig) ? nameOrConfig : nameOrConfig.name
  const options = isString(nameOrConfig) ? {} : nameOrConfig

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