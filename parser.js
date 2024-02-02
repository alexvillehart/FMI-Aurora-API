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
    "KEV": {
        "id": "KEV",
        "threshold1": 55,
        "threshold2": 165,
        "names": {
            "fi": "Kevo",
            "en": "Kevo",
            "sv": "Kevo"
        }
    },
    "KIL": {
        "id": "KIL",
        "threshold1": 61,
        "threshold2": 210,
        "names": {
            "fi": "Kilpisjärvi",
            "en": "Kilpisjärvi",
            "sv": "Kilpisjärvi"
        }
    },
    "IVA": {
        "id": "IVA",
        "threshold1": 72,
        "threshold2": 275,
        "names": {
            "fi": "Ivalo",
            "en": "Ivalo",
            "sv": "Ivalo"
        }
    },
    "MUO": {
        "id": "MUO",
        "threshold1": 75,
        "threshold2": 300,
        "names": {
            "fi": "Muonio",
            "en": "Muonio",
            "sv": "Muonio"
        }
    },
    "SOD": {
        "id": "SOD",
        "threshold1": 74,
        "threshold2": 290,
        "names": {
            "fi": "Sodankylä",
            "en": "Sodankylä",
            "sv": "Sodankylä"
        }
    },
    "PEL": {
        "id": "PEL",
        "threshold1": 73,
        "threshold2": 285,
        "names": {
            "fi": "Pello",
            "en": "Pello",
            "sv": "Pello"
        }
    },
    "RAN": {
        "id": "RAN",
        "threshold1": 70,
        "threshold2": 240,
        "names": {
            "fi": "Ranua",
            "en": "Ranua",
            "sv": "Ranua"
        }
    },
    "OUJ": {
        "id": "OUJ",
        "threshold1": 68,
        "threshold2": 200,
        "names": {
            "fi": "Oulujärvi",
            "en": "Oulujärvi",
            "sv": "Oulujärvi"
        }
    },
    "MEK": {
        "id": "MEK",
        "threshold1": 64,
        "threshold2": 150,
        "names": {
            "fi": "Mekrijärvi",
            "en": "Mekrijärvi",
            "sv": "Mekrijärvi"
        }
    },
    "HAN": {
        "id": "HAN",
        "threshold1": 63,
        "threshold2": 140,
        "names": {
            "fi": "Hankasalmi",
            "en": "Hankasalmi",
            "sv": "Hankasalmi"
        }
    },
    "NUR": {
        "id": "NUR",
        "threshold1": 60,
        "threshold2": 120,
        "names": {
            "fi": "Nurmijärvi",
            "en": "Nurmijärvi",
            "sv": "Nurmijärvi"
        }
    },
    "TAR": {
        "id": "TAR",
        "threshold1": 55,
        "threshold2": 100,
        "names": {
            "fi": "Tartto",
            "en": "Tartu",
            "sv": "Tartu"
        }
    }
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
    // validoi käyttäjän syöttö ja varmista että löytyy saatavilla olevista asemista.
    let validation = /\b([A-Za-z]{3})\b/g
    let station = req.params.station.toUpperCase()
    if(station.match(validation) && station in stations) {
        console.log(UTCTimestamp() + " | " + req.ip + " [GET /latest/:station] User requested details for station: " + station)
        return getLatestMeasurement(station).then((response) => {
            res.send(response)
        })
        .catch((error) => {
            console.log(UTCTimestamp() + " | " + req.ip + " [ERROR] " + error.message)
            var errorMsg = {"error":"Something went wrong, possibly with the FMI CDN"}
            res.status(500).send(errorMsg)
        })
    } else {
        console.log(UTCTimestamp() + " | " + req.ip + " [ERROR] User requested an unknown station or gave invalid input: " + station) 
        var errorMsg = {"error":"Invalid user input"}
        res.status(400).send(errorMsg)
    }
})

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
      .then(function(response) {
        let measurement = response.data[station].dataSeries[response.data[station].dataSeries.length-1]
        let timestamp = measurement[0] + getTimezoneOffsetInMlliseconds()
        let humanTimestamp = new Date(measurement[0]).toISOString().replace(/T/, ' ').replace(/\..+/, '')
        /* 
            REFACTOR BELOW:

            Change to auroraProbability?
            Threshold1 exceeds => LOW
            Threshold2 exceeds => HIGH
            Neither happens => NONE

        */
        if(measurement[1] >= stations[station].threshold1) {
            var auroraProbability = "LOW"
        } else if(measurement[1] >= stations[station].threshold2) {
            var auroraProbability = "HIGH"
        } else {
            var auroraProbability = "NONE"
        }
        let threshol1dAlert = (measurement[1] >= stations[station].threshold1) ? true : false
        let threshold2Alert = (measurement[1] >= stations[station].threshold2) ? true : false
        return {"id":station,"fi-name":stations[station].names.fi,"value":measurement[1],"threshold":stations[station].threshold,"timestamp":humanTimestamp,"timestamp_epoch":timestamp,"exceedsThreshold1": threshol1dAlert,"exceedsThreshold2": threshold2Alert, "auroraProbability": auroraProbability}
      })
      .catch(function(error) {
        throw error
      })
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