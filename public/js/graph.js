//based loosely on bostock's example and
//http://bl.ocks.org/d3noob/5141278
d3.graph = function(d3, id, W, H, data) {

     //defaults
    var graph = {},
        //mw = 20, mh = 50,
        mw = 0, mh = 0,
        w = W || 1280,
        h = H || 800,
        i = 0,
        canvasID = id; //canvasID must have hash like "#vis" or "#canvas"
    var visID = canvasID.substr(4);
    var vis, svgGroup, defs;
    var count = 0;
    var finalTranslate = BridgesVisualizer.defaultTransforms.graph.translate;
    var finalScale = BridgesVisualizer.defaultTransforms.graph.scale;

    var nodes = data.nodes;
    var links = data.links;

  // var transformObject = BridgesVisualizer.getTransformObjectFromCookie(visID);
  // if(transformObject){
  //     finalTranslate = transformObject.translate;
  //     finalScale = transformObject.scale;
  // }

  for (i in links) {
     if (count<links[i].value) count = links[i].value;
  }

  var force = d3.layout.force()
      .charge([-1000])
      .linkDistance([100])
      .linkStrength(0.5)
      .size([width, height])
      .nodes(nodes)
      .links(links);
      // .start();

  var drag = force.drag();
  drag.on("dragstart",dragstart);

  var zoom = d3.behavior.zoom()
          .translate(finalTranslate)
          .scale(finalScale)
          .scaleExtent([0.1,5])
          .on("zoom", zoomHandler);
      allZoom.push(zoom);

  var defaultColors = d3.scale.category20(); //10 or 20

  vis = d3.select(canvasID).append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("id", "svg" + canvasID.substr(4))
      .call(zoom);

  svgGroup = vis.append("g");
      // initialize the scale and translation
      svgGroup.attr('transform', 'translate(' + zoom.translate() + ') scale(' + zoom.scale() + ')');
      allSVG.push(svgGroup);

  // http://stackoverflow.com/questions/27802669/how-do-i-change-the-colour-of-markers-arrow-heads-solved
  vis.append("svg:defs").selectAll("marker")
      .data(["end"])// Different path types defined here
      .enter().append("svg:marker")
      .attr("id", String)
      .attr("viewBox", "0 0 15 15")
      .attr("refX", 15) // increase this to move the pointer back along the line
      .attr("refY", 5)
      .attr("markerUnits", "userSpaceOnUse")
      .style("fill", function (d) {
          return BridgesVisualizer.getColor(d.color) || "black";
      })
      .style("opacity", function(d) {
          return d.opacity || 1;
      })
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z");


  //outer node
  var node = svgGroup.selectAll(".node")
      .data(nodes)
      .enter().append("g")
      .on("mouseover", BridgesVisualizer.textMouseover)
      .on("mouseout", BridgesVisualizer.textMouseout)
      .on("dblclick", dblclick)

      .style("stroke", "black")
      .style("stroke-width", "1")
      .style("stroke-dasharray", function(d) {
          return d.fixed ? BridgesVisualizer.treeDashArray : "0,0";
      })
      .call(force.drag);

  //inner nodes
  node
      .append('path')
      .attr("class", "node")
      .attr("d", d3.svg.symbol()
          .type(function(d) { return d.shape || "circle"; })
          .size(function(d) {return BridgesVisualizer.scaleSize(d.size || 1); })
      )
      .style("fill", function(d, i) {
          return BridgesVisualizer.getColor(d.color) || defaultColors(i);
      })
      .style("opacity", function(d) {
          return d.opacity || 1;
      })
      .each(function(d, i) {
        if(d.location) {
          d.fixed = true;

          // apply relevant transformations to location attributes
          if(d3.geo[data.coord_system_type]) { // d3 projection
            var proj = d3.geo[data.coord_system_type]();
            var point = proj([d.location[1], d.location[0]]);

            // make sure the transformed location exists
            if(point) {
              d.x = point[0];
              d.y = point[1];
            } else {  // default location for bad transform
              d.x = 0;
              d.y = 0;
            }
          } else {  // cartesian space
            d.x = d.location[0];
            d.y = -1 * d.location[1];
          }
        }
      });

  //inner nodes
  node
      .append("text")
      .attr("class","nodeLabel")
      .attr("x", BridgesVisualizer.textOffsets.graph.x + 2)
      .attr("y",  BridgesVisualizer.textOffsets.graph.y + 14)
      .style("color",'black')
      .style("pointer-events", "none")
      .style("opacity", 0.0)
      .text(function(d) {
          return d.name;
      });

  var link = svgGroup.append("svg:g").selectAll("path")
      .data(links.reverse())  // reverse to draw end markers over links
      .enter().insert("svg:path")
      .attr("class", "link")
      .attr("marker-end", "url(#end)")
      // .attr("marker-end", function(d) {  // modify this for programmatic arrow points
      //   return BridgesVisualizer.marker(vis, (BridgesVisualizer.getColor(d.color) || "black"), {});
      // })
      .style("stroke-width", function (d) {
          return BridgesVisualizer.strokeWidthRange(d.thickness) || 1;
      })
      .style("stroke", function (d) {
          return BridgesVisualizer.getColor(d.color) || "black";
      })
      .style("opacity", function(d) {
          return d.opacity || 1;
      })
      .style("stroke-dasharray", function(d) {
          return d.dasharray || "";
      })
      .style("fill", "none")
      .style("pointer-events", "none");

  svgGroup.selectAll('text').each(BridgesVisualizer.insertLinebreaks);

  force.on("tick", function() {
      node
        .attr("transform", function(d, i) {
          return "translate(" + d.x + "," + d.y + ")";
        });

      link
          .attr("d", function(d) {
              var dx = d.target.x - d.source.x,
                  dy = d.target.y - d.source.y,
                  dr = Math.sqrt(dx * dx + dy * dy);
              return "M" +
                  d.source.x + "," +
                  d.source.y + "A" +
                  dr + "," + dr + " 0 0,1 " +
                  d.target.x + "," +
                  d.target.y;
          });
  });

  // zoom function
  function zoomHandler() {
      svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  }

  // Handle doubleclick on node path (shape)
  function dblclick(d) {
      d3.event.stopImmediatePropagation();
      d3.select(this)
        .style("stroke-dasharray", "0,0")
        .classed("fixed", d.fixed = false);
  }

  // Handle dragstart on force.drag()
  function dragstart(d) {
      d3.event.sourceEvent.stopPropagation();
      d3.select(this)
        .style("stroke-width", 1)
        .style("stroke", "black")
        .style("stroke-dasharray", BridgesVisualizer.treeDashArray)
        .classed("fixed", d.fixed = true);

      force.start();
  }

  force.start();
};
