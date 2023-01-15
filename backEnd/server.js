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

let temp

//---------------------------------------------------------------------------------------------------------------

// cheeking the database connection
database.on('error',(error) => console.log(error))
database.on('open',() => console.log("connected to database "))

getDroneInfo()

//
app.get('/', (req, res) => res.send(temp))

// making sure the app is listening for requests
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`))

//---------------------------------------------------------------------------------------------------------------
// functions

// getDroneInfo uses fetch to get info about the drones and parses that information into a js object
function getDroneInfo () {
    try {
        fetch("http://assignments.reaktor.com/birdnest/drones")
        .then(res => res.text())
        // the line below uses the xml parser to parse the xml and feeds the parsed info into the getPilotInfo function
        .then(xml => parseXml(xml, function (err, parsed) {getPilotInfo(parsed.report.capture[0])}))
    } catch (error) {
        console.log(error)
    }
}

function getPilotInfo (parsed) { 
    let distance
    
    for (i = 0; i < parsed.drone.length; i++) {
        
        // distance is the distance between the drone and the birds nest in mm so a distance value of 100000 is 100m 
        distance = getDistance(parsed.drone[i].positionX[0],parsed.drone[i].positionY[0])

        if (distance <= 100000) {
            try {
                // d2 solves a bug where the distance for all pilots would become the distance of the last pilot.
                // this happened due to the value of distance changing before the managePilot function was called
                let d2 = distance
                
                // while con is false the for loop can not continue 
                // this is to make sure each fetch is done before the next one begins 
                let con = false

                fetch("http://assignments.reaktor.com/birdnest/pilots/"+parsed.drone[i].serialNumber[0])
                .then(res1 => res1.json())
                .then(res2 => managePilot(res2, parsed.$.snapshotTimestamp, d2))
                .then(con = true)

                while (!con) {}
            } catch (error) {
                console.log(error)
            }
        }
    }

    temp = parsed
}

function managePilot (pilot, time, distance) {
    console.log(pilot)
    console.log(time)
    console.log(distance)
} 

function getDistance (x,y) {
    let dx
    let dy
    let d
    if (x < 250000) {
        dx = 250000 - x
    } else {
        dx = x - 250000
    }
    if (y < 250000) {
        dy = 250000 - y
    } else {
        dy = y - 250000
    }
    d = Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2))
    return parseInt(d)
}