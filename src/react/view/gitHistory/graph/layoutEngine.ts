export const UNCOMMITTED = '*';

export interface GraphPoint {
    x: number;
    y: number;
}

export interface GraphPath {
    d: string;
    color: string;
    dashed: boolean;
}

export interface GraphVertex {
    id: number;
    cx: number;
    cy: number;
    color: string;
    isCurrent: boolean;
    isStash: boolean;
    isCommitted: boolean;
}

export interface GraphLayout {
    width: number;
    height: number;
    paths: GraphPath[];
    vertices: GraphVertex[];
    rowWidths: number[];
    vertexColors: number[];
}

export interface GraphConfig {
    colours: string[];
    uncommittedColour: string;
    style: 'rounded' | 'angular';
    grid: {
        x: number;
        y: number;
        offsetX: number;
        offsetY: number;
    };
}

export const DEFAULT_GRAPH_GRID = {
    style: 'rounded' as const,
    grid: { x: 16, y: 24, offsetX: 8, offsetY: 12 },
};

interface GitCommitInput {
    hash: string;
    parents: ReadonlyArray<string>;
    stash: unknown | null;
}

interface Line {
    p1: GraphPoint;
    p2: GraphPoint;
    lockedFirst: boolean;
}

interface PlacedLine {
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    isCommitted: boolean;
    lockedFirst: boolean;
}

interface UnavailablePoint {
    connectsTo: Vertex | null;
    onBranch: Branch;
}

const NULL_VERTEX_ID = -1;

class Branch {
    private end = 0;
    private lines: Line[] = [];
    private numUncommitted = 0;

    constructor(private readonly colour: number) { }

    addLine(p1: GraphPoint, p2: GraphPoint, isCommitted: boolean, lockedFirst: boolean) {
        this.lines.push({ p1, p2, lockedFirst });
        if (isCommitted) {
            if (p2.x === 0 && p2.y < this.numUncommitted) this.numUncommitted = p2.y;
        } else {
            this.numUncommitted++;
        }
    }

    getColour() { return this.colour; }
    getEnd() { return this.end; }
    setEnd(end: number) { this.end = end; }

    toPaths(config: GraphConfig): GraphPath[] {
        const colour = config.colours[this.colour % config.colours.length];
        const d = config.grid.y * (config.style === 'angular' ? 0.38 : 0.8);
        const paths: GraphPath[] = [];
        const lines: PlacedLine[] = [];

        for (let li = 0; li < this.lines.length; li++) {
            const line = this.lines[li];
            lines.push({
                p1: {
                    x: line.p1.x * config.grid.x + config.grid.offsetX,
                    y: line.p1.y * config.grid.y + config.grid.offsetY,
                },
                p2: {
                    x: line.p2.x * config.grid.x + config.grid.offsetX,
                    y: line.p2.y * config.grid.y + config.grid.offsetY,
                },
                isCommitted: li >= this.numUncommitted,
                lockedFirst: line.lockedFirst,
            });
        }

        let i = 0;
        while (i < lines.length - 1) {
            const line = lines[i];
            const next = lines[i + 1];
            if (line.p1.x === line.p2.x && line.p2.x === next.p1.x && next.p1.x === next.p2.x
                && line.p2.y === next.p1.y && line.isCommitted === next.isCommitted) {
                line.p2.y = next.p2.y;
                lines.splice(i + 1, 1);
            } else {
                i++;
            }
        }

        let curPath = '';
        let curCommitted = true;
        for (i = 0; i < lines.length; i++) {
            const line = lines[i];
            const { p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } } = line;

            if (curPath !== '' && i > 0 && line.isCommitted !== lines[i - 1].isCommitted) {
                paths.push({ d: curPath, color: colour, dashed: !lines[i - 1].isCommitted });
                curPath = '';
            }

            if (curPath === '' || (i > 0 && (x1 !== lines[i - 1].p2.x || y1 !== lines[i - 1].p2.y))) {
                curPath += `M${x1.toFixed(0)},${y1.toFixed(1)}`;
            }

            if (x1 === x2) {
                curPath += `L${x2.toFixed(0)},${y2.toFixed(1)}`;
            } else if (config.style === 'angular') {
                curPath += `L${line.lockedFirst ? `${x2.toFixed(0)},${(y2 - d).toFixed(1)}` : `${x1.toFixed(0)},${(y1 + d).toFixed(1)}`}L${x2.toFixed(0)},${y2.toFixed(1)}`;
            } else {
                curPath += `C${x1.toFixed(0)},${(y1 + d).toFixed(1)} ${x2.toFixed(0)},${(y2 - d).toFixed(1)} ${x2.toFixed(0)},${y2.toFixed(1)}`;
            }
            curCommitted = line.isCommitted;
        }
        if (curPath !== '') {
            paths.push({ d: curPath, color: colour, dashed: !curCommitted });
        }
        return paths;
    }
}

