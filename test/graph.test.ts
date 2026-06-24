import { Graph, GraphError, digraph, ungraph } from "../src/index.js";

// ── construction ──────────────────────────────────────────────────────────────
describe("Graph construction", () => {
  it("creates a directed graph by default", () => {
    const g = new Graph();
    expect(g.isDirected).toBe(true);
  });

  it("creates an undirected graph with option", () => {
    const g = new Graph({ directed: false });
    expect(g.isDirected).toBe(false);
  });

  it("digraph() helper creates directed", () => expect(digraph().isDirected).toBe(true));
  it("ungraph() helper creates undirected", () => expect(ungraph().isDirected).toBe(false));
});

// ── nodes ─────────────────────────────────────────────────────────────────────
describe("Node operations", () => {
  it("adds and checks nodes", () => {
    const g = digraph<string>();
    g.addNode("a", "Alice");
    expect(g.hasNode("a")).toBe(true);
    expect(g.nodeLabel("a")).toBe("Alice");
    expect(g.nodeCount).toBe(1);
  });

  it("updating label on existing node", () => {
    const g = digraph<string>();
    g.addNode("a", "Alice");
    g.addNode("a", "Bob");
    expect(g.nodeLabel("a")).toBe("Bob");
    expect(g.nodeCount).toBe(1);
  });

  it("removes a node and its edges", () => {
    const g = digraph();
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.removeNode("b");
    expect(g.hasNode("b")).toBe(false);
    expect(g.hasEdge("a", "b")).toBe(false);
    expect(g.hasEdge("b", "c")).toBe(false);
    expect(g.nodes()).toEqual(expect.arrayContaining(["a", "c"]));
  });

  it("lists all nodes", () => {
    const g = digraph();
    g.addNode("x").addNode("y").addNode("z");
    expect(g.nodes().sort()).toEqual(["x", "y", "z"]);
  });

  it("returns undefined label for unknown node", () => {
    expect(digraph().nodeLabel("nope")).toBeUndefined();
  });
});

// ── edges ─────────────────────────────────────────────────────────────────────
describe("Edge operations", () => {
  it("adds edges and auto-creates nodes", () => {
    const g = digraph<unknown, string>();
    g.addEdge("a", "b", { weight: 5, label: "road" });
    expect(g.hasNode("a")).toBe(true);
    expect(g.hasEdge("a", "b")).toBe(true);
    expect(g.edge("a", "b")?.weight).toBe(5);
    expect(g.edge("a", "b")?.label).toBe("road");
  });

  it("default weight is 1", () => {
    const g = digraph();
    g.addEdge("a", "b");
    expect(g.edge("a", "b")?.weight).toBe(1);
  });

  it("removes an edge", () => {
    const g = digraph();
    g.addEdge("a", "b");
    g.removeEdge("a", "b");
    expect(g.hasEdge("a", "b")).toBe(false);
    expect(g.hasNode("a")).toBe(true);
  });

  it("directed edge is one-way", () => {
    const g = digraph();
    g.addEdge("a", "b");
    expect(g.hasEdge("a", "b")).toBe(true);
    expect(g.hasEdge("b", "a")).toBe(false);
  });

  it("undirected edge is bidirectional", () => {
    const g = ungraph();
    g.addEdge("a", "b", { weight: 3 });
    expect(g.hasEdge("a", "b")).toBe(true);
    expect(g.hasEdge("b", "a")).toBe(true);
    expect(g.edge("b", "a")?.weight).toBe(3);
  });

  it("counts edges correctly for undirected", () => {
    const g = ungraph();
    g.addEdge("a", "b").addEdge("b", "c").addEdge("a", "c");
    expect(g.edgeCount).toBe(3);
    expect(g.edges().length).toBe(3);
  });

  it("counts edges correctly for directed", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("b", "a");
    expect(g.edgeCount).toBe(2);
  });
});

// ── adjacency ─────────────────────────────────────────────────────────────────
describe("Adjacency", () => {
  it("successors and predecessors in directed", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("c", "b");
    expect(g.successors("a")).toEqual(["b"]);
    expect(g.predecessors("b").sort()).toEqual(["a", "c"]);
    expect(g.predecessors("a")).toEqual([]);
  });

  it("neighbors in undirected", () => {
    const g = ungraph();
    g.addEdge("a", "b").addEdge("a", "c");
    expect(g.neighbors("a").sort()).toEqual(["b", "c"]);
    expect(g.neighbors("b")).toEqual(["a"]);
  });

  it("degree calculations", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("a", "c").addEdge("d", "a");
    expect(g.outDegree("a")).toBe(2);
    expect(g.inDegree("a")).toBe(1);
    expect(g.degree("a")).toBe(3);
  });
});

