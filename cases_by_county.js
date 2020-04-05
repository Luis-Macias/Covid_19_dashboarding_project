// sanity checking 
'use strict';
console.log("hello world")
// import { scrubber } from './modules/scrubber.js';


// defining our margins 
const margin = {
    top: 30,
    right: 30,
    bottom: 30,
    left: 10
};

// creating our width and height from the svg 
const width = 960 - margin.left - margin.right;
const height = 610 - margin.top - margin.bottom;

// giving our dashboard a header
var h1 = d3.select('body')
    .append('h1')
    .text("U.S COVID-19 Positive Cases by County")

// creating a porjection function that takes coordinates and projects them on a 2d plane in this case its of the us states 
var projection = d3.geoAlbersUsa()
// .scale([1100]) // scale things down so see entire US
// .translate([width / 2, height / 2]) // translate to center of screen

// making a transition function 
var t = d3.transition().duration(250).ease(d3.easeLinear)

// Define path generator
var path = d3.geoPath()
    .projection(projection);
// .scale(1000);

// creating our svg view that will we draw on 
var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style('border', '1px solid black');

// var container_2 = svg.append('g')
//     .attr("width", width / 2)
//     .attr("height", height / 2)
//     .attr("transform", `translate(${width + margin.right} ,${height + margin.top}) `)
//     .style('border', '1px solid black');


var form_container = d3.select('body')
    .append('div');

var tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');
// creating our radius scale 
var radius_pos = d3.scaleSqrt().range([0, 50]);

// creating a function to parse the string of dates to convert to Date objects
let time_parse = d3.timeParse("%Y-%m-%d");

// loading in TOPOJSON data data taken from https://github.com/topojson/us-atlas
let county_topo = d3.json('data/counties-10m.json');

// making a Promise that holds a Map of 50 U.S states + D.C to cartographic boundaries 
let state_map = county_topo.then(us => new Map(
    topojson.feature(us, us.objects.states).features.filter(function(d, i) {
        // ids above 56 are several US territories like Guam , and Puetro Rico
        return !(d.id > 56);
    }).map(d => [d.properties.name, d])));


// like the state map except for  U.S counties 
let county_map = county_topo.then(us => new Map(
    topojson.feature(us, us.objects.counties).features.map(d => [d.id, d])));


// loading our covid data that we preprocessed before
// note we can also use the url https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv to load in the data
let get_clean_data = async () => {
    // we await for the state_map to complete as we use it for filtering u.s terroritories
    var mappings = await state_map;

    var data = d3.csv('./data/us_counties.csv', function(d) {
        // our preprocssed data should have include NYC's fips code but we leave this in in case of data being obtained from the url
        if (d['county'] === 'New York City') {
            d['fips'] = '36061'
        }
        return d;
    }).then(function(data) {
        // reshaping our data into an array of nested objects 
        // keys are dates and values contain county names,  state name,  fips code, # of positive cases , # of deaths 
        // 
        return d3.nest()
            .key(function(d) {
                return d.date
            })
            .sortKeys(d3.ascending) // sort keys so march first is index 0 and our recent date is index data.length -1 
            .entries(
                data.filter(
                    d => time_parse(d.date).getTime() >= time_parse('2020-03-01').getTime()
                )
                .filter(d => mappings.has(d.state))
            )


    })
    return data
}

let covid_by_county = get_clean_data();

// max cases is a promise that when resolved should update the domain of our radius scale
let max_cases = covid_by_county.then(d => d[d.length - 1])
    .then(d => d3.max(d.values.map(d => +d['cases'])))
    .then(d => radius_pos.domain([0, d]));


