import express, { request } from 'express'
import axios from 'axios'
import rateLimit from 'express-rate-limit'

// timestamp-arvon muuttamiseen.
process.env['TZ'] = 'Europe/Helsinki'

const app = express()
const port = 3005

/*
    API-kyselyiden rajoittaminen 10 kyselyyn per 15min per IP-osoite.
    Koska data päivittyy 10 minuutin välein, turha kysellä tietoja joka sekunti.
    Eli effektiivinen raja on 40 kyselyä tunnissa. 
*/
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuuttia
    max: 10,
    message: {'error': 'Too many requests, try again later.'},
    standardHeaders: true,
    legacyHeaders: false,
})

// Parametrit haettu FMI:n sivuilta 3.10.2022
const request_uri = 'https://cdn.fmi.fi/apps/magnetic-disturbance-observation-graphs/serve-data.php'
const stations = {
        "KEV":{"id":"KEV","threshold":0.57,"names":{"fi":"Kevo","en":"Kevo","sv":"Kevo"}},
        "KIL":{"id":"KIL","threshold":0.56,"names":{"fi":"Kilpisjärvi","en":"Kilpisjärvi","sv":"Kilpisjärvi"}},
        "IVA":{"id":"IVA","threshold":0.53,"names":{"fi":"Ivalo","en":"Ivalo","sv":"Ivalo"}},
        "MUO":{"id":"MUO","threshold":0.52,"names":{"fi":"Muonio","en":"Muonio","sv":"Muonio"}},
        "SOD":{"id":"SOD","threshold":0.50,"names":{"fi":"Sodankylä","en":"Sodankylä","sv":"Sodankylä"}},
        "PEL":{"id":"PEL","threshold":0.49,"names":{"fi":"Pello","en":"Pello","sv":"Pello"}},
        "RAN":{"id":"RAN","threshold":0.45,"names":{"fi":"Ranua","en":"Ranua","sv":"Ranua"}},
        "OUJ":{"id":"OUJ","threshold":0.42,"names":{"fi":"Oulujärvi","en":"Oulujärvi","sv":"Oulujärvi"}},
        "MEK":{"id":"MEK","threshold":0.36,"names":{"fi":"Mekrijärvi","en":"Mekrijärvi","sv":"Mekrijärvi"}},
        "HAN":{"id":"HAN","threshold":0.35,"names":{"fi":"Hankasalmi","en":"Hankasalmi","sv":"Hankasalmi"}},
        "NUR":{"id":"NUR","threshold":0.30,"names":{"fi":"Nurmijärvi","en":"Nurmijärvi","sv":"Nurmijärvi"}},
        "TAR":{"id":"TAR","threshold":0.23,"names":{"fi":"Tartto","en":"Tartu","sv":"Tartu"}}
    };

// Proxyjen määrä
app.set('trust proxy', 1)
app.use(limiter)
app.listen(port, () => {
    console.log('[APP] FMI Parser is listening on port ' + port)
})

// Debugaamista varten
app.get('/ip', (req, res) => res.send(req.ip))

app.get('/', function(req, res) {
    res.status(404).send('Resources asked for not found.')
})

app.get('/latest/:station/', function(req, res) {
    let station = req.params.station.toUpperCase()
    if(validateUserInput(station)) {
        console.log(UTCTimestamp() + " | " + req.ip + " [GET /latest/:station] User requested details for station: " + station)
        return getLatestMeasurement(station).then((response) => {
            return res.status(200).send(response)
        })
        .catch((error) => {
            console.log(UTCTimestamp() + " | " + req.ip + " [ERROR] " + error.message)
            var errorMsg = {"error":"Something went wrong, possibly with the FMI CDN"}
            return res.status(500).send(errorMsg)
        })
    } else {
        console.log(UTCTimestamp() + " | " + req.ip + " [ERROR] User requested an unknown station or gave invalid input: " + station) 
        var errorMsg = {"error":"Invalid user input"}
        return res.status(400).send(errorMsg)
    }
})

