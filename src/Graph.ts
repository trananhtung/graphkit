/** Options for creating a Graph. */
export interface GraphOptions {
  /** If true, edges have direction (default: true). */
  directed?: boolean;
  /** If true, multiple edges between the same pair of nodes are allowed (default: false). */
  multigraph?: boolean;
}

/** An edge stored in the graph. */
export interface Edge<E = unknown> {
  from: string;
  to: string;
  weight: number;
  label?: E;
}

/** Path result from shortest-path algorithms. */
export interface PathResult {
  /** Total path weight (distance). */
  distance: number;
  /** Ordered list of node ids from source to target (inclusive). */
  path: string[];
}

/** Error thrown when an operation is invalid for the graph type or state. */
export class GraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphError";
  }
}

/**
 * Generic directed or undirected weighted graph.
 *
 * Nodes are identified by string ids and can carry an optional label `N`.
 * Edges are identified by (from, to) pair and carry optional label `E` and a
 * numeric `weight` (default 1).
 *
 * @example
 * const g = new Graph<string, number>({ directed: true });
 * g.addNode("a", "Alice");
 * g.addNode("b", "Bob");
 * g.addEdge("a", "b", { weight: 5 });
 * const { path, distance } = g.dijkstra("a", "b")!;
 */
export class Graph<N = unknown, E = unknown> {
  private readonly _directed: boolean;
  private readonly _multigraph: boolean;
  private readonly _nodes = new Map<string, N | undefined>();
  /** Adjacency: from → to → Edge */
  private readonly _adj = new Map<string, Map<string, Edge<E>>>();
  /** Reverse adjacency (for undirected access and in-degree): to → from → Edge */
  private readonly _radj = new Map<string, Map<string, Edge<E>>>();

  constructor(options: GraphOptions = {}) {
    this._directed = options.directed ?? true;
    this._multigraph = options.multigraph ?? false;
  }

  // ── node API ────────────────────────────────────────────────────────────────

  /** Add a node. Returns `this` for chaining. */
  addNode(id: string, label?: N): this {
    if (!this._nodes.has(id)) {
      this._nodes.set(id, label);
      this._adj.set(id, new Map());
      this._radj.set(id, new Map());
    } else if (label !== undefined) {
      this._nodes.set(id, label);
    }
    return this;
  }

  /** Remove a node and all its edges. Returns `this`. */
  removeNode(id: string): this {
    if (!this._nodes.has(id)) return this;
    // Remove outgoing edges
    for (const to of this._adj.get(id)!.keys()) {
      this._radj.get(to)?.delete(id);
    }
    // Remove incoming edges
    for (const from of this._radj.get(id)!.keys()) {
      this._adj.get(from)?.delete(id);
    }
    this._nodes.delete(id);
    this._adj.delete(id);
    this._radj.delete(id);
    return this;
  }

  /** Returns true if the node exists. */
  hasNode(id: string): boolean {
    return this._nodes.has(id);
  }

  /** Get the label attached to a node, or undefined. */
  nodeLabel(id: string): N | undefined {
    return this._nodes.get(id);
  }

