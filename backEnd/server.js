//---------------------------------------------------------------------------------------------------------------
// variables and constants

// imprt dotenv + load in the .env file  
require("dotenv").config()

// PORT contains the port the server is running on
const PORT = process.env.PORT || 3030

// setting up express for the API endpoints needed for communication with the database
const express = require("express")
const app = express()

// setting up mongoose for communication with the mongoDB database the pilots are stored in
const mongoose = require('mongoose')
mongoose.connect(process.env.DBURL)
const database = mongoose.connection

// the mongoose model for a pilot
const Model = require("./model.js")

// the js fetch API is here for making get requests to http://assignments.reaktor.com
const fetch = require("node-fetch")

// patreXml contains the xml parser
const parseXml = require('xml2js').parseString

var temp

//---------------------------------------------------------------------------------------------------------------

// cheeking the database connection
database.on('error',(error) => console.log(error))
database.on('open',() => console.log("connected to database "))

getInfo()

//
app.get('/', (req, res) => res.send(temp))

// making sure the app is listening for requests
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`))

//---------------------------------------------------------------------------------------------------------------
// functions

// getInfo uses fetch to get info about the drones and parses that information into a js object
function getInfo () {

    fetch("http://assignments.reaktor.com/birdnest/drones")
    .then(x => x.text())
    // the line below uses the xml parser to parse the xml and feeds the parsed info into the processInfo function
    .then(xml => parseXml(xml, function (err, parsed) {processInfo(parsed.report.capture[0])}))
}

function processInfo (parsed) { 
    temp = parsed
    console.log(parsed.$.snapshotTimestamp)
    console.log(parsed.drone[0].serialNumber[0])
    console.log(parsed.drone[0].positionX[0])
    console.log(parsed.drone[0].positionY[0])
}