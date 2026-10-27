// lynx-ui Input calls setValue on mount. The test renderer throws from
// NodesRef.invoke, which fails the file even when the assertion passed.
type InvokeCall = {
  success?: (result: unknown) => void;
};

type QueryRef = {
  invoke: (call: InvokeCall) => { exec: () => void };
};

type SelectorQuery = {
  select: (selector: string) => QueryRef;
  selectUniqueID: (id: number) => QueryRef;
};

type LynxGlobal = {
  lynx: {
    createSelectorQuery: () => SelectorQuery;
  };
};

type TestingEnv = {
  backgroundThread: { globalThis: LynxGlobal };
  mainThread: { globalThis: LynxGlobal };
};

function tolerateInvoke(ref: QueryRef): QueryRef {
  const invoke = ref.invoke.bind(ref);
  ref.invoke = (call) => {
    try {
      return invoke(call);
    } catch {
      call.success?.({});
      return {
        exec() {
          return undefined;
        },
      };
    }
  };
  return ref;
}

const missingRef: QueryRef = {
  invoke(call) {
    call.success?.({});
    return {
      exec() {
        return undefined;
      },
    };
  },
};

function patchSelectorQuery(target: LynxGlobal) {
  if (typeof target.lynx?.createSelectorQuery !== 'function') {
    return;
  }
  const createSelectorQuery = target.lynx.createSelectorQuery.bind(target.lynx);
  target.lynx.createSelectorQuery = () => {
    const query = createSelectorQuery();
    const select = query.select.bind(query);
    const selectUniqueID = query.selectUniqueID.bind(query);
    query.select = (selector) => {
      try {
        return tolerateInvoke(select(selector));
      } catch {
        return missingRef;
      }
    };
    query.selectUniqueID = (id) => {
      try {
        return tolerateInvoke(selectUniqueID(id));
      } catch {
        return missingRef;
      }
    };
    return query;
  };
}

type InjectHook = (target: LynxGlobal) => void;

const globalHooks = globalThis as unknown as {
  lynxTestingEnv?: TestingEnv;
  onInjectBackgroundThreadGlobals?: InjectHook;
};

const previousInject = globalHooks.onInjectBackgroundThreadGlobals;
globalHooks.onInjectBackgroundThreadGlobals = (target) => {
  previousInject?.(target);
  patchSelectorQuery(target);
};

if (globalHooks.lynxTestingEnv) {
  patchSelectorQuery(globalHooks.lynxTestingEnv.backgroundThread.globalThis);
  patchSelectorQuery(globalHooks.lynxTestingEnv.mainThread.globalThis);
}
