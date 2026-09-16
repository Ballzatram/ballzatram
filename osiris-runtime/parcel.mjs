import Parcel from '../tools/parcel/core.js';

const string = { type: 'string' };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const facts = Object.fromEntries(Parcel.FACTS.map(f => [f.key, object({
  value: f.type === 'number' ? { type: ['number', 'null'] } : { enum: [...(f.options || Parcel.YES_NO).map(([value]) => value), null] },
  level: { type: 'string', enum: ['reported'] }, sourceUrl: string, checkedAt: string, detail: string
})]));
export const researchSchema = object({
  kind: { type: 'string', enum: ['parcel-research'] }, schemaVersion: { type: 'integer', enum: [1] }, summary: string,
  candidates: { type: 'array', items: object({
    title: string, location: string, listingUrl: string, capturedAt: string,
    listingStatus: { type: 'string', enum: ['reported-active', 'under-contract', 'unavailable', 'off-market', 'unknown'] },
    tenure: { type: 'string', enum: ['sale', 'lease', 'unknown'] }, county: string, parcelId: string,
    routeOrigin: string, routeWhen: string, corridorName: string, regionName: string, assessedUse: string, notes: string,
    facts: object(facts)
  }) }
});

export function researchInstructions() {
  return `Today is ${new Date().toISOString().slice(0, 10)} UTC. Search public sources for up to three actual properties matching the saved brief. Return only the required JSON object, with a concise summary and source-linked candidates. Every candidate needs its exact property source URL and actual location. Leave unsupported values null and missing text empty. Keep evidence notes short. Source capture dates are the dates you read the sources; distinguish old or cached listing information. Search snippets alone do not establish current availability. If search is unavailable or no defensible leads are found, return an empty candidates array and explain the limitation in summary. Do not fabricate properties or fill the array to reach a target. Never claim to measure terrain, routes, or zoning without supporting evidence. Site records are updated only after the user reviews and adds findings in Parcel.`;
}

export function normalizeResearch(answer) {
  return JSON.stringify(Parcel.parseAIResearch(answer));
}
