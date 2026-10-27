// lynx-ui Input calls setValue on mount, and KeyboardAwareRoot calls
// setNativeProps. The test renderer throws from those NodesRef calls, which
// fails the file even when the assertion passed.
type InvokeCall = {
  success?: (result: unknown) => void;
};

type QueryChain = {
  exec: () => void;
};

type QueryRef = {
  invoke: (call: InvokeCall) => QueryChain;
  setNativeProps: (props: Record<string, unknown>) => QueryChain;
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

function emptyChain(): QueryChain {
  return {
    exec() {
      return undefined;
    },
  };
}

function tolerateMethod(
  ref: QueryRef,
  method: 'invoke' | 'setNativeProps',
): void {
  const original = ref[method].bind(ref);
  if (method === 'invoke') {
    ref.invoke = (call) => {
      try {
        return original(call);
      } catch {
        call.success?.({});
        return emptyChain();
      }
    };
    return;
  }
  ref.setNativeProps = (props) => {
    try {
      return original(props);
    } catch {
      return emptyChain();
    }
  };
}

function tolerateInvoke(ref: QueryRef): QueryRef {
  tolerateMethod(ref, 'invoke');
  tolerateMethod(ref, 'setNativeProps');
  return ref;
}

const missingRef: QueryRef = {
  invoke(call) {
    call.success?.({});
    return emptyChain();
  },
  setNativeProps() {
    return emptyChain();
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
