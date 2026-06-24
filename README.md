# graphkit

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)

[![npm](https://img.shields.io/npm/v/%40billdaddy%2Fgraphkit)](https://www.npmjs.com/package/@billdaddy/graphkit)
[![CI](https://github.com/trananhtung/graphkit/actions/workflows/ci.yml/badge.svg)](https://github.com/trananhtung/graphkit/actions)
[![license](https://img.shields.io/npm/l/graphkit)](LICENSE)

Zero-dependency TypeScript graph library — directed & undirected graphs, weighted edges, DFS/BFS, Dijkstra, topological sort, cycle detection, strongly connected components, and minimum spanning tree.

```bash
npm install @billdaddy/graphkit
```

## Why?

`graphlib` (2.1M downloads/week) has been abandoned since 2018 with 127 open GitHub issues. It has no TypeScript types, no Dijkstra, no SCC, and no MST. `graphkit` is the modern, typed, algorithm-rich replacement.

Inspired by Python's `networkx`, Go's `dominikbraun/graph`, Java's `JGraphT`, and C#'s `QuikGraph`.

## Quick start

```ts
import { Graph, digraph, ungraph } from "@billdaddy/graphkit";

// Directed weighted graph
const g = digraph<string, number>();
g.addNode("a", "Alice");
g.addNode("b", "Bob");
g.addNode("c", "Carol");
g.addEdge("a", "b", { weight: 4 });
g.addEdge("a", "c", { weight: 2 });
g.addEdge("b", "c", { weight: 1 });

const result = g.dijkstra("a", "c");
// { distance: 2, path: ["a", "c"] }
```

## API

### Creating a graph

```ts
import { Graph, digraph, ungraph } from "@billdaddy/graphkit";

const g = new Graph({ directed: true });  // directed (default)
const d = digraph();                       // shorthand for directed
const u = ungraph();                       // shorthand for undirected
```

### Nodes

```ts
g.addNode("id");             // add a node
g.addNode("id", label);      // add with label (generic N)
g.removeNode("id");          // remove node + all its edges
g.hasNode("id");             // boolean
g.nodeLabel("id");           // N | undefined
g.nodes();                   // string[]
g.nodeCount;                 // number
```

### Edges

```ts
g.addEdge("from", "to");                              // weight = 1
g.addEdge("from", "to", { weight: 5, label: "road" });
g.removeEdge("from", "to");
g.hasEdge("from", "to");                              // boolean
g.edge("from", "to");                                 // Edge<E> | undefined
g.edges();                                            // Edge<E>[]
g.edgeCount;                                          // number
```

### Adjacency

```ts
g.successors("id");     // outgoing neighbors (directed)
g.predecessors("id");   // incoming neighbors (directed)
g.neighbors("id");      // all adjacent nodes
g.outDegree("id");
g.inDegree("id");
g.degree("id");
```

### Traversal

```ts
g.dfs("start");                      // string[] — DFS order
g.dfs("start", id => console.log(id)); // with visitor callback
g.bfs("start");                      // string[] — BFS order
```

### Shortest path (Dijkstra)

```ts
const result = g.dijkstra("a", "b");
// null if no path, or:
// { distance: 7, path: ["a", "c", "b"] }

const allDists = g.dijkstraAll("a");
// Map<string, number> — distances from "a" to every reachable node
```

### Topological sort

```ts
const order = g.topologicalSort();  // throws GraphError if graph has a cycle
```

### Cycle detection

```ts
g.hasCycle();  // boolean
g.isDAG();     // boolean — true if directed and acyclic
```

### Connected components

```ts
g.connectedComponents();           // string[][] — weakly connected
g.stronglyConnectedComponents();   // string[][] — Tarjan's SCC (directed)
g.isConnected();                   // boolean
```

### Minimum spanning tree

```ts
g.kruskal();        // Edge<E>[] — Kruskal's MST
g.prim("start");    // Edge<E>[] — Prim's MST
```

### Serialization

```ts
const json = g.toJSON();
const g2 = Graph.fromJSON(json);
```

## Examples

### Dependency graph with topological sort

```ts
import { digraph } from "@billdaddy/graphkit";

const g = digraph();
g.addEdge("lodash", "app");
g.addEdge("axios", "app");
g.addEdge("typescript", "lodash");

const buildOrder = g.topologicalSort();
// ["typescript", "lodash", "axios", "app"]
```

### Network routing with Dijkstra

```ts
import { ungraph } from "@billdaddy/graphkit";

const network = ungraph();
network.addEdge("A", "B", { weight: 10 });
network.addEdge("A", "C", { weight: 3 });
network.addEdge("C", "B", { weight: 4 });
network.addEdge("B", "D", { weight: 2 });
network.addEdge("C", "D", { weight: 8 });

const { path, distance } = network.dijkstra("A", "D")!;
// path: ["A", "C", "B", "D"], distance: 9
```

### Detecting circular imports

```ts
import { digraph } from "@billdaddy/graphkit";

const deps = digraph();
deps.addEdge("a", "b");
deps.addEdge("b", "c");
deps.addEdge("c", "a"); // circular!

if (deps.hasCycle()) {
  console.error("Circular dependency detected!");
}
```

### Finding clusters (SCC)

```ts
import { digraph } from "@billdaddy/graphkit";

const g = digraph();
g.addEdge("user1", "user2"); g.addEdge("user2", "user1"); // mutual
g.addEdge("user2", "user3");                               // user3 only follows user2

const clusters = g.stronglyConnectedComponents();
// [["user1", "user2"], ["user3"]]
```

## Type parameters

```ts
const g = new Graph<NodeLabel, EdgeLabel>();
// or
const g = digraph<NodeLabel, EdgeLabel>();
```

- `N` — type of the value stored on each node (optional, defaults to `unknown`)
- `E` — type of the label stored on each edge (optional, defaults to `unknown`)

## Comparison

| Package | Downloads/week | Last release | TypeScript | Algorithms |
|---------|---------------|--------------|------------|------------|
| **graphkit** | — | 2024 | ✅ native | DFS/BFS/Dijkstra/Topo/SCC/MST |
| graphlib | ~2.1M | **2018 (abandoned)** | ❌ | DFS/BFS only |
| @dagrejs/graphlib | ~800k | 2022 | partial | DFS/BFS only |
| graph-data-structure | ~15k | **2019** | ❌ | Topo only |

## Contributors ✨

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome — code, docs, bug reports, ideas, reviews! See the [emoji key](https://allcontributors.org/docs/en/emoji-key) for how each contribution is recognized, and open a PR or issue to get involved.

Thanks goes to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/trananhtung"><img src="https://avatars.githubusercontent.com/u/30992229?v=4?s=100" width="100px;" alt="Tung Tran"/><br /><sub><b>Tung Tran</b></sub></a><br /><a href="https://github.com/trananhtung/./commits?author=trananhtung" title="Code">💻</a> <a href="#maintenance-trananhtung" title="Maintenance">🚧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License

MIT
