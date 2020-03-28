// main.js

console.log('hello world')


// const state_json_url = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'
// const url2 = "https://unpkg.com/us-atlas@1/us/10m.json"



var h1 = d3.select('body')
    .append('h1') // making a new div svg element 
    .text("U.S COVID-19 Positive Cases by State")

const margin = {
    top: 30,
    right: 30,
    bottom: 30,
    left: 20
};


const width = 1200 - margin.left - margin.right;
const height = 550 - margin.top - margin.bottom;

var projection = d3.geoAlbersUsa()


// .translate([width / 2, height / 2]) // translate to center of screen
// .scale([1000]); // scale things down so see entire US

// Define path generator
var path = d3.geoPath()
    .projection(projection);

var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)

var radius_pos = d3.scaleSqrt().range([5, 50]);
let posmap = d3.map();

let totalmap = d3.map();
let percapmap = d3.map();
var url = "https://covidtracking.com/api/states.csv"



var state_totals = {}
let state_total_pop = d3.csv('./data/state_total_pop.csv', function(d) {
        state_totals[d.abrev] = {
            state: d.states,
            population: +d.total
        }
    }

)



let sv = d3.csv('./data/states.csv', function(d) {
    if (Object.keys(state_totals).includes(d.state)) {
        posmap.set(d.state, +d.positive)
        totalmap.set(d.state, +state_totals[d.state].population)
        percapmap.set(d.state, (d.positive / (+state_totals[d.state].population)) * 100000)
        return {
            name: state_totals[d.state].state,
            abrev: d.state,
            positive: +d.positive,
            negative: +d.negative,
            pending: +d.pending,
            death: +d.death,
            total: +d.total,
            lastUpdateEt: d.lastUpdateEt,
            checkTimeEt: d.checkTimeEt
        };
    }
})
// after sv the min_max of the positives is acquired and passed onalong to our domain
let min_max = sv.then(d => d3.extent(percapmap.values())).then(d => radius_pos.domain(d))





let stateJSON = d3.json('./data/states-10m.json');


var stateCentroid = d3.json('./data/us-states-centroids.json')
    .then(d => d.features.map(function(d) {


        var point = projection(d.geometry.coordinates)

        return {
            id: d.id, //numbered id
            name: d.properties.name, //full name of the state 
            label: d.properties.label, // two letter shorthand for the states 
            coords: d.geometry.coordinates, // the geometric coordinates 
            x: +point[0], //point that will change as the forcesimulation is running but is first initialized  as the location of the US state 
            y: +point[1], //point that will change as the forcesimulation is running but is first initialized  as the location of the US state 
            x0: +point[0], //projected point geoalbers point  
            y0: +point[1], //projected point geoalbers point 
            proj: point, // the array of our projected point
            radius: +radius_pos(percapmap.get(d.properties.label)),
            population: totalmap.get(d.properties.label),
            positives: posmap.get(d.properties.label),
            percapita: percapmap.get(d.properties.label),
        };
    }))






Promise.all([sv, stateJSON, stateCentroid]).then(values => {
    console.log(topojson.feature(values[1], values[1].objects.states).features)



    console.log(values)

    svg.selectAll("path")
        .attr('class', 'states')
        .data(topojson.feature(values[1], values[1].objects.states).features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("stroke", "#fff")
        .style("stroke-width", "1")
        .style('fill', "#ccc")
    var circles = svg.selectAll(".circles")
        .data(values[2]) //passing in the data we got from the main function call
        .enter() // binding our data 
        .append("circle")
        .attr("class", "circles");

    circles
        .attr('cx', function(d) {
            return d.x0; // starting the circles at the original  position 
        })
        .attr('cy', function(d) {
            return d.y0; // starting the circles at the original  position 
        })
        .attr('r', function(d) {
            return d.radius // their radius is the dependent on the scale made for population 
        })
        .style('opacity', '0.5')
        .style('fill', 'orange')
        .append('text')
    var text = svg.selectAll(".text")
        .data(values[2]) //passing in the data we got from the main function call
        .enter() // binding our data 
        .append("text")
        .attr("class", "text")
        .text(d => `${posmap.get(d.label)}`)
        .attr('dx', function(d) {
            return d.x0;
        })
        .attr('dy', function(d) {
            return d.y0;
        })
        .attr("text-anchor", "middle")
        .attr("vertical-align",'bottom')
        // text.append('text')
        // .text(d => `ez`)
        // .attr('dx', function(d) {
        //     return d.x0;
        // })
        // .attr('dy', function(d) {
        //     return d.y0-10;
        // })
        // .attr("text-anchor", "middle")




})

var obj = {}
var temp1 = d3.csv('./data/state_total_pop.csv', function(d) {
        obj[d.abrev] = {
            state: d.states,
            pop: +d.total
        }
    }

)