function chart() {
    // the chart relies on the below 4 promises to be created hence the need for Promise.all([])
    Promise.all([covid_by_county, max_cases, county_topo, county_map, state_map])
        .then(function(data) {
            // console log our promises for debugging/ sanity checking
            // console.log(data)
            var covid_cases = data[0]

            // creating nation borders !
            svg.append('path')
                .datum(topojson.feature(data[2], data[2].objects.nation))
                .attr('d', path)
                .attr('class', 'nation')
                .style('fill', "#ccc")

            // creating state borders
            // mesh is used to only draw interal state borders  
            svg.append('path')
                .datum(topojson.mesh(data[2], data[2].objects.states, function(a, b) {
                    return a !== b;
                }))
                .attr("class", "border ")
                .attr('d', path)


            // creates county centroids
            var circles = svg.append("g")
                .attr("class", "bubble")
                .selectAll("circle")
                .data(covid_cases[0].values.sort(function(a, b) {
                    return +b.cases - +a.cases
                }))
                .enter()
                .append("circle")
            // used for debugging 
            // console.log(circles)

            circles.attr("transform", function(d) {
                //  location tries to get geographic info based on data's county fips code if not found attempt to get the state geographic info
                var location = data[3].get(d.fips) ? data[3].get(d.fips) : data[4].get(d.state)
                if (!location) {
                    // included for debugging without processing errors usually show up for data pertaining to u.s  territories
                    console.warn("No location found for: " + JSON.stringify(d))
                }

                return "translate(" + path.centroid(location) + ")";
            })
            // .attr("r", function(d) {
            //     return radius_pos(+d.cases)
            // })

            // creating state labels based on where state centroid positions would be 
            svg.append('g')
                .attr('class', 'State Legend')
                .selectAll('text')
                .data(topojson.feature(data[2], data[2].objects.states).features.filter(function(d, i) {
                    // ids above 56 are several US territories like Guam , and Puetro Rico
                    // return data should only feature the 50 u.s states + D.C
                    return !(d.id > 56)
                }))
                .enter()
                .append('text')
                .attr('dx', function(d) {
                    return path.centroid(d)[0] - 10
                })
                .attr('dy', function(d) {
                    // console.log(d)
                    return path.centroid(d)[1]
                })
                .text(function(d) {
                    return d.properties.name
                })
                .style('align', 'left')
                .style('vertical-align', 'middle')
                .style('font-size', 10);
        })
        .catch(function(error) {
            console.log(error)
        })
}
chart()

// function that updates our county bubbles based on index of array of Dates [march 1 , ... recent date in data]
async function update_chart(index) {
    update_line(index)
    // queueing up Promises need to actually update our circles
    let result = await Promise.all([covid_by_county, county_map, state_map])

    // making a variable of the selection of circles 
    let circles = svg.select('g').selectAll('circle')

    // joining our updated data and sorting based on descening case count to draw biggger bubles first and smaller bubbles on top   
    result[0][index].values
    circles
        .data(result[0][index].values.sort(function(a, b) {
            return +b.cases - +a.cases
        }), d => d.fips || d.county)
        // utilizing .jion method to specify what occurs to data being enter updateded and exited
        .join(
            enter => enter.append("circle")
            .attr("transform", function(d) {
                var location = result[1].get(d.fips) ? result[1].get(d.fips) : result[2].get(d.state)
                if (!location) {
                    console.warn("No location found for: " + JSON.stringify(d))
                }
                return "translate(" + path.centroid(location) + ")";
            })
            .attr("r", function(d) {
                return radius_pos(+d.cases)
            }),

            update => update
            .attr("transform", function(d) {
                var location = result[1].get(d.fips) ? result[1].get(d.fips) : result[2].get(d.state)
                if (!location) {
                    console.warn("No location found for: " + JSON.stringify(d))
                }
                return "translate(" + path.centroid(location) + ")";
            })
            .attr("r", function(d) {
                return radius_pos(+d.cases)
            }),

            exit => exit.attr("r", d => radius_pos(0)).call(
                exit => exit.transition(t)
                .attr("r", d => radius_pos(0)).remove()
            )

        )
        .on('mouseover', function(d) {
            tooltip.html(`${this.__data__.county}  County:  ${this.__data__.cases}  cases`)
            tooltip.style("display", "inline");
            tooltip.style("left", d3.event.pageX + 15 + "px")
            tooltip.style("top", d3.event.pageY - 30 + "px")
        })
        .on('mouseout', function(d) {
            tooltip.style('display', 'None')
        })

};


