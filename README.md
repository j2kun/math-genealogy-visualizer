# Math genealogy visualizer

[Live demo](https://j2kun.github.io/math-genealogy/index.html) (takes about 15s to
load)

## Building locally

Clone this repository. Then, from the root directory of this repo:

Using `yarn` or `npm`,

```
yarn install   # or npm install
gulp watch

# in another terminal
python3 -m http.server

# browse to http://localhost:8000
```

## Details

This project uses:

 - ES6 (modern Javascript, though I suck at Javascript)
 - [Dagre](https://github.com/cpettitt/dagre) for layout
 - D3 and [dagre-d3](https://github.com/cpettitt/dagre-d3/) for rendering
 - [Graphlib-dot](https://github.com/cpettitt/graphlib-dot) for parsing
 - [Fuzzyset](https://github.com/Glench/fuzzyset.js) for search

A subset of the genealogy database, `genealogy_graph.json` (the full db you can
find [here](https://github.com/j2kun/math-genealogy-scraper) as `data.json`) is
loaded into the user's browser, a search index is built for name lookups,
and then Gauss's tree is displayed.

The user can then choose a single name to display the ancestry for, or else 
show the subset of the graph which contains the closest common ancestor of any
two nodes that are in the same connected component.
