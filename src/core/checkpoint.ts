import * as fs from "fs/promises";
import * as path from "path";

export interface CheckpointStep {
  status: "pending" | "in_progress" | "complete" | "failed";
  timestamp: string | null;
  error?: string;
}

export interface CheckpointData {
  projectName: string;
  steps: Record<string, CheckpointStep>;
  createdAt: string;
  updatedAt: string;
}

const CHECKPOINT_FILE = ".backgen-checkpoint.json";

export async function loadCheckpoint(projectDir: string): Promise<CheckpointData | null> {
  try {
    const filePath = path.join(projectDir, CHECKPOINT_FILE);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as CheckpointData;
  } catch {
    return null;
  }
}

export async function saveCheckpoint(projectDir: string, data: CheckpointData): Promise<void> {
  data.updatedAt = new Date().toISOString();
  const filePath = path.join(projectDir, CHECKPOINT_FILE);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function createCheckpoint(
  projectDir: string,
  projectName: string,
  steps: string[]
): Promise<CheckpointData> {
  const stepsMap: Record<string, CheckpointStep> = {};
  for (const step of steps) {
    stepsMap[step] = { status: "pending", timestamp: null };
  }

  const data: CheckpointData = {
    projectName,
    steps: stepsMap,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveCheckpoint(projectDir, data);
  return data;
}

export async function markStep(
  projectDir: string,
  data: CheckpointData,
  stepName: string,
  status: CheckpointStep["status"],
  error?: string
): Promise<void> {
  data.steps[stepName] = {
    status,
    timestamp: new Date().toISOString(),
    error,
  };
  await saveCheckpoint(projectDir, data);
}

export async function clearCheckpoint(projectDir: string): Promise<void> {
  try {
    const filePath = path.join(projectDir, CHECKPOINT_FILE);
    await fs.unlink(filePath);
  } catch {
    // File doesn't exist, that's fine
  }
}

export async function validateCheckpoint(data: CheckpointData): Promise<boolean> {
  if (!data.projectName || !data.steps || !data.createdAt) {
    return false;
  }
  return true;
}

export function getNextPendingStep(data: CheckpointData): string | null {
  for (const [name, step] of Object.entries(data.steps)) {
    if (step.status === "pending" || step.status === "failed") {
      return name;
    }
  }
  return null;
}
