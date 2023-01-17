//---------------------------------------------------------------------------------------------------------------
// variables and constants

// imprt dotenv + load in the .env file  
require("dotenv").config()

// PORT contains the port the server is running on
const PORT = process.env.PORT || 3030

const cors = require("cors")

// setting up express for the API endpoints needed for communication with the database
const express = require("express")
const app = express()

// setting up mongoose for communication with the mongoDB database the pilots are stored in
const mongoose = require("mongoose")
mongoose.connect(process.env.DBURL)
const database = mongoose.connection

// the mongoose model for a pilot
const Model = require("./model.js")

// the js fetch API is here for making get requests to http://assignments.reaktor.com
const fetch = require("node-fetch")

// patreXml contains the xml parser
const parseXml = require("xml2js").parseString

//---------------------------------------------------------------------------------------------------------------

// checking the database connection
database.on("error",(error) => console.log(error))
database.on("open",() => console.log("connected to database "))

// updates the database every 2 seconds 
setInterval(getDroneInfo, 2000)
// deletes database entries older than 10 minutes every 10 seconds
setInterval(checkAge, 10000)

app.use(express.json())
app.use(cors())

// sends all the database data on get request
app.get("/", async (req,res) => {
    try {
        const all = await Model.find({})
        res.send(sortByTime(all))
    } catch (error) {
        res.status(500).send({msg: error.message})
    }
});

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
                console.log(dbInfo)

            } catch (error) {
                console.log(error)
            }
        
        // if the pilot does exist in the database the distance is uppdated 
        } else {
            console.log("updated "+dbInfo.email)

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

// delete old deletes all pilots that are more than 10 minutes old
async function checkAge () {
    // now contains the curent moment in milliseconds
    let now = new Date().getTime()

    // data contains all the data of all the pilots in the database
    let data = await Model.find({})

    // forEach loop that checks the age of every person in the database individually. 
    data.forEach(person => {
        // milliseconds contains the moment the last violation was recorded in milliseconds
        let milliseconds = new Date(person.retrieved).getTime()

        // if the difference between the current moment and the moment of the last recorded violation
        // is bigger than 10 minutes the entry is deleted from the database
        if ((now - milliseconds) > 600000) {
            console.log(person.email)
            deleteOld(person.pilotId)
        }
    })
}

async function deleteOld (id) {
    try {
        let del = await Model.deleteOne({pilotId: id})
        console.log(del)
    } catch (error) {
        console.log(error)
    }
}

// sortByTime ordes the pilots by most recent violation 
function sortByTime (data) {
    /* 
    this code loops through the data to find the pilot with the highest millisecond count.
    it then switches places between the first object in the data and the one with the highest 
    millisecond value so that the one with the highest value becomes first.
    then it does the same thing again but ignoring the first value and replacing 
    the second value with the biggest of the remaining values, which will be the second biggest one. 
    it does this until the entire array is sorted by which pilot has the highest millisecond count
    */
    // temp is a variable used to remember the value of the variable that switches paces with biggest
    let temp

    for (i = 0; i < data.length; i++) {
        // biggest is the biggest value in a given loop 
        let biggest = 0

        for (j = 0 + i; j < data.length; j++) {
            // if it is the start of a new loop the higest examined value will be j
            if (j == 0 + i) {
                biggest = j
            // compare the highest value so far to the current value and make biggest the higher of the two
            } else if ( new Date(data[j].retrieved).getTime() > new Date(data[biggest].retrieved).getTime()) {
                biggest = j
            }
        }
        // switch the places of the current value and the biggest of the examined values 
        temp = data[i]
        data[i] = data[biggest]
        data[biggest] = temp   
    }
    return data
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