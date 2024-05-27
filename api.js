import express from 'express'
import cron from "node-cron";
import {stations} from "./stations.js";
import {getAllStationsLatestMeasurement, UTCTimestamp} from "./utils.js";

process.env['TZ'] = 'Europe/Helsinki'
export const app = express()
export const cache = {
    data: {},
    timestamp: 0
}

cron.schedule('4,8,14,18,24,28,34,38,44,48,54,58 * * * *', () => {
    console.log(UTCTimestamp() + " [CRON] Started cron job...")
    getAllStationsLatestMeasurement().then(function(result) {
        cache.data = result
        cache.timestamp = Date.now()
        console.info("[CACHE]\t" + UTCTimestamp() + " Renewed cached data")
    })
})

app.get('/latest/:station/', function(req, res) {
    // validoi käyttäjän syöttö ja varmista että löytyy saatavilla olevista asemista.
    let validation = /\b([A-Za-z]{3})\b/g
    let station = req.params.station.toUpperCase()
    if(station.match(validation) && station in stations) {
        console.info("[INFO]\t" + UTCTimestamp() + "\t" + req.ip + "\tUser requested details for station: " + station)
        return getLatestCachedMeasurement(station).then((response) => {
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

async function getLatestCachedMeasurement(station) {
    return cache.data[station]
}