class Vertex {
    readonly id: number;
    readonly isStash: boolean;
    private x = 0;
    private children: Vertex[] = [];
    private parents: Vertex[] = [];
    private nextParent = 0;
    private onBranch: Branch | null = null;
    private isCommitted = true;
    private isCurrent = false;
    private nextX = 0;
    private connections: UnavailablePoint[] = [];

    constructor(id: number, isStash: boolean) {
        this.id = id;
        this.isStash = isStash;
    }

    addChild(v: Vertex) { this.children.push(v); }
    addParent(v: Vertex) { this.parents.push(v); }
    getParents() { return this.parents; }
    getNextParent(): Vertex | null {
        return this.nextParent < this.parents.length ? this.parents[this.nextParent] : null;
    }
    registerParentProcessed() { this.nextParent++; }
    isMerge() { return this.parents.length > 1; }
    addToBranch(branch: Branch, x: number) {
        if (this.onBranch === null) { this.onBranch = branch; this.x = x; }
    }
    isNotOnBranch() { return this.onBranch === null; }
    isOnThisBranch(branch: Branch) { return this.onBranch === branch; }
    getBranch() { return this.onBranch; }
    getPoint(): GraphPoint { return { x: this.x, y: this.id }; }
    getNextPoint(): GraphPoint { return { x: this.nextX, y: this.id }; }
    getPointConnectingTo(vertex: Vertex | null, onBranch: Branch): GraphPoint | null {
        for (let i = 0; i < this.connections.length; i++) {
            if (this.connections[i].connectsTo === vertex && this.connections[i].onBranch === onBranch) {
                return { x: i, y: this.id };
            }
        }
        return null;
    }
    registerUnavailablePoint(x: number, connectsTo: Vertex | null, onBranch: Branch) {
        if (x === this.nextX) {
            this.nextX = x + 1;
            this.connections[x] = { connectsTo, onBranch };
        }
    }
    getColour() { return this.onBranch !== null ? this.onBranch.getColour() : 0; }
    getIsCommitted() { return this.isCommitted; }
    setNotCommitted() { this.isCommitted = false; }
    setCurrent() { this.isCurrent = true; }

    toRenderData(config: GraphConfig): GraphVertex | null {
        if (this.onBranch === null) return null;
        const colour = this.isCommitted
            ? config.colours[this.onBranch.getColour() % config.colours.length]
            : config.uncommittedColour;
        return {
            id: this.id,
            cx: this.x * config.grid.x + config.grid.offsetX,
            cy: this.id * config.grid.y + config.grid.offsetY,
            color: colour,
            isCurrent: this.isCurrent,
            isStash: this.isStash,
            isCommitted: this.isCommitted,
        };
    }
}

class GraphEngine {
    private vertices: Vertex[] = [];
    private branches: Branch[] = [];
    private availableColours: number[] = [];

    compute(
        commits: ReadonlyArray<GitCommitInput>,
        commitHead: string | null,
        config: GraphConfig,
        onlyFollowFirstParent = false,
        linearFileHistory = false,
    ): GraphLayout {
        this.vertices = [];
        this.branches = [];
        this.availableColours = [];

        if (commits.length === 0) {
            return { width: 0, height: 0, paths: [], vertices: [], rowWidths: [], vertexColors: [] };
        }

        const commitLookup: Record<string, number> = {};
        for (let i = 0; i < commits.length; i++) {
            commitLookup[commits[i].hash] = i;
        }

        const nullVertex = new Vertex(NULL_VERTEX_ID, false);
        for (let i = 0; i < commits.length; i++) {
            this.vertices.push(new Vertex(i, commits[i].stash !== null));
        }

        for (let i = 0; i < commits.length; i++) {
            if (linearFileHistory) {
                if (i + 1 < commits.length) {
                    this.vertices[i].addParent(this.vertices[i + 1]);
                    this.vertices[i + 1].addChild(this.vertices[i]);
                }
            } else {
                for (let j = 0; j < commits[i].parents.length; j++) {
                    const parentHash = commits[i].parents[j];
                    const parentIdx = commitLookup[parentHash];
                    if (typeof parentIdx === 'number') {
                        this.vertices[i].addParent(this.vertices[parentIdx]);
                        this.vertices[parentIdx].addChild(this.vertices[i]);
                    } else if (!onlyFollowFirstParent || j === 0) {
                        this.vertices[i].addParent(nullVertex);
                    }
                }
            }
        }

        if (commits[0].hash === UNCOMMITTED) {
            this.vertices[0].setNotCommitted();
        }
        if (commits[0].hash === UNCOMMITTED) {
            this.vertices[0].setCurrent();
        } else if (commitHead !== null && typeof commitLookup[commitHead] === 'number') {
            this.vertices[commitLookup[commitHead]].setCurrent();
        }

        let i = 0;
        while (i < this.vertices.length) {
            if (this.vertices[i].getNextParent() !== null || this.vertices[i].isNotOnBranch()) {
                this.determinePath(i);
            } else {
                i++;
            }
        }

        const paths: GraphPath[] = [];
        for (const branch of this.branches) {
            paths.push(...branch.toPaths(config));
        }

        const vertices: GraphVertex[] = [];
        const rowWidths: number[] = [];
        const vertexColors: number[] = [];

        for (let vi = 0; vi < this.vertices.length; vi++) {
            const v = this.vertices[vi].toRenderData(config);
            if (v) vertices.push(v);
            vertexColors[vi] = this.vertices[vi].getColour() % config.colours.length;
            rowWidths[vi] = config.grid.offsetX + this.vertices[vi].getNextPoint().x * config.grid.x - 2;
        }

        let maxX = 0;
        for (const v of this.vertices) {
            const p = v.getNextPoint();
            if (p.x > maxX) maxX = p.x;
        }
        const width = 2 * config.grid.offsetX + (maxX - 1) * config.grid.x;
        const height = commits.length * config.grid.y + config.grid.offsetY - config.grid.y / 2;

        return { width, height, paths, vertices, rowWidths, vertexColors };
    }

