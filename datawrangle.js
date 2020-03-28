// datawrangle.js
// old work used to update the new state total populations
// according to Census estimates

// used a mapping of states names => their total population
// var total_pop = d3.map()

// used promises all to work once all data sets were downloaded
Promise.all([
    d3.csv('./data/state_total_pop.csv'), //contains total pop
    d3.json('./data/us-states-centroids.json') // old state centroid data
])
.then(function(allData) {
    console.log(allData[0]) // console for sanity checking 
// iterates through first array and fills in above hashmap
    allData[0].forEach(d =>
        total_pop.set(d.states, +d.total)
    )
// edits the old populati9on data with new values obtained in the above map
    allData[1].features.map(d => d.properties).forEach(element =>
        element.population = total_pop.get(element.name)
    )
    // I created a global variable to access the string for download later 
    string = JSON.stringify(allData[1])

})

// function taken off of stackoverflow for easy downloading of a string 
function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}
// run above function with arugments string, 'us-states-centroid.json', text/plain