// Various accessors that specify the four dimensions of data to visualize.
//function x(d) { return d.growth; }
function x(d) { return d.gdp; }
function y(d) { return d.epc; }
function radius(d) { return d.population; }
//function color(d) { return d.region; }
function color(d) { return d.name; }
function key(d) { return d.name; }

// Chart dimensions.
var margin = {top: 19.5, right: 30.5, bottom: 65.5, left: 75.5},
    width = 960 - margin.right,
    height =500 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
var xScale = d3.scale.linear().domain([100, 120000]).range([0, width]),
    yScale = d3.scale.linear().domain([0, 30000]).range([height, 0]),
    radiusScale = d3.scale.sqrt().domain([0, 4e8]).range([0, 40]),
    //colorScale = d3.scale.category20();
    colorScale = d3.scale.ordinal().domain(["1", "2", "3", "4", "5", "6"]).range(["#ffeda0", "#feb24c", "#f03b20", "#9ecae1", "#3182bd", "#61FF33" ]);

// The x & y axes.
var xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(6, d3.format(",d")),
    yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(10, d3.format(",d"));

// Create the SVG container and set the origin.
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var div = d3.select("#chart").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

// Add an x-axis label.
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    //.text("income per capita, inflation-adjusted (dollars)");
    .text("GDP per capita (USD)");

// Add a y-axis label.
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    //.text("life expectancy (years)");
    .text("Electric Power Consumption (kWh per capita)");

// Add the year label; the value is set on transition.
var label = svg.append("text")
    .attr("class", "year label")
    .attr("text-anchor", "end")
    .attr("y", height - 25)
    .attr("x", width - 35)
    //.text(1800);
    .text(1981);

