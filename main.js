import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3';

var data = null;  // Contains the raw graph data
let width = 3000;
let height = 3000;
let svg = d3.select("body").insert("svg", ":first-child")
                           .attr("width", width)
                           .attr("height", height);
let inner = svg.append("g");

// Set up zoom support
let zoom = d3.behavior.zoom().on("zoom", function() {
  inner.attr("transform", "translate(" + d3.event.translate + ")" +
                              "scale(" + d3.event.scale + ")");
});
svg.call(zoom);

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
});


function ancestryGraph(id) {
  // Construct the graph of ancestors of the given node
  // Output is a d3-compatible edge list
  let nodeIdToName = {};
  let edgeSubset = [];
  let unprocessed = [id];
  let processed = new Set([]);

  while (unprocessed.length > 0) {
    let next = unprocessed.pop();
    processed.add(next);  // Ignore any self loops, which would be odd
    nodeIdToName[next] = data[next].name;
    let parents = data[next]['in'];

    for (let parentId of parents) {
      edgeSubset.push([parentId, next]);
      if (!processed.has(parentId)) {
        unprocessed.push(parentId);
      }
    }
  }

  let edges = edgeSubset.map(function(e) { 
    let sourceName = nodeIdToName[e[0].toString()];
    let targetName = nodeIdToName[e[1].toString()];
    return '"' + sourceName + '" -> "' + targetName + '";';
  });

  return edges; 
}


// Create and configure the renderer
var render = dagreD3.render();

function createGraphFor(id) {
  let edgeStrings = ancestryGraph(id);
  console.log(edgeStrings[0]);

  try {
    g = graphlibDot.read(inputGraph.value);
  } catch (e) {
    console.log('Failed to parse graph...')
    throw e;
  }

  // Render the graph into svg g
  d3.select("svg g").call(render, g);
}
