
function shortestPath(graph, source, target) {
  // DFS to find shortest path
  // Return a list of edges from source -> target
  if (source == target) {
    return [];  // interpreted as truthy
  }

  if (graph[source]) {
    for (let child of graph[source]['out']) {
      let foundEdges = shortestPath(graph, child, target);
      if (foundEdges) {  // empty list interpreted as truthy
        foundEdges.unshift([source, child]);  // push new edge to front
        return foundEdges;
      }
    }
  }

  // returns undefined if at a leaf or target is not found
  // in any subtree of source
}


function closestAncestor(graph, id1, id2) {
  // perform a simultaneous BFS from each child node
  // until an ancestor is found; return undefined if no ancetor found
  let unprocessed1 = [id1];
  let unprocessed2 = [id2];
  let processed1 = new Set([]);
  let processed2 = new Set([]);

  function handle(unprocessed, myProcessed, otherProcessed) {
    // one step of the BFS
    if (unprocessed.length > 0) {
      let next = unprocessed.shift();
      if (otherProcessed.has(next)) {
        return next;
      }
      myProcessed.add(next);
      let parents = graph[next]['in'];

      for (let parentId of parents) {
        if (otherProcessed.has(parentId)) {
          return parentId;
        } else {
          unprocessed.push(parentId);
        }
      }
    }
  }

  while (unprocessed1.length > 0 || unprocessed2.length > 0) {
    // interleave the BFS from each child, stopping if a common parent is found
    let possibleParent = handle(unprocessed1, processed1, processed2);
    if (possibleParent) {
      return possibleParent;  // it's a definite parent
    }

    possibleParent = handle(unprocessed2, processed2, processed1);
    if (possibleParent) {
      return possibleParent;  // it's a definite parent
    }
  }

  // no common ancestors!
}


function commonAncestryGraph(graph, id1, id2) {
  let ancestor = closestAncestor(graph, id1, id2);
  if (!ancestor) {
    console.log('No ancestors found for ' + id1 + ' ' + id2);
    return null;
  } else {
    console.log('Closest ancestor is ' + graph[ancestor].name + ' with id ' + ancestor);
  }

  let edges1 = shortestPath(graph, ancestor, id1);
  let edges2 = shortestPath(graph, ancestor, id2);
  let union = [];
  for (let x of edges1) {
    union.push(x);
  }
  for (let x of edges2) {
    union.push(x);
  }

  return union;
}


function ancestryGraph(graph, id, parentsOnly=false) {
  // Construct the graph of ancestors of the given node
  // Output is a Set of edges
  let edgeSubset = new Set([]);
  let unprocessedAncestors = [id];
  let processed = new Set([]);

  while (unprocessedAncestors.length > 0) {
    let next = unprocessedAncestors.pop();
    processed.add(next);  // Ignore any self loops, which would be odd
    let parents = graph[next]['in'];

    for (let parentId of parents) {
      edgeSubset.add([parentId, next]);
      if (!processed.has(parentId)) {
        unprocessedAncestors.push(parentId);
      }
    }
  }

  if (!parentsOnly) {
    let unprocessedDescendants = [id];
    while (unprocessedDescendants.length > 0) {
      let next = unprocessedDescendants.pop();
      processed.add(next);  // Ignore any self loops, which would be odd
      let children = graph[next]['out'];

      for (let childId of children) {
        edgeSubset.add([next, childId]);
        if (!processed.has(childId)) {
          unprocessedDescendants.push(childId);
        }
      }
    }
  }

  return edgeSubset;
}


module.exports = {
  shortestPath,
  closestAncestor,
  commonAncestryGraph,
  ancestryGraph,
};