// ── DFS ───────────────────────────────────────────────────────────────────────
describe("DFS", () => {
  it("visits nodes in DFS order", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("a", "c").addEdge("b", "d");
    const order = g.dfs("a");
    expect(order[0]).toBe("a");
    expect(order).toContain("b");
    expect(order).toContain("c");
    expect(order).toContain("d");
  });

  it("returns empty for unknown start", () => {
    expect(digraph().dfs("x")).toEqual([]);
  });

  it("calls visitor on each node", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("b", "c");
    const visited: string[] = [];
    g.dfs("a", id => visited.push(id));
    expect(visited).toEqual(["a", "b", "c"]);
  });

  it("handles disconnected graph — only visits reachable", () => {
    const g = digraph();
    g.addEdge("a", "b");
    g.addNode("c");
    const order = g.dfs("a");
    expect(order).toContain("a");
    expect(order).toContain("b");
    expect(order).not.toContain("c");
  });
});

// ── BFS ───────────────────────────────────────────────────────────────────────
describe("BFS", () => {
  it("visits nodes in BFS order", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("a", "c").addEdge("b", "d").addEdge("c", "d");
    const order = g.bfs("a");
    expect(order[0]).toBe("a");
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("d"));
    expect(order.indexOf("c")).toBeLessThan(order.indexOf("d"));
  });

  it("returns empty for unknown start", () => {
    expect(digraph().bfs("x")).toEqual([]);
  });
});

// ── Dijkstra ──────────────────────────────────────────────────────────────────
describe("Dijkstra", () => {
  it("finds shortest path in weighted directed graph", () => {
    const g = digraph();
    g.addEdge("a", "b", { weight: 1 });
    g.addEdge("a", "c", { weight: 4 });
    g.addEdge("b", "c", { weight: 2 });
    g.addEdge("b", "d", { weight: 5 });
    g.addEdge("c", "d", { weight: 1 });

    const result = g.dijkstra("a", "d");
    expect(result).not.toBeNull();
    expect(result!.distance).toBe(4); // a→b(1)→c(2)→d(1)
    expect(result!.path).toEqual(["a", "b", "c", "d"]);
  });

  it("returns null when no path", () => {
    const g = digraph();
    g.addNode("a");
    g.addNode("b");
    expect(g.dijkstra("a", "b")).toBeNull();
  });

  it("returns null for unknown nodes", () => {
    expect(digraph().dijkstra("x", "y")).toBeNull();
  });

  it("single node path (source === target)", () => {
    const g = digraph();
    g.addNode("a");
    const result = g.dijkstra("a", "a");
    expect(result).not.toBeNull();
    expect(result!.distance).toBe(0);
    expect(result!.path).toEqual(["a"]);
  });

  it("dijkstraAll returns all distances", () => {
    const g = digraph();
    g.addEdge("a", "b", { weight: 2 });
    g.addEdge("a", "c", { weight: 5 });
    g.addEdge("b", "c", { weight: 1 });
    const dist = g.dijkstraAll("a");
    expect(dist.get("a")).toBe(0);
    expect(dist.get("b")).toBe(2);
    expect(dist.get("c")).toBe(3);
  });

  it("works on undirected graph", () => {
    const g = ungraph();
    g.addEdge("a", "b", { weight: 3 });
    g.addEdge("b", "c", { weight: 2 });
    const result = g.dijkstra("c", "a");
    expect(result!.distance).toBe(5);
    expect(result!.path).toEqual(["c", "b", "a"]);
  });
});

// ── topological sort ──────────────────────────────────────────────────────────
describe("Topological Sort", () => {
  it("returns valid topological order", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("a", "c").addEdge("b", "d").addEdge("c", "d");
    const order = g.topologicalSort();
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("c"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("d"));
    expect(order.indexOf("c")).toBeLessThan(order.indexOf("d"));
  });

  it("throws GraphError on cycle", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("b", "c").addEdge("c", "a");
    expect(() => g.topologicalSort()).toThrow(GraphError);
  });

  it("handles isolated nodes", () => {
    const g = digraph();
    g.addNode("a").addNode("b").addNode("c");
    const order = g.topologicalSort();
    expect(order.sort()).toEqual(["a", "b", "c"]);
  });
});

// ── cycle detection ───────────────────────────────────────────────────────────
describe("Cycle detection", () => {
  it("detects cycle", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("b", "c").addEdge("c", "a");
    expect(g.hasCycle()).toBe(true);
  });

  it("no cycle in DAG", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("b", "c");
    expect(g.hasCycle()).toBe(false);
  });

  it("self-loop is a cycle", () => {
    const g = digraph();
    g.addEdge("a", "a");
    expect(g.hasCycle()).toBe(true);
  });

  it("isDAG is true for DAG", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("b", "c");
    expect(g.isDAG()).toBe(true);
  });

  it("isDAG is false with cycle", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("b", "a");
    expect(g.isDAG()).toBe(false);
  });
});