  /** All node ids. */
  nodes(): string[] {
    return [...this._nodes.keys()];
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  // ── edge API ────────────────────────────────────────────────────────────────

  /**
   * Add an edge from `from` to `to`. Implicitly creates nodes if missing.
   * For undirected graphs also adds the reverse direction internally.
   */
  addEdge(from: string, to: string, opts: { weight?: number; label?: E } = {}): this {
    if (!this._nodes.has(from)) this.addNode(from);
    if (!this._nodes.has(to)) this.addNode(to);

    const edge: Edge<E> = { from, to, weight: opts.weight ?? 1, label: opts.label };
    this._adj.get(from)!.set(to, edge);
    this._radj.get(to)!.set(from, edge);

    if (!this._directed && from !== to) {
      const rev: Edge<E> = { from: to, to: from, weight: edge.weight, label: edge.label };
      this._adj.get(to)!.set(from, rev);
      this._radj.get(from)!.set(to, rev);
    }
    return this;
  }

  /** Remove an edge. Returns `this`. */
  removeEdge(from: string, to: string): this {
    this._adj.get(from)?.delete(to);
    this._radj.get(to)?.delete(from);
    if (!this._directed) {
      this._adj.get(to)?.delete(from);
      this._radj.get(from)?.delete(to);
    }
    return this;
  }

  /** Returns true if an edge (from, to) exists. */
  hasEdge(from: string, to: string): boolean {
    return this._adj.get(from)?.has(to) ?? false;
  }

  /** Get edge data, or undefined. */
  edge(from: string, to: string): Edge<E> | undefined {
    return this._adj.get(from)?.get(to);
  }

  /** All edges. For undirected graphs, each edge appears once (from < to by insertion order). */
  edges(): Edge<E>[] {
    const result: Edge<E>[] = [];
    if (this._directed) {
      for (const neighbors of this._adj.values()) {
        result.push(...neighbors.values());
      }
    } else {
      const seen = new Set<string>();
      for (const [from, neighbors] of this._adj.entries()) {
        for (const [to, edge] of neighbors.entries()) {
          const key = from < to ? `${from}\0${to}` : `${to}\0${from}`;
          if (!seen.has(key)) { seen.add(key); result.push(edge); }
        }
      }
    }
    return result;
  }

  get edgeCount(): number {
    return this.edges().length;
  }

  // ── adjacency ───────────────────────────────────────────────────────────────

  /** Successor node ids (for directed: nodes reachable via an outgoing edge). */
  successors(id: string): string[] {
    return [...(this._adj.get(id)?.keys() ?? [])];
  }

  /** Predecessor node ids (for directed: nodes with edges pointing to `id`). */
  predecessors(id: string): string[] {
    return [...(this._radj.get(id)?.keys() ?? [])];
  }

  /**
   * Neighbors of `id`. For directed graphs returns successors; for undirected
   * returns all adjacent nodes.
   */
  neighbors(id: string): string[] {
    if (this._directed) return this.successors(id);
    const set = new Set([...this.successors(id), ...this.predecessors(id)]);
    return [...set];
  }

  /** Out-degree (number of outgoing edges). */
  outDegree(id: string): number {
    return this._adj.get(id)?.size ?? 0;
  }

  /** In-degree (number of incoming edges). */
  inDegree(id: string): number {
    return this._radj.get(id)?.size ?? 0;
  }

  /** Degree = outDegree + inDegree (for undirected = number of edges, self-loops count once). */
  degree(id: string): number {
    if (!this._directed) return this._adj.get(id)?.size ?? 0;
    return this.outDegree(id) + this.inDegree(id);
  }

  // ── properties ──────────────────────────────────────────────────────────────

  get isDirected(): boolean {
    return this._directed;
  }

  // ── traversal ───────────────────────────────────────────────────────────────

  /**
   * Depth-first search from `start`. Returns visited node ids in DFS order.
   * Optional `visitor` is called for each node as it's first discovered.
   */
  dfs(start: string, visitor?: (id: string) => void): string[] {
    if (!this._nodes.has(start)) return [];
    const visited: string[] = [];
    const seen = new Set<string>();
    const stack = [start];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      visited.push(id);
      visitor?.(id);
      for (const n of [...this.successors(id)].reverse()) {
        if (!seen.has(n)) stack.push(n);
      }
    }
    return visited;
  }

  /**
   * Breadth-first search from `start`. Returns visited node ids in BFS order.
   * Optional `visitor` is called for each node as it's first discovered.
   */
  bfs(start: string, visitor?: (id: string) => void): string[] {
    if (!this._nodes.has(start)) return [];
    const visited: string[] = [];
    const seen = new Set<string>([start]);
    const queue: string[] = [start];
    let head = 0;
    while (head < queue.length) {
      const id = queue[head++]!;
      visited.push(id);
      visitor?.(id);
      for (const n of this.successors(id)) {
        if (!seen.has(n)) { seen.add(n); queue.push(n); }
      }
    }
    return visited;
  }

  // ── shortest paths ──────────────────────────────────────────────────────────

