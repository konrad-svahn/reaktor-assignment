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

// checking the database connection
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

//getPilotInfo checks if a drone is in violation of the NDZ and gets the pilot information if it is 
function getPilotInfo (parsed) { 
    // distance is the distance between the drone and the birds nest in mm so a distance value of 100000 is 100m 
    let distance
    
    // the code in this loop is run once for every drone in the current snapshot
    for (i = 0; i < parsed.drone.length; i++) {
        
        // get distance calculates the distance to the nest based on the drones x and y coordinates 
        distance = getDistance(parsed.drone[i].positionX[0],parsed.drone[i].positionY[0])
        console.log(distance)

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
}

//managePilot checks if a pilot is already in the database. updates them if they are ads them if they are not
async function managePilot (pilot, time, distance) {
    // dbInfo will contain the result of a get request for the pilot id made to the database
    let dbInfo
    // shortestDist is the shortest distance to the birds nest for the pilot
    let shortestDist

    try {
        // dbInfo will be null if the pilot does not exist in the database and will return the pilot’s data if they do
        dbInfo = await Model.findOne({pilotId: pilot.pilotId}).exec()
        console.log(dbInfo)
    
        // if the pilot does not exist in te database they are added
        if (dbInfo == null) {
            try {
                const model = new Model({
                    pilotId: pilot.pilotId,
                    firstName: pilot.firstName,
                    lastName: pilot.lastName,
                    retrieved: time,
                    email: pilot.email,
                    phoneNumber: pilot.phoneNumber,
                    distance: distance
                })
                model.save()
    
            } catch (error) {
                console.log(error)
            }
        
        // if the pilot does exist in the database the distance is uppdated 
        } else {
            /* if the distance of the current violation (distance) is shorter than the 
            shortest recorded distance (dbInfo.distance) it will become the new shortest distance
            if not the shortest recorded distance will not change*/ 
            if (distance < dbInfo.distance) {
                shortestDist = distance
            } else {
                shortestDist = dbInfo.distance
            }
            
            // the code below updates the pilot in the database 
            try {
                await Model.findOneAndUpdate(
                    {pilotId: pilot.pilotId}, 
                    {
                        pilotId: pilot.pilotId,
                        firstName: pilot.firstName,
                        lastName: pilot.lastName,
                        retrieved: time,
                        email: pilot.email,
                        phoneNumber: pilot.phoneNumber,
                        distance: shortestDist
                    }, 
                    {new: true}
                )
            } catch (error) {
                console.log(error)
            }
        }
    } catch (error) {
        console.log(error)
    }
} 

//get distance calculates the distance to the nest based on the drones x and y coordinates 
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