/*
scrubber function source code author: Mike Bostock, origin : https://observablehq.com/@mbostock/scrubber
scrubber function was modfied to work outside of Observable notebook 
scrubber returns a scrubber with Pause, Play , interactive control, allowing animations to be made from one start point to on end point 
*/
function scrubber(values, container, {
    format = value => value,
    delay = null,
    autoplay = true,
    loop = true,
    alternate = false,
    initial = 0
} = {}) {
    console.log(values)
    values = Array.from(values);
    // let container = document.createElement('div');
    container.html(`<form style="font: 12px var(--sans-serif); display: flex; height: 33px; align-items: center;">
    <button name=b type=button style="margin-right: 0.4em; width: 5em;"></button>
    <label style="display: flex; align-items: center;">
      <input name=i type=range min=0 max=${values.length - 1} value=${initial} step=1 style="width: 180px;">
      <output name=o style="margin-left: 0.4em;"></output>
    </label>
  </form>`)
    const form = document.querySelector('form')
    console.log(form)
    let timer = null;
    let direction = 1;

    function start() {
        form.b.textContent = "Pause";
        timer = delay === null ?
            requestAnimationFrame(tick) :
            setInterval(tick, delay);
    }

    function stop() {
        form.b.textContent = "Play";
        if (delay === null) cancelAnimationFrame(timer);
        else clearInterval(timer);
        timer = null;
    }

    function tick() {
        if (delay === null) timer = requestAnimationFrame(tick);
        if (form.i.valueAsNumber === (direction > 0 ? values.length - 1 : direction < 0 ? 0 : NaN)) {
            if (!loop) return stop();
            if (alternate) direction = -direction;
        }
        form.i.valueAsNumber = (form.i.valueAsNumber + direction + values.length) % values.length;
        form.i.dispatchEvent(new CustomEvent("input", {
            bubbles: true
        }));
    }
    form.i.oninput = event => {
        update_chart(form.i.valueAsNumber)
        if (event && event.isTrusted && timer) form.b.onclick();
        form.value = values[form.i.valueAsNumber];
        form.o.value = format(form.value, form.i.valueAsNumber, values);

    };
    form.b.onclick = () => {
        if (timer) return stop();
        direction = alternate && form.i.valueAsNumber === values.length - 1 ? -1 : 1;
        form.i.valueAsNumber = (form.i.valueAsNumber + direction) % values.length;
        form.i.dispatchEvent(new CustomEvent("input", {
            bubbles: true
        }));
        start();
    };
    form.i.oninput();
    if (autoplay) start();
    else stop();
    return form.o.value
}


// update_chart(20)

async function form_maker() {
    var dates = await covid_by_county.then(d => d.map(d => time_parse(d.key)))
    scrubber(dates, form_container, {
        delay: 750,
        autoplay: false,
        loop: false,
        format: d => d.toLocaleDateString()
    })
}
form_maker()


var cv = d3.csv('./data/us_counties.csv', function(d) {
    // our preprocssed data should have include NYC's fips code but we leave this in in case of data being obtained from the url
    if (d['county'] === 'New York City') {
        d['fips'] = '36061'
    }
    return d;
}).then(function(data) {

    return d3.nest().key(function(d) {
        return d.date
    }).rollup(function(v) {
        return {
            total_cases: d3.sum(v, function(d) { return d['cases'] }),
            total_deaths: d3.sum(v, function(d) { return d['deaths'] })
        }
    }).entries(data.filter(
        d => time_parse(d.date).getTime() >= time_parse('2020-03-01').getTime()
    ))
}).catch(error => console.log(error))


var yScale = d3.scaleLog()
    .domain([80, 276091])
    .range([height, 0])
    // .tickFormat(10, '')

var yAxis = d3.axisLeft().scale(yScale).ticks( 10,',');

var xScale = d3.scaleTime()
    .domain([time_parse('2020-03-01'), time_parse('2020-04-03')])
    .range([0, width - 40]);

var xAxis = d3.axisBottom().scale(xScale);

var line_svg_container = d3.select("body")
    .append("div")
    .attr('id', 'lineChart')
    .append('svg')
    .attr("width", (width) + margin.left + margin.right)
    .attr("height", (height) + margin.left + margin.right)

var line_chart = line_svg_container.append('g')
    .attr("transform", `translate(${margin.left+ 40}, ${margin.top -10})`);

// creating x and y axis
line_chart.append('g').attr('class', 'y-axis').call(yAxis)

line_chart.append('g').attr('class', 'x-axis')
    .attr("transform", `translate(${0}, ${height})`)
    .call(xAxis)

// drawing our line chart 

cv.then(function(data) {
    line_chart.append("path")
        .datum(data.slice(0,0))
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr('class', 'totalCases')
        .attr("d", d3.line()
            .x(function(d) { return xScale(time_parse(d.key)) })
            .y(function(d) { 
                console.log(d.value.total_cases)
                return yScale(d.value.total_cases) })
        )
})
async function update_line(index){

    var data = await cv
    var currline = line_chart.select('path')
    currline.datum(data.slice(0,index))
            .attr("d", d3.line()
            .x(function(d) { return xScale(time_parse(d.key)) })
            .y(function(d) { 
                console.log(d.value.total_cases)
                return yScale(d.value.total_cases) })
        )


}