// sanity checking 
'use strict';
console.log("hello world")
// import { scrubber } from './modules/scrubber.js';

function getLocation(d) {
    let location = countyMap.get(d.fips);
    if (!location && d.county === "New York City")
        location = countyMap.get("36061");
    if (!location) location = stateMap.get(d.state);
    if (!location) console.warn("No location found for: " + JSON.stringify(d));
    return location;
}
// defining our margins 
const margin = {
    top: 30,
    right: 30,
    bottom: 30,
    left: 20
};

// creating our width and height from the svg 
const width = 1200 - margin.left - margin.right;
const height = 610 - margin.top - margin.bottom;

// giving our dashboard a header
var h1 = d3.select('body')
    .append('h1')
    .text("U.S COVID-19 Positive Cases by County")

// creating a porjection function that takes coordinates and projects them on a 2d plane in this case its of the us states 
var projection = d3.geoAlbersUsa()
// .scale([1100]) // scale things down so see entire US
// .translate([width / 2, height / 2]) // translate to center of screen
// creating a transition 
var t = d3.transition().duration(250).ease(d3.easeLinear)

// Define path generator
var path = d3.geoPath()
    .projection(projection);
// .scale(1000);

// creating our svg element that will we draw on 
var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)

// creating our radius scale 
var radius_pos = d3.scaleSqrt().range([0, 50]);

// parsing the string of dates to convert to Date objects
let time_parse = d3.timeParse("%Y-%m-%d")

// loading in TOPOJSON data
let county_topo = d3.json('data/counties-10m.json')


let state_map = county_topo.then(us => new Map(
    topojson.feature(us, us.objects.states).features.filter(function (d, i) {
        // ids above 56 are several US territories like Guam , and Puetro Rico
        return !(d.id > 56)
    }).map(d => [d.properties.name, d])))


// creating a map of counties
let county_map = county_topo.then(us => new Map(
    topojson.feature(us, us.objects.counties).features.map(d => [d.id, d])))


// loading our covid data and parsing them 
let get_clean_data = async() => {
    var mappings = await state_map;
    var data = d3.csv('https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv', function (d) {

        if (d['county'] === 'New York City') {
            d['fips'] = '36061'
        }
        return d
    }).then(function (data) {
        // filtering the above data to be a specific data for practice
        return d3.nest()
            .key(function (d) {
                return d.date
            }).sortKeys(d3.ascending)
            .entries(
                data.filter(d => time_parse(d.date).getTime() >= time_parse('2020-03-01').getTime())
                .filter(d => mappings.has(d.state))
            )


    })
    return data
}
let covid_by_county = get_clean_data();


// max cases is a promise that when resolved should update the domain of our radius scale
let max_cases = covid_by_county.then(d => d[d.length - 1])
    .then(d => d3.max(d.values.map(d => +d['cases'])))
    .then(d => radius_pos.domain([0, d]))


function chart() {
    Promise.all([covid_by_county, max_cases, county_topo, county_map, state_map])
        .then(function (data) {
            // console log our promises for debugging/ sanity checking
            console.log(data)
            var a = data[0]
            // creating nation borders !
            svg.append('path')
                // .data(data[2],function(data){return data[2].filter(function(d,i){ return topojson.feature(d, d.objects.states).features.id.has(posmap.keys())} )})
                .datum(topojson.feature(data[2], data[2].objects.nation))
                // .enter()
                .attr('d', path)
                .attr('class', 'nation')
                .style('fill', "#ccc")

            // creating state borders
            svg.append('path')
                .datum(topojson.mesh(data[2], data[2].objects.states, function (a, b) {
                    return a !== b;
                }))
                // .enter()
                .attr("class", "border ")
                .attr('d', path)


            // creating county centroids
            var circles = svg.append("g")
                .attr("class", "bubble")
                .selectAll("circle")
                .data(a[a.length - 1].values.sort(function (a, b) {
                    return +b.cases - +a.cases
                }))
                .enter()
                .append("circle")
            // 
            console.log(circles)

            circles.attr("transform", function (d) {
                var location = data[3].get(d.fips) ? data[3].get(d.fips) : data[4].get(d.state)

                if (!location) {
                    console.warn("No location found for: " + JSON.stringify(d))
                }
                return "translate(" + path.centroid(location) + ")";
            })
            // .attr("r", function(d) {
            //     return radius_pos(+d.cases)
            // })

            // creat state labels
            svg.append('g')
                .attr('class', 'State Legend')
                .selectAll('text')
                .data(topojson.feature(data[2], data[2].objects.states).features.filter(function (d, i) {
                    // ids above 56 are several US territories like Guam , and Puetro Rico
                    return !(d.id > 56)
                }))
                .enter()
                .append('text')
                .attr('dx', function (d) {
                    return path.centroid(d)[0] - 10
                })
                .attr('dy', function (d) {
                    // console.log(d)
                    return path.centroid(d)[1]
                })
                .text(function (d) {
                    return d.properties.name
                })
                .style('align', 'left')
                .style('vertical-align', 'middle')
                .style('font-size', 10)
        }).catch(function (error) {
            console.log(error)
        })
}
chart()


var tooltip = d3.select('body')
    .append('div')

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

async function update_chart(index) {

    let result = await Promise.all([covid_by_county, county_map, state_map])
    let circles = svg.select('g').selectAll('circle')

    circles
        .data(result[0][index].values.sort(function (a, b) {
            return +b.cases - +a.cases
        }))
        .join(
            enter => enter.append("circle")
            .attr("transform", function (d) {
                var location = result[1].get(d.fips) ? result[1].get(d.fips) : result[2].get(d.state)
                if (!location) {
                    console.warn("No location found for: " + JSON.stringify(d))
                }
                return "translate(" + path.centroid(location) + ")";
            })
            .attr("r", function (d) {
                return radius_pos(+d.cases)
            }),

            update => update.attr("transform", function (d) {
                var location = result[1].get(d.fips) ? result[1].get(d.fips) : result[2].get(d.state)
                if (!location) {
                    console.warn("No location found for: " + JSON.stringify(d))
                }
                return "translate(" + path.centroid(location) + ")";
            })
            .attr("r", function (d) {
                return radius_pos(+d.cases)
            }),

            exit => exit.attr("r", d => radius_pos(0)).call(
                exit => exit.transition()
                .attr("r", d => radius_pos(0))
            )

        )
};


// update_chart(20)

async function form_maker() {
    var dates = await covid_by_county.then(d => d.map(d => time_parse(d.key)))
    scrubber(dates, tooltip, {
        delay: 500,
        autoplay: false,
        loop: false,
        format: d => d.toLocaleDateString()
    })
}
form_maker()