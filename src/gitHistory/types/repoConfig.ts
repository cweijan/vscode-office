export interface GitRemoteDetail {
    name: string;
    url: string | null;
    pushUrl: string | null;
}

export interface GitRepoConfigData {
    remotes: GitRemoteDetail[];
}

export type RemoteActionPayload =
    | { action: 'add'; repo: string; name: string; url: string; pushUrl?: string }
    | { action: 'edit'; repo: string; name: string; newName: string; url: string; pushUrl?: string }
    | { action: 'delete'; repo: string; name: string };

export interface RemoteActionResult {
    error: string | null;
    cancelled: boolean;
}

export interface RemoteWebUrl {
    name: string;
    url: string;
}