  /**
   * Dijkstra's shortest path from `source` to `target` (non-negative weights).
   * Returns `null` if no path exists.
   *
   * Time: O((V + E) log V) with a binary-heap-based priority queue.
   */
  dijkstra(source: string, target: string): PathResult | null {
    if (!this._nodes.has(source) || !this._nodes.has(target)) return null;

    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const visited = new Set<string>();

    for (const id of this._nodes.keys()) {
      dist.set(id, Infinity);
      prev.set(id, null);
    }
    dist.set(source, 0);

    // Min-heap stored as array of [dist, id]
    const heap: [number, string][] = [[0, source]];

    const push = (d: number, id: string) => {
      heap.push([d, id]);
      // Sift up
      let i = heap.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent]![0] <= heap[i]![0]) break;
        [heap[parent], heap[i]] = [heap[i]!, heap[parent]!];
        i = parent;
      }
    };

    const pop = (): [number, string] | undefined => {
      if (heap.length === 0) return undefined;
      const top = heap[0]!;
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        while (true) {
          const l = 2 * i + 1, r = 2 * i + 2;
          let min = i;
          if (l < heap.length && heap[l]![0] < heap[min]![0]) min = l;
          if (r < heap.length && heap[r]![0] < heap[min]![0]) min = r;
          if (min === i) break;
          [heap[i], heap[min]] = [heap[min]!, heap[i]!];
          i = min;
        }
      }
      return top;
    };

    while (heap.length > 0) {
      const entry = pop()!;
      const [d, u] = entry;
      if (visited.has(u)) continue;
      visited.add(u);
      if (u === target) break;

      for (const [v, edge] of (this._adj.get(u) ?? new Map()).entries()) {
        const alt = d + edge.weight;
        if (alt < dist.get(v)!) {
          dist.set(v, alt);
          prev.set(v, u);
          push(alt, v);
        }
      }
    }

    if (dist.get(target) === Infinity) return null;

    // Reconstruct path
    const path: string[] = [];
    let cur: string | null = target;
    while (cur !== null) {
      path.unshift(cur);
      cur = prev.get(cur) ?? null;
    }
    return { distance: dist.get(target)!, path };
  }

  /**
   * Shortest distances from `source` to all reachable nodes.
   * Returns a Map<nodeId, distance>.
   */
  dijkstraAll(source: string): Map<string, number> {
    const dist = new Map<string, number>();
    const visited = new Set<string>();

    for (const id of this._nodes.keys()) dist.set(id, Infinity);
    dist.set(source, 0);

    const heap: [number, string][] = [[0, source]];
    const push = (d: number, id: string) => {
      heap.push([d, id]);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent]![0] <= heap[i]![0]) break;
        [heap[parent], heap[i]] = [heap[i]!, heap[parent]!];
        i = parent;
      }
    };
    const pop = (): [number, string] | undefined => {
      if (heap.length === 0) return undefined;
      const top = heap[0]!;
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        while (true) {
          const l = 2 * i + 1, r = 2 * i + 2;
          let min = i;
          if (l < heap.length && heap[l]![0] < heap[min]![0]) min = l;
          if (r < heap.length && heap[r]![0] < heap[min]![0]) min = r;
          if (min === i) break;
          [heap[i], heap[min]] = [heap[min]!, heap[i]!];
          i = min;
        }
      }
      return top;
    };

    while (heap.length > 0) {
      const [d, u] = pop()!;
      if (visited.has(u)) continue;
      visited.add(u);
      for (const [v, edge] of (this._adj.get(u) ?? new Map()).entries()) {
        const alt = d + edge.weight;
        if (alt < dist.get(v)!) { dist.set(v, alt); push(alt, v); }
      }
    }
    return dist;
  }

  // ── topological sort ────────────────────────────────────────────────────────

  /**
   * Topological sort (Kahn's algorithm). Returns nodes in topological order.
   * Throws `GraphError` if the graph contains a cycle.
   * Only meaningful for directed graphs.
   */
  topologicalSort(): string[] {
    const inDeg = new Map<string, number>();
    for (const id of this._nodes.keys()) inDeg.set(id, 0);
    for (const [, neighbors] of this._adj.entries()) {
      for (const to of neighbors.keys()) {
        inDeg.set(to, (inDeg.get(to) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDeg.entries()) {
      if (deg === 0) queue.push(id);
    }

    const result: string[] = [];
    let head = 0;
    while (head < queue.length) {
      const u = queue[head++]!;
      result.push(u);
      for (const v of (this._adj.get(u) ?? new Map()).keys()) {
        const newDeg = inDeg.get(v)! - 1;
        inDeg.set(v, newDeg);
        if (newDeg === 0) queue.push(v);
      }
    }

    if (result.length !== this._nodes.size) {
      throw new GraphError("Graph contains a cycle; topological sort is not possible");
    }
    return result;
  }

  // ── cycle detection ─────────────────────────────────────────────────────────

  /**
   * Returns `true` if the graph contains at least one cycle.
   * Uses DFS with three-colour marking.
   */
  hasCycle(): boolean {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const id of this._nodes.keys()) color.set(id, WHITE);

    const dfsVisit = (u: string): boolean => {
      color.set(u, GRAY);
      for (const v of (this._adj.get(u) ?? new Map()).keys()) {
        if (color.get(v) === GRAY) return true;
        if (color.get(v) === WHITE && dfsVisit(v)) return true;
      }
      color.set(u, BLACK);
      return false;
    };

    for (const id of this._nodes.keys()) {
      if (color.get(id) === WHITE && dfsVisit(id)) return true;
    }
    return false;
  }

  // ── connected components ────────────────────────────────────────────────────

  /**
   * Connected components (for undirected graphs) or weakly connected components
   * (for directed graphs — ignores edge direction).
   * Returns array of arrays of node ids, each representing one component.
   */
  connectedComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const id of this._nodes.keys()) {
      if (visited.has(id)) continue;
      const comp: string[] = [];
      // BFS ignoring direction
      const queue = [id];
      let head = 0;
      visited.add(id);
      while (head < queue.length) {
        const u = queue[head++]!;
        comp.push(u);
        const allNeighbors = new Set([
          ...(this._adj.get(u)?.keys() ?? []),
          ...(this._radj.get(u)?.keys() ?? []),
        ]);
        for (const v of allNeighbors) {
          if (!visited.has(v)) { visited.add(v); queue.push(v); }
        }
      }
      components.push(comp);
    }
    return components;
  }

  /**
   * Strongly connected components using Tarjan's algorithm (directed graphs).
   * For undirected graphs, equivalent to `connectedComponents`.
   * Returns array of arrays of node ids (each SCC is a group).
   */
  stronglyConnectedComponents(): string[][] {
    if (!this._directed) return this.connectedComponents();

    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Map<string, boolean>();
    const stack: string[] = [];
    const sccs: string[][] = [];
    let counter = 0;

    const strongconnect = (v: string) => {
      index.set(v, counter);
      lowlink.set(v, counter);
      counter++;
      stack.push(v);
      onStack.set(v, true);

      for (const w of (this._adj.get(v) ?? new Map()).keys()) {
        if (!index.has(w)) {
          strongconnect(w);
          lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
        } else if (onStack.get(w)) {
          lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
        }
      }

      if (lowlink.get(v) === index.get(v)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.set(w, false);
          scc.push(w);
        } while (w !== v);
        sccs.push(scc);
      }
    };

    for (const v of this._nodes.keys()) {
      if (!index.has(v)) strongconnect(v);
    }
    return sccs;
  }

  // ── minimum spanning tree ───────────────────────────────────────────────────

  /**
   * Minimum spanning tree (Kruskal's algorithm). Returns edges in the MST.
   * Only meaningful for undirected connected graphs.
   * If the graph is disconnected, returns a minimum spanning forest.
   */
  kruskal(): Edge<E>[] {
    const edges = this.edges().sort((a, b) => a.weight - b.weight);
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();

    for (const id of this._nodes.keys()) { parent.set(id, id); rank.set(id, 0); }

    const find = (x: string): string => {
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
      return parent.get(x)!;
    };
    const union = (a: string, b: string): boolean => {
      const ra = find(a), rb = find(b);
      if (ra === rb) return false;
      if ((rank.get(ra) ?? 0) < (rank.get(rb) ?? 0)) parent.set(ra, rb);
      else if ((rank.get(ra) ?? 0) > (rank.get(rb) ?? 0)) parent.set(rb, ra);
      else { parent.set(rb, ra); rank.set(ra, (rank.get(ra) ?? 0) + 1); }
      return true;
    };

    const mst: Edge<E>[] = [];
    for (const edge of edges) {
      if (union(edge.from, edge.to)) mst.push(edge);
    }
    return mst;
  }

  /**
   * Minimum spanning tree (Prim's algorithm). Returns edges in the MST.
   * Only meaningful for undirected connected graphs.
   * Starts from the first node in insertion order if `start` is not given.
   */
  prim(start?: string): Edge<E>[] {
    const nodes = [...this._nodes.keys()];
    if (nodes.length === 0) return [];
    const src = start ?? nodes[0]!;
    if (!this._nodes.has(src)) throw new GraphError(`Node "${src}" not found`);

    const inMST = new Set<string>([src]);
    const mst: Edge<E>[] = [];

    // heap of [weight, edge]
    const heap: [number, Edge<E>][] = [];
    const push = (w: number, e: Edge<E>) => {
      heap.push([w, e]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p]![0] <= heap[i]![0]) break;
        [heap[p], heap[i]] = [heap[i]!, heap[p]!];
        i = p;
      }
    };
    const pop = (): [number, Edge<E>] | undefined => {
      if (!heap.length) return undefined;
      const top = heap[0]!;
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        while (true) {
          const l = 2 * i + 1, r = 2 * i + 2;
          let min = i;
          if (l < heap.length && heap[l]![0] < heap[min]![0]) min = l;
          if (r < heap.length && heap[r]![0] < heap[min]![0]) min = r;
          if (min === i) break;
          [heap[i], heap[min]] = [heap[min]!, heap[i]!];
          i = min;
        }
      }
      return top;
    };

    const addEdgesFrom = (u: string) => {
      for (const [v, edge] of (this._adj.get(u) ?? new Map()).entries()) {
        if (!inMST.has(v)) push(edge.weight, edge);
      }
    };
    addEdgesFrom(src);

    while (heap.length > 0) {
      const entry = pop()!;
      const [, edge] = entry;
      if (inMST.has(edge.to)) continue;
      inMST.add(edge.to);
      mst.push(edge);
      addEdgesFrom(edge.to);
    }
    return mst;
  }

  // ── predicates ──────────────────────────────────────────────────────────────

  /**
   * Returns true if the graph is a DAG (directed acyclic graph).
   * Always false for undirected graphs with any edges.
   */
  isDAG(): boolean {
    if (!this._directed) return this.edgeCount === 0;
    return !this.hasCycle();
  }

  /**
   * Returns true if the graph is connected (all nodes reachable from any one).
   * For directed graphs checks weak connectivity.
   */
  isConnected(): boolean {
    if (this._nodes.size === 0) return true;
    return this.connectedComponents().length === 1;
  }

  // ── serialization ───────────────────────────────────────────────────────────

  /** Serialize to a plain object for JSON.stringify. */
  toJSON(): { directed: boolean; nodes: Array<{ id: string; label?: N }>; edges: Array<{ from: string; to: string; weight: number; label?: E }> } {
    return {
      directed: this._directed,
      nodes: [...this._nodes.entries()].map(([id, label]) => label !== undefined ? { id, label } : { id }),
      edges: this.edges().map(e => e.label !== undefined ? { from: e.from, to: e.to, weight: e.weight, label: e.label } : { from: e.from, to: e.to, weight: e.weight }),
    };
  }

  /** Reconstruct a Graph from the output of `toJSON`. */
  static fromJSON<N, E>(data: ReturnType<Graph<N, E>["toJSON"]>): Graph<N, E> {
    const g = new Graph<N, E>({ directed: data.directed });
    for (const n of data.nodes) g.addNode(n.id, n.label);
    for (const e of data.edges) g.addEdge(e.from, e.to, { weight: e.weight, label: e.label });
    return g;
  }
}

/** Convenience: create a directed graph. */
export function digraph<N = unknown, E = unknown>(): Graph<N, E> {
  return new Graph<N, E>({ directed: true });
}

/** Convenience: create an undirected graph. */
export function ungraph<N = unknown, E = unknown>(): Graph<N, E> {
  return new Graph<N, E>({ directed: false });
}
