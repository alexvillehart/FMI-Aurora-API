import express from 'express'
import axios from 'axios'
import rateLimit from 'express-rate-limit'
import cron from 'node-cron'
import { stations } from './stations.js'
import { getTimezoneOffsetInMlliseconds, UTCTimestamp} from "./utils.js";
// timestamp-arvon muuttamiseen.
process.env['TZ'] = 'Europe/Helsinki'

const app = express()
const port = 3005
const request_uri = 'https://cdn.fmi.fi/apps/magnetic-disturbance-observation-graphs/serve-data.php'


// API-kyselyiden rajoittaminen 25 kyselyyn per 15min per IP-osoite. 100 kyselyä/tunti
 
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuuttia
    max: 25,
    message: {'error': 'Too many requests, try again later.'},
    statusCode: 429,
    standardHeaders: true,
    legacyHeaders: false,
})

// Proxyjen määrä
app.set('trust proxy', 1)
app.use(limiter)
app.listen(port, () => {
    console.log(UTCTimestamp() + "\t[APP]\tStarted listening on port " + port)
    getAllStationsLatestMeasurement().then(function(x) {
        cache.data = x
        cache.timestamp = UTCTimestamp()
        console.log(UTCTimestamp() + "\t[CACHE]\tGenerated initial cache")
    })
})

app.get('/', function(req, res) {
    res.status(404).send('Resources asked for not found.')
})

const cache = {
    data: {},
    timestamp: 0
}

cron.schedule('4,8,14,18,24,28,34,38,44,48,54,58 * * * *', () => {
    console.log(UTCTimestamp() + " [CRON] Started cron job...")
    getAllStationsLatestMeasurement().then(function(result) {
        cache.data = result
        cache.timestamp = Date.now()
        console.log(UTCTimestamp() + " [CACHE] Renewed cached data")
    })
})

app.get('/latest/:station/', function(req, res) {
    // validoi käyttäjän syöttö ja varmista että löytyy saatavilla olevista asemista.
    let validation = /\b([A-Za-z]{3})\b/g
    let station = req.params.station.toUpperCase()
    if(station.match(validation) && station in stations) {
        console.log(UTCTimestamp() + "\t[GET /latest/:station]\t" + req.ip + "\tUser requested details for station: " + station)
        return getLatestCachedMeasurement(station).then((response) => {
            res.send(response)
        })
        .catch((error) => {
            console.log(UTCTimestamp() + " | " + req.ip + " [ERROR] " + error.message)
            let errorMsg = {"error":"Something went wrong, possibly with the FMI CDN"}
            res.status(500).send(errorMsg)
        })
    } else {
        console.log(UTCTimestamp() + "\t[ERROR]\t" + req.ip + "\tUser requested an unknown station or gave invalid input: " + station) 
        let errorMsg = {"error":"Invalid user input, station not found"}
        res.status(404).send(errorMsg)
    }
})



async function getAllStationsLatestMeasurement() {
    let measurements = {}
    return await axios.get(request_uri)
        .then(function(response) {
            let data = response.data
            for(const station in stations) {
                try {
                    let dataSerie = data[station].dataSeries
                    measurements[station] = parseMeasurement(station, dataSerie[dataSerie.length-1])
                } catch(error) {
                    console.log(UTCTimestamp() + "\t[ERROR]\t Measurement station: " + station + "\tMessage:" + error + "\t(Aseman havainnot pois käytöstä?)")
                    // Asemalta ei ole havaintoja saatavissa lainkaan. Voidaan lähettää vaikka dummy-dataa tai sitten ei mitään.
                    // TODO: HUOMIOI TÄMÄ V2-API suunnittelussa
                    measurements[station] = {
                        id: station,
                        value: -1,
                        error: {
                            message: 'Unable to fetch data for station.',
                            code: 204
                        },

                    }
                }
            }
            console.log(measurements)
            return measurements
        })
        .catch(function(error) {
            console.log(UTCTimestamp() + "\t[ERROR]\tgetAllStationsLatestMeasurement encountered an error: " + error)
            return false
        })
}

/* 
    id: kolmikirjaiminen tunnus asemasta (esim. NUR)
    names:                  Aseman selkokieliset nimet suomeksi, ruotsiksi ja englanniksi
        {fi, sv, en}
    value:                  Viimeisin mitattu R-arvo.
    low_threshold:          FMI:n määrittelemä R-arvo jolloin revontulet ovat mahdollisia
    high_threshold:         FMI:n määrittelemä R-arvo jolloin revontulet ovat todennäköisiä
    exceeds_low_threshold:  true jos ylittää low_thresholdin, muuten false
    exceeds_high_threshold: true jos ylittää high_thresholdin, muuten false
    aurora_probability:     [none, low, high] sen mukaisesti, ylittyvätkö em. raja-arvot.
    timestamp_fi:           selkokielinen aikaleima YYYY-MM-DD HH:MM:SS suomen aikaa.
    epoch:                  UTC-aikaleima millisekunneissa. 

*/

function parseMeasurement(stationIdentifier, data) {
    let auroraProbability
    let timestamp           = data[0] + getTimezoneOffsetInMlliseconds()
    let prettyTimestamp     = new Date(data[0]).toISOString().replace(/T/, ' ').replace(/\..+/, '')
    let latestValue         = (data[1] === null) ? -1 : parseFloat(data[1].toFixed(2))
    let station                         = stations[stationIdentifier]


    let exceeds_low_threshold = (latestValue >= station.low_threshold)
    let exceeds_high_threshold = (latestValue >= station.high_threshold)


    if(latestValue >= station.low_threshold && latestValue <= station.high_threshold) {
        auroraProbability = 'low'
    } else if(latestValue >= station.low_threshold && latestValue >= station.high_threshold) {
        auroraProbability = 'high'
    } else {
        auroraProbability = 'none'
    }

    return {
        "id": stationIdentifier,
        "names": station.names,
        "value": latestValue,
        "low_threshold": station.low_threshold,
        "high_threshold": station.high_threshold,
        "exceeds_low_threshold": exceeds_low_threshold,
        "exceeds_high_threshold": exceeds_high_threshold,
        "aurora_probability": auroraProbability,
        "timestamp_fi": prettyTimestamp,
        "epoch":  timestamp
    }

}

async function getLatestCachedMeasurement(station) {
    return cache.data[station]
}



