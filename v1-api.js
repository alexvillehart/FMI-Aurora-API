import express from 'express'
import {stations} from "./stations.js";
import {UTCTimestamp, ValidateUserInput} from "./utils.js";
import {getAllCachedMeasurements, getStationCachedMeasurement} from "./cache.js";

process.env['TZ'] = 'Europe/Helsinki'
export const app = express()

app.get('/v1/latest', function(req, res) {
    console.info("[GET]\t" + UTCTimestamp() + "\t" + req.ip + "\tUser requested details for all stations")
    return getAllCachedMeasurements().then((data) => {
        res.status(200).json(data)
    })
})

app.get('/v1/latest/:station/', function(req, res) {
    let station = req.params["station"].toUpperCase()
    if(ValidateUserInput(station)) {
        console.info("[GET]\t" + UTCTimestamp() + "\t" + req.ip + "\tUser requested details for station: " + station)
        return getStationCachedMeasurement(station).then((response) => {
            res.json(response)
        })
            .catch((error) => {
                console.error("[ERROR]\t" + UTCTimestamp() + "\t" + req.ip + "\t" + error.message)
                let errorMsg = {"error": {
                        message: 'Something went wrong with the API',
                        code: 500
                    }}
                res.status(500).json(errorMsg)
            })
    } else {
        console.error("[ERROR]\t" + UTCTimestamp() + "\t" + req.ip + "\tUser requested an unknown station or gave invalid input: " + station)
        let errorMsg = {"error": {
                'message': 'Station not found',
                'acceptable-input':  Object.keys(stations),
                'code': 404
            }}
        res.status(404).json(errorMsg)
    }
})