app.get('/history/:station', function(req, res) {
    let station = req.params.station.toUpperCase()
    if(validateUserInput(station)) {
        console.log(UTCTimestamp() + " | " + req.ip + " [GET /history/:station] User requested history for station: " + station)
        return getMeasurementHistory(station).then((response) => {
            return res.status(200).send(response)
        })
        .catch((error) => {
            console.log(UTCTimestamp() + " | " + req.ip + " [ERROR] " + error.message)
            var errorMsg = {"error":"Something went wrong, possibly with the FMI CDN"}
            return res.status(500).send(errorMsg)
        })
    } else {
        console.log(UTCTimestamp() + " | " + req.ip + " [ERROR] User requested an unknown station or gave invalid input: " + station) 
        var errorMsg = {"error":"Invalid user input"}
        return res.status(400).send(errorMsg)
    }
})

// Palauttaa aseman viimeisen 24h havainnot JSON muodossa
/*
    id: lyhyttunniste (esim. NUR)
    station_details: Kootut tiedot asemasta.
    values: {
        [epoch_aikaleima, mitattu_arvo]
    }

*/

async function getMeasurementHistory(station) {
    return await axios.get(request_uri)
        .then((response) => {
            let measurements = response.data[station].dataSeries
            for(const i in measurements) {
                // Jotta datan käsittely olisi pikkasen helpompaa, muunnetaan taas aikaleimat oikeaan UTC aikaan, eikä suomen aikaan.
                // TODO: Voisi laittaa tähän jonkun flagin/käyttäjäpyynnön jotta käyttäjä voi valita UTC/Suomen ajan väliltä.
                // Vaihtoehtoisesti voitaisiin muuttaa nuo timestamp_epoch ajat myös perinteiseen ISO-muotoon, jotta datan saaminen taulukkoon olisi järkevämpää(?)
                measurements[i][0] = measurements[i][0] + getTimezoneOffsetInMlliseconds()
            }
            return {"id":station,"station_details":stations[station],"values":measurements}
        })
        .catch((error) => {
            throw error
        })
}


// Palauttaa viimeisimmän havainnon ja siihen liittyvät arvot
/*
    JSON muodossa
    id: lyhytunniste (esim. NUR)
    fi-name: Suomenkielinen nimi "Nurmijärvi"m
    value: Mitattu magneettikentän arvo
    threhsold: Raja-arvo jonka FMI on määrittänyt asemalle jolloin revontulien mahdollisuus on korkea
    timestamp: Ihmisen luettavissa olettava kellonaika suomen aikaa.
    timestamp_epoch: Epoch (ms) aikaleima UTC-aikaan
    exceedsThreshold: boolean, true jos yrittää raja-arvon, false jos ei.
*/

async function getLatestMeasurement(station) {
    return await axios.get(request_uri)
      .then((response) => {
        let measurement = response.data[station].dataSeries[response.data[station].dataSeries.length-1]
        let timestamp = measurement[0] + getTimezoneOffsetInMlliseconds()
        let humanTimestamp = new Date(measurement[0]).toISOString().replace(/T/, ' ').replace(/\..+/, '')
        let thresholdAlert = (measurement[1] >= stations[station].threshold) ? true : false
        return {"id":station,"fi-name":stations[station].names.fi,"value":measurement[1],"threshold":stations[station].threshold,"timestamp":humanTimestamp,"timestamp_epoch":timestamp,"exceedsThreshold": thresholdAlert}
      })
      .catch((error) => {
        throw error
      })
}

function validateUserInput(input) {
    let validation = /\b([A-Za-z]{3})\b/g
    let station = input.toUpperCase()
    return (station.match(validation) && station in stations) ? true : false
}

// Korjaa FMI:n bugin jossa epoch-aikaleima annetaan UTC muodossa mutta suomen aikaan.
function getTimezoneOffsetInMlliseconds() {
    return new Date(Date.now()).getTimezoneOffset() * 60000
}

// Luo UTC aikaleiman muodossa DD-MM-YYYY HH:MM Z
function UTCTimestamp() {
    let date = new Date(Date.now())
    let timestamp = ("0" + date.getUTCDate()).slice(-2) + "." + ("0" + date.getUTCMonth()).slice(-2) + "." + date.getUTCFullYear() + " " + ("0" + date.getUTCHours()).slice(-2) + ":" + ("0" + date.getUTCMinutes()).slice(-2) + ":" + ("0" + date.getUTCSeconds()).slice(-2) + "Z"
    return timestamp
}