    private determinePath(startAt: number) {
        let i = startAt;
        let vertex = this.vertices[i];
        let parentVertex = vertex.getNextParent();
        let lastPoint = vertex.isNotOnBranch() ? vertex.getNextPoint() : vertex.getPoint();

        if (parentVertex !== null && parentVertex.id !== NULL_VERTEX_ID
            && vertex.isMerge() && !vertex.isNotOnBranch() && !parentVertex.isNotOnBranch()) {
            let foundPointToParent = false;
            const parentBranch = parentVertex.getBranch()!;
            for (i = startAt + 1; i < this.vertices.length; i++) {
                const curVertex = this.vertices[i];
                let curPoint = curVertex.getPointConnectingTo(parentVertex, parentBranch);
                if (curPoint !== null) {
                    foundPointToParent = true;
                } else {
                    curPoint = curVertex.getNextPoint();
                }
                parentBranch.addLine(lastPoint, curPoint, vertex.getIsCommitted(),
                    !foundPointToParent && curVertex !== parentVertex ? lastPoint.x < curPoint.x : true);
                curVertex.registerUnavailablePoint(curPoint.x, parentVertex, parentBranch);
                lastPoint = curPoint;
                if (foundPointToParent) {
                    vertex.registerParentProcessed();
                    break;
                }
            }
        } else {
            const branch = new Branch(this.getAvailableColour(startAt));
            vertex.addToBranch(branch, lastPoint.x);
            vertex.registerUnavailablePoint(lastPoint.x, vertex, branch);
            for (i = startAt + 1; i < this.vertices.length; i++) {
                const curVertex = this.vertices[i];
                const curPoint = parentVertex === curVertex && !parentVertex.isNotOnBranch()
                    ? curVertex.getPoint()
                    : curVertex.getNextPoint();
                branch.addLine(lastPoint, curPoint, vertex.getIsCommitted(), lastPoint.x < curPoint.x);
                curVertex.registerUnavailablePoint(curPoint.x, parentVertex, branch);
                lastPoint = curPoint;

                if (parentVertex === curVertex) {
                    vertex.registerParentProcessed();
                    const parentOnBranch = !parentVertex.isNotOnBranch();
                    parentVertex.addToBranch(branch, curPoint.x);
                    vertex = parentVertex;
                    parentVertex = vertex.getNextParent();
                    if (parentVertex === null || parentOnBranch) break;
                }
            }
            if (i === this.vertices.length && parentVertex !== null && parentVertex.id === NULL_VERTEX_ID) {
                vertex.registerParentProcessed();
            }
            branch.setEnd(i);
            this.branches.push(branch);
            this.availableColours[branch.getColour()] = i;
        }
    }

    private getAvailableColour(startAt: number): number {
        for (let i = 0; i < this.availableColours.length; i++) {
            if (startAt > this.availableColours[i]) return i;
        }
        this.availableColours.push(0);
        return this.availableColours.length - 1;
    }
}

export function computeGraphLayout(
    commits: ReadonlyArray<GitCommitInput>,
    commitHead: string | null,
    rowHeight: number,
    config: GraphConfig,
    onlyFollowFirstParent = false,
    linearFileHistory = false,
): GraphLayout {
    const gridConfig = {
        ...config,
        grid: { ...config.grid, y: rowHeight },
    };
    return new GraphEngine().compute(
        commits,
        commitHead,
        gridConfig,
        onlyFollowFirstParent,
        linearFileHistory,
    );
}
