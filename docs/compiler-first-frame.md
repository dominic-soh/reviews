# Compiler first frame

`engineVersion` is 3.9. The published encoder only accepts Lynx 1.0 through 3.9, so 4.1 does not build. Raise it when a compiler that can emit 4.1 is published, and keep the host SDK at or above that value.

Device IFR was not measured. No Lynx Explorer host was attached, so there is no on-device first-frame sample for the compiler on versus off.

The numbers below are the second app build of each setting in `apps/app`, after one throwaway build so the toolchain is warm. That is the cost of running the compiler during the bundle step. It is not a first-frame time. Bundle size is the output of that second build.

| Compiler | Warm build | Bundle |
| --- | --- | --- |
| off (`REACT_COMPILER=0`) | 1621 ms | 238133 bytes |
| on | 1661 ms | 291526 bytes |

Re-run with `bun scripts/measure-compiler.ts`. Replace this note with a device trace before turning the compiler off on the entry screen.
