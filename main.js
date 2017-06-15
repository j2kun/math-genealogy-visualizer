import * as d3 from 'd3';

let width = 800;
let height = 600;
let svg = d3.select("body").insert("svg", ":first-child")
                           .attr("width", width)
                           .attr("height", height);

var data = null;
var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id.toString(); }))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));
window.simulation = simulation;  // for debugging


function convertData(d) {
  // decompress the input
  let nodes = d.nodes;
  let edges = d.edges;

  let allKeys = Object.keys(nodes).map(x => parseInt(x));
  let maxKey = 0;
  for (let i = 0, n = allKeys.length; i < n; i++) {
    if (allKeys[i] > maxKey) {
      maxKey = allKeys[i];
    }
  }
  let graph = new Array(1 + maxKey);

  // graph is a list whose index is the id, and the entries are objects of the form
  //
  // {
  //   name: str,
  //   in: [int],   <-- list of ids of incoming edges
  //   out: [int],  <-- list of ids of outgoing edges
  // }

  for (let id in nodes) {
    let mgp_id = parseInt(id);
    graph[mgp_id] = {
      'name': nodes[id],
      'in': [],
      'out': [],
    };
  }

  for (let i = 0, n = edges.length; i < n; i++) {
    let source = edges[i][0];
    let target = edges[i][1];
    graph[source]['out'].push(target);
    graph[target]['in'].push(source);
  }

  return graph;
}


d3.json("genealogy_graph.json", function(error, d) {
  if (error) throw error;
  console.log('Done loading data');
  data = convertData(d);
  console.log('Done converting data');

  let graphSVG = createGraphFor(203505);
  setupGraphStyle(graphSVG);
  setupBehavior(graphSVG);
});


function ancestryGraph(id) {
  // Construct the graph of ancestors of the given node
  // Output is a d3-compatible edge list
  let nodeSubset = [];
  let edgeSubset = [];
  let unprocessed = [id];
  let processed = new Set([]);

  while (unprocessed.length > 0) {
    let next = unprocessed.pop();
    processed.add(next);  // Ignore any self loops, which would be odd
    nodeSubset.push(next);
    let parents = data[next]['in'];

    for (let parentId of parents) {
      edgeSubset.push([parentId, next]);
      if (!processed.has(parentId)) {
        unprocessed.push(parentId);
      }
    }
  }

  let nodes = nodeSubset.map(function(x) { return {'id': x.toString()}});
  let edges = edgeSubset.map(function(e) { return {'source': e[0].toString(), 'target': e[1].toString()}});

  return {
    'nodes': nodes,
    'edges': edges,
  }
}


function createGraphFor(id) {
  let graph = ancestryGraph(id);
  console.log(graph);

  let nodes = svg.append("g")
                 .selectAll("circle")
                 .data(graph.nodes)
                 .enter().append("circle");

  nodes.append("title")
       .text(function(node) { return data[parseInt(node['id'])]['name']; });

  let edges = svg.append("g")
                 .selectAll("line")
                 .data(graph.edges)
                 .enter().append("line");

  return {nodes: nodes, edges: edges};
}


function setupGraphStyle(graphSVG) {
  let {nodes, edges} = graphSVG;

  nodes.attr("class", "nodes")
       .attr("r", 5);

  edges.attr("class", "edges")
       .attr("stroke-width", 1);
}


function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}


function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}


function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}


function setupBehavior(graphSVG) {
  let { nodes, edges } = graphSVG;

  nodes.call(d3.drag()
               .on("start", dragstarted)
               .on("drag", dragged)
               .on("end", dragended));

  simulation.nodes(nodes)
            .on("tick", ticked);

  simulation.force("link")
            .links(edges);

  function ticked() {
    edges.attr("x1", function(d) { return d.source.x; })
         .attr("y1", function(d) { return d.source.y; })
         .attr("x2", function(d) { return d.target.x; })
         .attr("y2", function(d) { return d.target.y; });

    nodes.attr("cx", function(d) { return d.x; })
         .attr("cy", function(d) { return d.y; });
  }
}
