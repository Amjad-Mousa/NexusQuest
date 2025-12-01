const API_URL = 'http://localhost:9876/api/versions';

function getAuthHeaders() {
    const token = localStorage.getItem('nexusquest-token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

export interface Snapshot {
    _id: string;
    fileName: string;
    message: string;
    createdAt: string;
    content?: string;
}

export interface FileVersionInfo {
    fileId: string;
    fileName: string;
    snapshotCount: number;
    lastModified: string;
    lastMessage: string;
}

export interface DiffLine {
    type: 'same' | 'added' | 'removed';
    line: string;
    lineNum: number;
}

// Create a snapshot for a single file
export async function createSnapshot(
    projectId: string,
    fileId: string,
    fileName: string,
    content: string,
    message?: string
): Promise<{ snapshot: Snapshot; unchanged?: boolean }> {
    const response = await fetch(`${API_URL}/snapshot`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ projectId, fileId, fileName, content, message }),
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to create snapshot');
    }
    return { snapshot: data.snapshot, unchanged: data.unchanged };
}

// Create snapshots for all files in a project
export async function createProjectSnapshot(
    projectId: string,
    files: { fileId: string; fileName: string; content: string }[],
    message?: string
): Promise<{ results: { fileId: string; fileName: string; created: boolean }[]; createdCount: number }> {
    const response = await fetch(`${API_URL}/snapshot-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ projectId, files, message }),
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to create project snapshot');
    }
    return { results: data.results, createdCount: data.createdCount };
}

// Get snapshots for a specific file
export async function getFileSnapshots(projectId: string, fileId: string): Promise<Snapshot[]> {
    const response = await fetch(`${API_URL}/file/${projectId}/${fileId}`, {
        headers: getAuthHeaders(),
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to get snapshots');
    }
    return data.snapshots;
}

// Get all files with version info for a project
export async function getProjectVersions(projectId: string): Promise<FileVersionInfo[]> {
    const response = await fetch(`${API_URL}/project/${projectId}`, {
        headers: getAuthHeaders(),
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to get project versions');
    }
    return data.files;
}

// Get a specific snapshot's content
export async function getSnapshot(snapshotId: string): Promise<Snapshot> {
    const response = await fetch(`${API_URL}/snapshot/${snapshotId}`, {
        headers: getAuthHeaders(),
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to get snapshot');
    }
    return data.snapshot;
}

// Restore a snapshot (get its content)
export async function restoreSnapshot(snapshotId: string): Promise<{ content: string; fileName: string; fileId: string }> {
    const response = await fetch(`${API_URL}/restore/${snapshotId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to restore snapshot');
    }
    return { content: data.content, fileName: data.fileName, fileId: data.fileId };
}

// Compare two snapshots
export async function compareSnapshots(
    snapshotId1: string,
    snapshotId2: string
): Promise<{
    diff: DiffLine[];
    snapshot1: { id: string; createdAt: string; message: string };
    snapshot2: { id: string; createdAt: string; message: string };
}> {
    const response = await fetch(`${API_URL}/diff/${snapshotId1}/${snapshotId2}`, {
        headers: getAuthHeaders(),
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Failed to compare snapshots');
    }
    return { diff: data.diff, snapshot1: data.snapshot1, snapshot2: data.snapshot2 };
}

// Format relative time
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
