map = function(data) {
  data = data ? data : null;

  var width = d3.select("#mapContainer").style("width").substr(0, d3.select("#mapContainer").style("width").indexOf('p')) - 20,
      height = d3.select("#mapContainer").style("width").substr(0, d3.select("#mapContainer").style("height").indexOf('p')),
      scale0 = (width - 1) / 2 / Math.PI;

  var projection = d3.geo.mercator()
    .translate([width / 2, height / 2])
    .scale((width - 1) / 2 / Math.PI);

  var zoom = d3.behavior.zoom()
      .scaleExtent([1, 8])
      .on("zoom", zoomed);

  var path = d3.geo.path()
      .projection(projection);

  var graticule = d3.geo.graticule();

  var svg = d3.select("#mapContainer").append("svg")
      .attr("id", "mapSVG")
      .attr("width", width)
      .attr("height", height)
      .append("g");

  var g = svg.append("g");

  svg.append("rect")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height);

  d3.json("/geoJSON/world-50m.json", function(error, world) {
    if (error) throw error;

    g.insert("path", ".graticule")
          .datum(topojson.feature(world, world.objects.land))
          .attr("class", "land")
          .attr("d", path);

    g.insert("path", ".graticule")
          .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
          .attr("class", "boundary")
          .attr("d", path);
  });

  /* bind data to map */
  var dataLayer = d3.select("#mapSVG")
      .attr("width", width)
      .attr("height", height)
      .attr("id", "mapLayer")
      .append("g");

console.log(data);
  dataLayer.selectAll(".loc")
      .data(data.nodes)
        .enter().append("svg:circle")
        .attr("r", 1)
        .style("fill", "red")
        .style("stroke", "yellow")
        .classed("loc", true)
        .attr("transform", function( d ) { return "translate(" + projection([-75,43]) + ")"; } )
        .on('mouseover', function(d, i) {  } );



  svg
      .call(zoom)
      .call(zoom.event);


  function zoomed() {
    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    dataLayer.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  }



  d3.select(self.frameElement).style("height", height + "px");

};
