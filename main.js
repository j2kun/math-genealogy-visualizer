import * as dagreD3 from 'dagre-d3';
import * as graphlibDot from 'graphlib-dot';

var data = null;  // Contains the raw graph data
let width = 1280;
let height = 1000;
let svg = d3.select("body").insert("svg", ":first-child")
                           .attr("width", width)
                           .attr("height", height)
                           .style("cursor", "move");
                           
let initialScale = '0.2';
let inner = svg.append("g").attr("transform", `scale(${initialScale},${initialScale})`);

// Set up zoom support
let zoom = d3.behavior.zoom().scale(initialScale).on("zoom", function() {
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

  // graph is the output of the dagre-d3 dot parser
  let graph = createGraphFor(203505);
  
  // Center the dag
  var zoomScale = 1;
  // Get Dagre Graph dimensions
  var graphWidth = graph.graph().width;
  var graphHeight = graph.graph().height;
  // Get SVG dimensions
  var width = parseInt(svg.style("width").replace(/px/, ""));
  var height = parseInt(svg.style("height").replace(/px/, ""));

  // Calculate applicable scale for zoom
  zoomScale = Math.min(width / graphWidth, height / graphHeight);

  var translate = [(width/2) - ((graphWidth * zoomScale)/2), 0];
  console.log(translate);
  console.log(zoomScale);
  zoom.translate(translate);
  zoom.scale(zoomScale);
  zoom.event(inner);
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
  var graph;
  let edgeStrings = ancestryGraph(id);
  let graphString = "digraph {";
  for (let edge of edgeStrings) {
    graphString = graphString + " " + edge + " ";
  }
  graphString = graphString + "}";

  try {
    graph = graphlibDot.read(graphString);
  } catch (e) {
    console.log('Failed to parse graph...')
    throw e;
  }

  // Render the graph into svg g
  d3.select("svg g").call(render, graph);
  return graph;
}
