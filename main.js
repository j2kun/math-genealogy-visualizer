import * as d3 from 'd3';

let width = 800;
let height = 600;
let svg = d3.select("body").insert("svg", ":first-child")
                           .attr("width", width)
                           .attr("height", height);

var data = null;
var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));


function convertData(d) {
  // the input is stored compressed, but d3-force requires a specific dict format
  let nodes = d.nodes;
  let edges = d.edges;
  let parents = [];
  let children = [];
  let idToIndex = [];

  let newNodes = [];
  let i = 0;
  for (let id in nodes) {
    let mgp_id = parseInt(id);
    newNodes.push({'id': mgp_id, 'name': nodes[id]});
    children.push([]);
    parents.push([]);
    idToIndex[mgp_id] = i;
    i += 1;
  }

  let newEdges = [];
  for (let i = 0; i < edges.length; i++) {
    newEdges.push({'source': edges[i][0], 'target': edges[i][1]});
    children[idToIndex[edges[i][0]]].push(edges[i][1]);
    parents[idToIndex[edges[i][1]]].push(edges[i][0]);
  }

  return {
    'nodes': newNodes,
    'edges': newEdges,
    'parents': parents,
    'children': children,
    'idToIndex': idToIndex,
  }
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


function getEdgeSubset(id) {
  // walk the tree of ancestors
  let unprocessed = [id];
  let processed = [];
  let edgeSubset = [];
  while (unprocessed.length > 0) {
    let next = unprocessed.pop();
    let parents = data.parents[next];
    
    parents.map(function(x) {
      if (!processed.contains(x)) {
        unprocessed.push(x);
      }
      // edgeSubset.push(data.edges[i]);
    });
  }
  for (let i = 0; i < data.edges.length; i++) {
    if (data.edges[i].target == id) {
    }
  }
  return edgeSubset;
}


function getNodeSubset(edgeSubset) {
  let nodeSubset = [];
  let nodesDict = [];
  for (let i = 0; i < edgeSubset.length; i++) {
    nodesDict[edgeSubset[i].source] = 1;
    nodesDict[edgeSubset[i].target] = 1;
  }

  for (let id in nodesDict) {
    let mgp_id = parseInt(id);
    nodeSubset.push({'id': mgp_id, 'name': data.nodes[data.idToIndex[id]].name});
  }

  return nodeSubset;
}


function createGraphFor(id) {
  let edgeSubset = getEdgeSubset(id);
  let nodeSubset = getNodeSubset(edgeSubset);
  console.log(edgeSubset);
  console.log(nodeSubset);

  let nodes = svg.append("g")
                 .selectAll("circle")
                 .data(nodeSubset)
                 .enter().append("circle");

  /*
  nodes.append("title")
       .text(function(id) { return data.nodes[id]; });
  */
  
  let edges = svg.append("g")
                 .selectAll("line")
                 .data(edgeSubset)
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
