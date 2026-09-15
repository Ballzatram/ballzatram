import { widgetHtml, familyHtml } from '../dist/widget.mjs';
import { createHandler } from './http.mjs';

// Intentionally accepts no environment bindings and has no model-provider client.
export default { fetch: createHandler(widgetHtml, familyHtml) };
