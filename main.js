import * as dagreD3 from 'dagre-d3';
import * as graphlibDot from 'graphlib-dot';
import * as FuzzySet from 'fuzzyset.js';

import {
  ancestryGraph,
  closestAncestor,
  commonAncestryGraph,
  descendantsCountExceeds,
  shortestPath,
} from './graph_search';


var data = null;  // Contains the raw graph data
var nameToId = new Object();
var fuzzyNames = FuzzySet.default();
let width = 1000;
let height = 800;
let svg = d3.select("#content").append("svg")
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
    let name = nodes[id];
    if (name) {
      graph[mgp_id] = {
        'name': name,
        'in': [],
        'out': [],
      };
      nameToId[name] = mgp_id;
      fuzzyNames.add(name);
    }
  }

  for (let i = 0, n = edges.length; i < n; i++) {
    let source = edges[i][0];
    let target = edges[i][1];
    graph[source]['out'].push(target);
    graph[target]['in'].push(source);
  }

  return graph;
}


function setSearchBar(text, textInputId, resultsId) {
  d3.select(textInputId).property('value', text);
  d3.select(resultsId).style('display', 'none');
}


function suggest(textInputId, resultsId) {
  let searchString = d3.select(textInputId).property('value');
  let autocomplete = d3.select(resultsId);
  console.log('Autocompleting ' + searchString);

  if (d3.event.keyCode == 13) {
    autocomplete.style('display', 'none');
    renderFromSearch(textInputId);
  } else {
    var results = null;
    if (searchString.length >= 3) {
      results = fuzzyNames.get(searchString, '', 0.3);
    }

    let dataList = autocomplete.selectAll('li')
                               .data([]).exit().remove();
    if (results) {
      let dataList = autocomplete.selectAll('option').data(results);

      dataList.enter()
              .append('li')
              .attr('class', 'autocomplete_option')
              .attr('value', function (d) { return d[1]; })
              .text(function (d) { return d[1]; });
    }

    autocomplete.selectAll('.autocomplete_option').on('click', function() {
      setSearchBar(this.innerText, textInputId, resultsId);
    });
    autocomplete.style('display', 'block');
  }
}


d3.json("genealogy_graph.json", function(error, d) {
  if (error) throw error;
  console.log('Done loading data');
  data = convertData(d);
  window.data = data;
  console.log('Done converting data');
  d3.select('#hide_while_loading').style('display', 'block');
  d3.select('#loading').style('display', 'none');

  let gauss = 18231;
  createAncestryGraphFor(gauss);
});


function edgeListToStrings(edges) {
  return edges.map(function(e) {
    let sourceName = data[e[0]].name;
    let targetName = data[e[1]].name;
    return '"' + sourceName + '" -> "' + targetName + '";';
  });
}


// Create and configure the renderer
var render = dagreD3.render();

function renderGraph(graphString) {
  let graph;
  try {
    graph = graphlibDot.read(graphString);
  } catch (e) {
    console.log('Failed to parse graph...')
    throw e;
  }

  // Render the graph into svg g
  d3.select("svg g").call(render, graph);

  // Zoom and translate to center
  let graphWidth = graph.graph().width;
  let graphHeight = graph.graph().height;
  let zoomScale = Math.min(width / graphWidth, height / graphHeight);
  let translate = [(width/2) - ((graphWidth * zoomScale)/2), 0];
  zoom.translate(translate);
  zoom.scale(zoomScale);
  zoom.event(inner);

  return graph;
}

function createAncestryGraphStringFor(id) {
  let parentsOnly = false;
  if (descendantsCountExceeds(data, id, 1000)) {
    console.log("the graph is too big!");
    parentsOnly = true;
  }

  let edgeStrings = edgeListToStrings(ancestryGraph(data, id, parentsOnly));
  let graphString = "digraph { ";

  graphString = graphString + "\n \"" + data[id].name + "\" [style=\"fill: #66ff66; font-weight: bold\"];\n";

  for (let edge of edgeStrings) {
    graphString = graphString + " " + edge + "\n";
  }
  graphString = graphString + "}\n";

  return graphString;
}

function createAncestryGraphFor(id) {
  return renderGraph(createAncestryGraphStringFor(id));
}

function createCommonAncestryGraphFor(id1, id2) {
  let graph = commonAncestryGraph(data, id1, id2);
  setOrClearErrorField("No common ancestors!", graph);

  if (!graph) {
    return;
  }

  let edgeStrings = edgeListToStrings(graph);
  let graphString = "digraph { ";

  graphString = graphString + " \"" + data[id1].name + "\" [style=\"fill: #66ff66; font-weight: bold\"];";
  graphString = graphString + " \"" + data[id2].name + "\" [style=\"fill: #6666ff; font-weight: bold\"];";

  for (let edge of edgeStrings) {
    graphString = graphString + " " + edge + " ";
  }
  graphString = graphString + "}";

  return renderGraph(graphString);
}

function setOrClearErrorField(text, condition) {
  if (condition) {
    d3.select("#name_not_found").style('display', 'none');
  } else {
    d3.select("#name_not_found").style('display', 'block').text(text);
  }
}

function getIdFromSearch(textInputId) {
  let name = d3.select(textInputId).property("value").trim();
  let id = nameToId[name];
  setOrClearErrorField("Name '" + name + "' not found.", id);
  return id;
}


function renderAncestryGraphFromSearch() {
  let id = getIdFromSearch('#single_name_input');
  if (id) {
    createAncestryGraphFor(id);
  }
}

function renderCommonAncestryGraphFromSearch() {
  let id1 = getIdFromSearch('#common_ancestor_input1');
  let id2 = getIdFromSearch('#common_ancestor_input2');
  if (id1 && id2) {
    createCommonAncestryGraphFor(id1, id2);
  }
}

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

function downloadDotFile() {
  let id = getIdFromSearch('#single_name_input');
  if (id) {
    download('ancestry_graph.dot', createAncestryGraphStringFor(id));
  }
}

d3.select("#single_name_input").on("keyup", () => suggest("#single_name_input", "#single_name_autocomplete_results"));
d3.select('#ancestry_button').on('click', renderAncestryGraphFromSearch);

d3.select("#common_ancestor_input1").on("keyup", () => suggest("#common_ancestor_input1", "#common_ancestor_autocomplete_results"));
d3.select("#common_ancestor_input2").on("keyup", () => suggest("#common_ancestor_input2", "#common_ancestor_autocomplete_results"));
d3.select('#common_ancestry_button').on('click', renderCommonAncestryGraphFromSearch);

d3.select('#autocomplete_results').style('display', 'none');
d3.select('#loading').style('display', 'block');
d3.select('#hide_while_loading').style('display', 'none');

d3.select('#download').on('click', downloadDotFile);