// Load the data.
d3.json("nations.json", function(nations) {
//d3.csv("co2emissions.csv", function(d) {
  // A bisector since many nation's data is sparsely-defined.
  var bisect = d3.bisector(function(d) { return d[0]; });

  // Add a dot per nation. Initialize the data at 1981, and set the colors.
  var dot = svg.append("g")
      .attr("class", "dots")
      .selectAll(".dot")
      .data(interpolateData(1981))
      .enter().append("circle")
      .attr("class", "dot")
      .style("fill", function(d) { return colorScale(color(d)); })
      .on("mouseover", function(d){
        div.transition()
            .duration(275)
            .style("opacity", .9);
        div.html(d["name"] + "<br>" + "<br>"
                + "Population: " + Math.round(d["population"]) + "<br>" + "<br>"
                + "EPC: " + Math.round(d["epc"]) + " kWh per capita" + "<br>" + "<br>"
                + "GDP: " + Math.round(d["gdp"]) + " USD"
                )
            .style("left", (d3.event.pageX + 5) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        
      })
      .on("mouseout", function(d) {
          div.transition()
               .duration(300)
               .style("opacity", 0);
      })
      .call(position)
      .sort(order);

  // Add an overlay for the year label.
  var box = label.node().getBBox();

  var overlay = svg.append("rect")
        .attr("class", "overlay")
        .attr("x", box.x)
        .attr("y", box.y)
        .attr("width", box.width)
        .attr("height", box.height)
        .on("mouseover", enableInteraction);

  // Start a transition that interpolates the data based on year.
  /*svg.transition()
      .duration(30000)
      .ease("linear")
      .tween("year", tweenYear)
      .each("end", enableInteraction);*/
    

  // Positions the dots based on data.
  function position(dot) {
    dot .attr("cx", function(d) { return xScale(x(d)); })
        .attr("cy", function(d) { return yScale(y(d)); })
        .attr("r", function(d) { return radiusScale(radius(d)); });
  }

  // Defines a sort order so that the smallest dots are drawn on top.
  function order(a, b) {
    return radius(b) - radius(a);
  }

  // After the transition finishes, you can mouseover to change the year.
  function enableInteraction() {
    var yearScale = d3.scale.linear()
        .domain([1981, 2011])
        .range([box.x + 10, box.x + box.width - 10])
        .clamp(true);

    // Cancel the current transition, if any.
    svg.transition().duration(0);

    overlay
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .on("mousemove", mousemove)
        .on("touchmove", mousemove);

    function mouseover() {
      label.classed("active", true);
    }

    function mouseout() {
      label.classed("active", false);
    }

    function mousemove() {
      displayYear(yearScale.invert(d3.mouse(this)[0]));
    }
  }

  // Tweens the entire chart by first tweening the year, and then the data.
  // For the interpolated data, the dots and label are redrawn.
  function tweenYear() {
    var year = d3.interpolateNumber(1981, 2009);
    return function(t) { displayYear(year(t)); };
  }

  // Updates the display to show the specified year.
  function displayYear(year) {
    dot.data(interpolateData(year), key).call(position).sort(order);
    label.text(Math.round(year));
  }

  // Interpolates the dataset for the given (fractional) year.
  function interpolateData(year) {
    return nations.map(function(d) {
      return {
        name: d.name,
        //region: d.region,
        //growth: interpolateValues(d.growth, year),
          gdp: interpolateValues(d.gdp, year),
        population: interpolateValues(d.population, year),
        epc: interpolateValues(d.epc, year)
      };
    });
  }

  // Finds (and possibly interpolates) the value for the specified year.
  function interpolateValues(values, year) {
    var i = bisect.left(values, year, 0, values.length - 1),
        a = values[i];
    if (i > 0) {
      var b = values[i - 1],
          t = (year - a[0]) / (b[0] - a[0]);
      return a[1] * (1 - t) + b[1] * t;
    }
    return a[1];
  }
});





// ** Update data section (Called from the onclick)
function updateData1() {

    // Get the data again
    d3.json("nations.json", function(nations) {
       	nations.forEach(function(d) {
	    	//d.growth = d.growth;
            d.gdp = d.gdp;
	    	d.epc = +d.epc;
	    });

    	// Scale the range of the data again 
    	x.domain(d3.extent(nations, function(d) { return d.gdp; }));
        //x.domain(d3.extent(data, function(d) { return d.gdp; }));
	    y.domain([0, d3.max(nations, function(d) { return d.epc; })]);

    // Select the section we want to apply our changes to
    var svg = d3.select("body").transition();

    // Make the changes
        svg.select(".dot")   // change the dots
            .duration(750)
            .attr("d", valueline(nations));
        svg.select(".x.axis") // change the x axis
            .duration(750)
            .call(xAxis);
        svg.select(".yaxis") // change the y axis
            .duration(750)
            .call(yAxis);

    });
}
function updateData2() {

    // Get the data again
    d3.json("nations.json", function(nations) {
       	nations.forEach(function(d) {
	    	d.gdp = d.gdp;
	    	d.fossil = +d.fossil;
	    });

    	// Scale the range of the data again 
    	x.domain(d3.extent(nations, function(d) { return d.gdp; }));
	    y.domain([0, d3.max(nations, function(d) { return d.fossil; })]);

    // Select the section we want to apply our changes to
    var svg = d3.select("body").transition();

    // Make the changes
        svg.select(".dot")   // change the dots
            .duration(750)
            .attr("d", valueline(nations));
        svg.select(".x.axis") // change the x axis
            .duration(750)
            .call(xAxis);
        svg.select(".y.axis") // change the y axis
            .duration(750)
            .call(yAxis);

    });
}
function updateData3() {

    // Get the data again
    d3.json("nations.json", function(error, nations) {
       	nations.forEach(function(d) {
	    	d.gdp = d.gdp;
	    	d.emissions = +d.emissions;
	    });

    	// Scale the range of the data again 
    	x.domain(d3.extent(nations, function(d) { return d.gdp; }));
	    y.domain([0, d3.max(nations, function(d) { return d.emissions; })]);

    // Select the section we want to apply our changes to
    var svg = d3.select("body").transition();

    // Make the changes
        svg.select(".dot")   // change the dots
            .duration(750)
            .attr("d", valueline(nations));
        svg.select(".x.axis") // change the x axis
            .duration(750)
            .call(xAxis);
        svg.select(".y.axis") // change the y axis
            .duration(750)
            .call(yAxis);

    });
}
     // draw legend colored rectangles
    svg.append("rect")
        .attr("x", width-300)
        //.attr("y", height-230)
        .attr("y", height-400)
        .attr("width", 220)
        .attr("height", 150)
        .attr("fill", "lightgrey")
        .style("stroke-size", "1px");

    svg.append("circle")
        .attr("r", 10)
        .attr("cx", width-100)
        //.attr("cy", height-215)
        .attr("cy", height-390)
        .style("fill", "#ffeda0");
    
    svg.append("circle")
        .attr("r", 10)
        .attr("cx", width-100)
        //.attr("cy", height-190)
        .attr("cy", height-365)
        .style("fill", "#feb24c");

    svg.append("circle")
        .attr("r", 10)
        .attr("cx", width-100)
        //.attr("cy", height-120)
        .attr("cy", height-340)
        .style("fill", "#f03b20");

    svg.append("circle")
        .attr("r", 10)
        .attr("cx", width-100)
        //.attr("cy", height-120)
        .attr("cy", height-315)
        .style("fill", "#9ecae1");

    svg.append("circle")
        .attr("r", 10)
        .attr("cx", width-100)
        //.attr("cy", height-120)
        .attr("cy", height-290)
        .style("fill", "#3182bd");

    svg.append("circle")
        .attr("r", 10)
        .attr("cx", width-100)
        //.attr("cy", height-120)
        .attr("cy", height-265)
        .style("fill", "#61FF33");

    svg.append("text")
        .attr("class", "label")
        .attr("x", width -150)
        //.attr("y", height-212)
        .attr("y", height-385)
        .style("text-anchor", "end")
        .text("Australia");

    svg.append("text")
        .attr("class", "label")
        .attr("x", width -150)
        //.attr("y", height-187)
        .attr("y", height-360)
        .style("text-anchor", "end")
        .text("Europe");

    svg.append("text")
        .attr("class", "label")
        .attr("x", width -150)
        //.attr("y", height-117)
        .attr("y", height-335)
        .style("text-anchor", "end")
        .text("Asia");

    svg.append("text")
        .attr("class", "label")
        .attr("x", width -150)
        //.attr("y", height-117)
        .attr("y", height-310)
        .style("text-anchor", "end")
        .text("Africa");

    svg.append("text")
        .attr("class", "label")
        .attr("x", width -150)
        //.attr("y", height-117)
        .attr("y", height-285)
        .style("text-anchor", "end")
        .text("North America");

    svg.append("text")
        .attr("class", "label")
        .attr("x", width -150)
        //.attr("y", height-117)
        .attr("y", height-260)
        .style("text-anchor", "end")
        .text("South America");

//legend for population size
     // draw legend colored rectangles
    svg.append("rect")
        .attr("x", 25)
        //.attr("y", height-230)
        .attr("y", 10)
        .attr("width", 260)
        .attr("height", 175)
        .attr("fill", "lightgrey")
        .style("stroke-size", "1px");

    svg.append("circle")
        .attr("r", 5)
        .attr("cx", 225)
        //.attr("cy", height-215)
        .attr("cy", 175)
        .style("fill", "white");
    
    svg.append("circle")
        .attr("r", 15.8)
        .attr("cx", 225)
        //.attr("cy", height-190)
        .attr("cy", 150)
        .style("fill", "white");

    svg.append("circle")
        .attr("r", 50)
        .attr("cx", 225)
        //.attr("cy", height-120)
        .attr("cy", 80)
        .style("fill", "white");

    svg.append("text")
        .attr("class", "label")
        .attr("x", 160)
        //.attr("y", height-212)
        .attr("y", 170)
        .style("text-anchor", "end")
        .text("6 Million People");

    svg.append("text")
        .attr("class", "label")
        .attr("x", 160)
        //.attr("y", height-187)
        .attr("y", 147)
        .style("text-anchor", "end")
        .text("60 Million People");

    svg.append("text")
        .attr("class", "label")
        .attr("x", 160)
        //.attr("y", height-117)
        .attr("y", 77)
        .style("text-anchor", "end")
        .text("600 Million People");