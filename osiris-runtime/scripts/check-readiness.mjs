import { probeRuntime } from '../readiness.mjs';
await probeRuntime();
console.log('Signed-out runtime readiness passed. No provider login or model generation was performed. This does not verify a public hostname, a user entitlement, or inference.');