// ── connected components ──────────────────────────────────────────────────────
describe("Connected components", () => {
  it("finds components in undirected graph", () => {
    const g = ungraph();
    g.addEdge("a", "b").addEdge("b", "c");
    g.addEdge("d", "e");
    g.addNode("f");
    const comps = g.connectedComponents();
    expect(comps.length).toBe(3);
    const sorted = comps.map(c => c.sort().join(",")).sort();
    expect(sorted).toEqual(["a,b,c", "d,e", "f"]);
  });

  it("isConnected true when single component", () => {
    const g = ungraph();
    g.addEdge("a", "b").addEdge("b", "c");
    expect(g.isConnected()).toBe(true);
  });

  it("isConnected false when disconnected", () => {
    const g = ungraph();
    g.addEdge("a", "b");
    g.addNode("c");
    expect(g.isConnected()).toBe(false);
  });

  it("empty graph is connected", () => {
    expect(ungraph().isConnected()).toBe(true);
  });
});

// ── SCC ──────────────────────────────────────────────────────────────────────
describe("Strongly connected components", () => {
  it("finds SCCs with Tarjan algorithm", () => {
    const g = digraph();
    // SCC1: a↔b, SCC2: c→d (no cycle), SCC3: e (isolated)
    g.addEdge("a", "b").addEdge("b", "a");
    g.addEdge("b", "c");
    g.addEdge("c", "d");
    g.addNode("e");

    const sccs = g.stronglyConnectedComponents();
    expect(sccs.length).toBe(4); // {a,b}, {c}, {d}, {e}
    const sccStrings = sccs.map(s => s.sort().join(",")).sort();
    expect(sccStrings).toContain("a,b");
    expect(sccStrings).toContain("c");
    expect(sccStrings).toContain("d");
    expect(sccStrings).toContain("e");
  });

  it("full cycle is one SCC", () => {
    const g = digraph();
    g.addEdge("a", "b").addEdge("b", "c").addEdge("c", "a");
    const sccs = g.stronglyConnectedComponents();
    expect(sccs.length).toBe(1);
    expect(sccs[0]!.sort()).toEqual(["a", "b", "c"]);
  });
});

// ── MST ──────────────────────────────────────────────────────────────────────
describe("Minimum spanning tree", () => {
  const buildGraph = () => {
    const g = ungraph();
    g.addEdge("a", "b", { weight: 4 });
    g.addEdge("a", "c", { weight: 2 });
    g.addEdge("b", "c", { weight: 1 });
    g.addEdge("b", "d", { weight: 5 });
    g.addEdge("c", "d", { weight: 8 });
    return g;
  };

  it("kruskal finds MST with correct total weight", () => {
    const mst = buildGraph().kruskal();
    const total = mst.reduce((s, e) => s + e.weight, 0);
    expect(mst.length).toBe(3); // n-1 edges
    expect(total).toBe(8); // b-c(1) + a-c(2) + a-b or b-d... actually: b-c(1)+a-c(2)+b-d(5)=8
  });

  it("prim finds MST with correct total weight", () => {
    const mst = buildGraph().prim("a");
    const total = mst.reduce((s, e) => s + e.weight, 0);
    expect(mst.length).toBe(3);
    expect(total).toBe(8);
  });

  it("kruskal and prim produce same total weight", () => {
    const g = buildGraph();
    const wK = g.kruskal().reduce((s, e) => s + e.weight, 0);
    const wP = g.prim().reduce((s, e) => s + e.weight, 0);
    expect(wK).toBe(wP);
  });
});

// ── serialization ─────────────────────────────────────────────────────────────
describe("Serialization", () => {
  it("toJSON/fromJSON round-trips", () => {
    const g = digraph<string, number>();
    g.addNode("a", "Alice");
    g.addEdge("a", "b", { weight: 3, label: 42 });

    const json = g.toJSON();
    const g2 = Graph.fromJSON<string, number>(json);

    expect(g2.hasNode("a")).toBe(true);
    expect(g2.nodeLabel("a")).toBe("Alice");
    expect(g2.hasEdge("a", "b")).toBe(true);
    expect(g2.edge("a", "b")?.weight).toBe(3);
    expect(g2.edge("a", "b")?.label).toBe(42);
    expect(g2.isDirected).toBe(true);
  });

  it("toJSON produces valid JSON", () => {
    const g = digraph();
    g.addEdge("x", "y");
    expect(() => JSON.stringify(g.toJSON())).not.toThrow();
  });
});

// ── chaining ──────────────────────────────────────────────────────────────────
describe("Method chaining", () => {
  it("addNode and addEdge return this", () => {
    const g = digraph();
    expect(g.addNode("a").addNode("b").addEdge("a", "b")).toBe(g);
  });
});
