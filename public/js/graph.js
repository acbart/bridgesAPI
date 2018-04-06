//based loosely on bostock's example and
//http://bl.ocks.org/d3noob/5141278
d3.graph = function(svg, W, H, data) {

     //defaults
    var graph = {},
        mw = 0, mh = 0,
        w = W || 1280,
        h = H || 800,
        i = 0,
        vis,
        svgGroup,
        defs,
        finalTranslate,
        finalScale,
        transform;

    var zoom = d3.zoom()
        .scaleExtent([0.1,10])
        .on("zoom", zoomed);

    graph.reset = function() {

      if(!data.coord_system_type || data.coord_system_type == "Cartesian") {
        finalTranslate = BridgesVisualizer.defaultTransforms.graph.translate;
        finalScale = BridgesVisualizer.defaultTransforms.graph.scale;
        transform = d3.zoomIdentity.translate(finalTranslate[0], finalTranslate[1]).scale(finalScale);
      } else {
        finalTranslate = BridgesVisualizer.defaultTransforms[data.coord_system_type].translate;
        finalScale = BridgesVisualizer.defaultTransforms[data.coord_system_type].scale;
        transform = d3.zoomIdentity.translate(finalTranslate[0], finalTranslate[1]).scale(finalScale);
      }
      svg.call(zoom.transform, transform);
    };
    graph.reset();

    vis = svg.attr("width", w)
            .attr("height", h)
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + w + " " + h)
            .classed("svg-content", true)
            .call(zoom)
            .call(zoom.transform, transform);

    svgGroup = vis.append("g").attr('transform', transform);

    var nodes = data.nodes;
    var links = data.links;

  var simulation = d3.forceSimulation()
      .force("link", d3.forceLink()
                        .id(function(d) { return d.index; })
                        .distance(200))
      .force("charge", d3.forceManyBody()
                        .strength(function(d) {
                          return -30 - (d.size * 5) ;
                        })
                        .distanceMax(500))
      .force("collision", d3.forceCollide()
                        .radius(function(d) {
                          return d.size || 10;
                        }))
      .force("center", d3.forceCenter(BridgesVisualizer.visCenter()[0], BridgesVisualizer.visCenter()[1]));

  simulation.nodes(nodes).on("tick", ticked);
  simulation.force("link").links(links);

  // Add marker defs to the svg element
  BridgesVisualizer.addMarkerDefs(vis);

  //outer node
  var node = svgGroup.selectAll(".node")
      .data(nodes)
      .enter().append("g")
      .on("mouseover", function(d) {BridgesVisualizer.textMouseover(d.name); } )
      .on("mouseout", BridgesVisualizer.textMouseout)
      .on("dblclick", dblclick)
      .call(d3.drag()
       .on("start", dragstart)
       .on("drag", dragged)
       .on("end", dragended))
      .style("stroke", "black")
      .style("stroke-width", "1")
      .style("stroke-dasharray", function(d) {
          return d.fixed ? BridgesVisualizer.treeDashArray : "0,0";
      });

  //inner nodes
  node
      .append('path')
      .attr("class", "node")
      .attr("d", d3.symbol()
          .type(function(d) { return BridgesVisualizer.shapeLookup(d.shape); })
          .size(function(d) { return BridgesVisualizer.scaleSize(d.size) || 1; })
      )
      .style("fill", function(d, i) {
          return BridgesVisualizer.getColor(d.color) || "steelblue";
      })
      .style("opacity", function(d) {
          return d.opacity || 1;
      })
      .each(function(d, i) {
        if(d.fx && d.fx === 0) {
          d.fx = null;
        }
        if(d.fy && d.fy === 0) {
          d.fy = null;
        }

        if(d.location) {
          var proj, point;

          if(data.coord_system_type == "equirectangular") {
            proj = d3.geoEquirectangular();
          } else if(data.coord_system_type == "albersUsa") {
            proj = d3.geoAlbersUsa();
          } else if(data.coord_system_type == "Cartesian"){
            d.fx = d.location[0];
            d.fy = d.location[1];
            return;
          } else {
            d.fx = null;
            d.fy = null;
            return;
          }

          point = proj([d.location[1], d.location[0]]);

          // make sure the transformed location exists
          if(point) {
            d.fx = point[0];
            d.fy = point[1];
          } else {  // default location for bad transform
            d.fx = 0;
            d.fy = 0;
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

  var linkG = svgGroup.selectAll(".link")
      .data(links.reverse())  // reverse to draw end markers over links
      .enter().append("svg:g");
  linkG
      .insert("svg:path")
        .attr("class", "link")
        .attr("id", function(d,i) { return "linkId_" + i; })
        .attr("marker-end", "url(#marker_arrow)")
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
        .on("mouseover", function(d) {BridgesVisualizer.textMouseover("weight: " + d.weight); } )
        .on("mouseout", BridgesVisualizer.textMouseout);

  // append link weight labels
  linkG.append("svg:text")
    .append("textPath")
      .classed("linkLabel", true)
      .attr("xlink:href",function(d,i) { return "#linkId_" + i;})
      .style("display", function() {
        return !BridgesVisualizer.tooltipEnabled ? "block" : "none";
      })
      .text(function(d,i) { return d.weight || ""; });


  function ticked() {
      node
        .attr("transform", function(d, i) {
          return "translate(" + d.x + "," + d.y + ")";
        });

      linkG.selectAll("path")
          .each(function(d) {

          })
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

      // adjust the weight label positioning along links
      linkG.selectAll("text")
        .attr("dx", function(d) {
          var xdiff = Math.abs((d.source.x - d.target.x)/2);
          var ydiff = Math.abs((d.source.y - d.target.y)/2);
          return (xdiff>ydiff) ? xdiff : ydiff;
        });
  }

  // zoom function
  function zoomed() {
    if(svgGroup) {
      svgGroup.attr("transform", d3.event.transform);
    }
  }

  // Handle doubleclick on node path (shape)
  function dblclick(d) {
      d3.event.stopImmediatePropagation();
      d.x = d.fx;
      d.y = d.fy;
      d.fy = null;
      d.fx = null;
      d3.select(this)
        .style("stroke-dasharray", "0,0")
        .classed("fixed", d.fixed = false);
  }

  // Handle dragstart on force.drag()
  function dragstart(d) {
      d3.select(this)
        .style("stroke-width", 1)
        .style("stroke", "black")
        .style("stroke-dasharray", BridgesVisualizer.treeDashArray);

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
  }

  return graph;
};
