# Architecture and preservation boundaries

Monorepo: static public site, Next.js frontend, FastAPI analytics, media editing, educational tools and isolated AI runtimes. Keep component boundaries, paper-trading restrictions and credential isolation intact.

Standards adoption adds engineering controls around the existing implementation. See README and existing architecture/product documentation for component-level details. Existing public routes, data formats, entry points, safety gates and deployments must remain compatible. Operational and full threat-model review are pending in docs/audit.md.
