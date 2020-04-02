var h1 = d3.select('body')
    .append('h1') // making a new div svg element 
    .text("U.S COVID-19 Positive Cases by County")

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

// var radius_pos = d3.scaleSqrt().range([5, 50]);
let posmap = d3.map();

let totalmap = d3.map();
let percapmap = d3.map();

// url to the dataset that NYTimes is currently using for their cornonavirus dashboard 
// var county_cases = "https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv"
// var county_totals = {}
// let county_total_pop = d3.csv('./data/state_total_pop.csv', function(d) {
//         state_totals[d.abrev] = {
//             state: d.states,
//             population: +d.total
//         }
//     }

// )
let time_parse = d3.timeParse("%Y-%m-%d")

let county_data = d3.csv('data/us-counties.csv', function(d) {
    posmap.set(d.fips, +d.cases)
    return {
        date: time_parse(d.date),
        county: d.county,
        state: d.state,
        fips: d.fips,
        cases: +d.cases,
        deaths: +d.deaths
    }
}).then(function(data) {
    return data.filter(function(d, i) {
        return d.date.getTime() === time_parse('2020-03-27').getTime();
    });

})

let radius_pos = d3.scaleSqrt().range([1, 50])
let max_cases = county_data.then(d => d3.extent(d.map(d => d.cases))).then(d => radius_pos.domain(d))

// loading in the TOPOJSON file
let usData =
    Promise.all([county_data, max_cases, d3.json('data/counties-10m.json')])
    .then(function(data) {
        // console.log(data[2].filter(function(d,i){ return topojson.feature(d, d.objects.states).features.id.has(posmap.keys())} ))
        console.log(data)
        var a = topojson.feature(data[2], data[2].objects.counties).features
        .filter(function(d, i) {
            return posmap.has(d.id)
        })
        .sort(function(a, b) { return posmap.get(a.properties.id) - posmap.get(a.properties.id) })
        
        console.log(a)
        svg.selectAll('path')
            .attr('class', 'states')
            // .data(data[2],function(data){return data[2].filter(function(d,i){ return topojson.feature(d, d.objects.states).features.id.has(posmap.keys())} )})
            .data(topojson.feature(data[2], data[2].objects.states).features)
            .enter()
            // .merge(posmap)
            // .exit()
            // .remove()
            .append('path')
            .attr('d', path)
            .style("stroke", "#fff")
            .style("stroke-width", "1")
            .style('fill', "#ccc")


        svg.append("g")
            .attr("class", "bubble")
            .selectAll("circle")
            .data(a)
            .enter()
            .append("circle")
            .attr("transform", function(d) {
                return "translate(" + path.centroid(d) + ")";
            })
            .attr("r", function(d) {
                return radius_pos(posmap.get(d.id))
                // radius_pos(posmap.get(d.properties.id)) ? radius_pos(posmap.get(d.properties.id)) : 1 
            })
            .style('opacity', '0.5')
            .style('fill', 'orange');
    })



// let temp1 = counties_data.filter(d => d.date < time_parse('2020-03-27'))
// let temp2 = d3.csv('data/us-counties.csv')
// .then(function(data){
//     console.log(data)
// })

// var temp = d3.json('data/counties-10m.json').then(function(data) {
//     // console.log(topojson.feature(data,data.objects.county).features)
//     // return data.sort(function(a, b) { return posmap.get(a.properties.id) - posmap.get(a.properties.id) }) 
//     temp1.filter(function(d, i) {
//         return topojson.feature(d, d.objects.counties).features.id.includes(posmap.keys())
//     })
// }).catch(error => console.log(error))