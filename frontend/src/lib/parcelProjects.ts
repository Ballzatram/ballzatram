import type {
  ParcelConfidenceStatus,
  ParcelFreshnessStatus,
  ParcelOpportunity,
  ParcelSourceTrustStatus,
} from "@/data/parcelOpportunities";
import type { ParcelThesis } from "@/lib/parcel";

export type { ParcelThesis } from "@/lib/parcel";

export type ParcelCandidate = ParcelOpportunity;

export type ParcelRiskFlagSeverity = "info" | "question" | "review";

export type ParcelRiskFlag = {
  id: string;
  candidateId?: string;
  label: string;
  detail: string;
  severity: ParcelRiskFlagSeverity;
  source: "thesis" | "candidate" | "memo";
  createdAt: string;
};

export type ParcelMemoSourceCaveat = {
  candidateId: string;
  title: string;
  sourceLabel: string;
  sourceStatus: ParcelSourceTrustStatus;
  freshnessStatus: ParcelFreshnessStatus;
  confidenceStatus: ParcelConfidenceStatus;
  caveat: string;
};

export type ParcelMemo = {
  id: string;
  generatedAt: string;
  thesisSummary: string;
  candidateOverview: string[];
  shortlistComparison: string[];
  keyRiskFlags: ParcelRiskFlag[];
  missingInformation: string[];
  recommendedNextChecks: string[];
  sourceCaveatAppendix: ParcelMemoSourceCaveat[];
  userNotes: string;
};

export type ParcelProject = {
  id: string;
  name: string;
  version: 1;
  storageMode: "local-preview";
  createdAt: string;
  updatedAt: string;
  thesis: ParcelThesis;
  listingLinks: string;
  candidates: ParcelCandidate[];
  shortlistedCandidateIds: string[];
  selectedCandidateId?: string;
  riskFlags: ParcelRiskFlag[];
  memo?: ParcelMemo;
  userNotes?: string;
};

export type ParcelProjectDraft = {
  name: string;
  thesis: ParcelThesis;
  listingLinks: string;
  candidates: ParcelCandidate[];
  shortlistedCandidateIds: string[];
  selectedCandidateId?: string;
  riskFlags: ParcelRiskFlag[];
  memo?: ParcelMemo;
  userNotes?: string;
};

export type ParcelProjectUpdate = Partial<ParcelProjectDraft>;

export interface ParcelProjectStore {
  listProjects(): Promise<ParcelProject[]>;
  createProject(project: ParcelProjectDraft): Promise<ParcelProject>;
  updateProject(projectId: string, project: ParcelProjectUpdate): Promise<ParcelProject>;
  deleteProject(projectId: string): Promise<void>;
}

const STORAGE_KEY = "ballzatram.parcel.projects.v1";

function nowIso() {
  return new Date().toISOString();
}

function createProjectId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `parcel-project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getStorage(storage?: Storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function readProjects(storage?: Storage): ParcelProject[] {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((project): project is ParcelProject => Boolean(project?.id && project?.name && project?.thesis));
  } catch {
    return [];
  }
}

function writeProjects(projects: ParcelProject[], storage?: Storage) {
  const targetStorage = getStorage(storage);
  if (!targetStorage) {
    throw new Error("Local preview storage is unavailable in this environment.");
  }
  targetStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function createLocalStorageParcelProjectStore(storage?: Storage): ParcelProjectStore {
  return {
    async listProjects() {
      return readProjects(storage).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async createProject(project) {
      const timestamp = nowIso();
      const nextProject: ParcelProject = {
        ...project,
        id: createProjectId(),
        version: 1,
        storageMode: "local-preview",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const projects = readProjects(storage);
      writeProjects([nextProject, ...projects], storage);
      return nextProject;
    },
    async updateProject(projectId, project) {
      const projects = readProjects(storage);
      const existing = projects.find((item) => item.id === projectId);
      if (!existing) {
        throw new Error("Project was not found in local preview storage.");
      }

      const nextProject: ParcelProject = {
        ...existing,
        ...project,
        id: existing.id,
        version: 1,
        storageMode: "local-preview",
        createdAt: existing.createdAt,
        updatedAt: nowIso(),
      };
      writeProjects(projects.map((item) => (item.id === projectId ? nextProject : item)), storage);
      return nextProject;
    },
    async deleteProject(projectId) {
      writeProjects(readProjects(storage).filter((project) => project.id !== projectId), storage);
    },
  };
}
