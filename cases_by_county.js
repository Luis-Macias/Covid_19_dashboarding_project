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