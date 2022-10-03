import express from 'express'
import axios from 'axios'

process.env['TZ'] = 'Europe/Helsinki'

const app = express()
const port = 3005

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
const validStations = ['KEV','KIL','IVA','MUO','SOD','PEL','RAN','OUJ','MEK','HAN','NUR','TAR']

app.listen(port, () => {
    console.log('FMI Parser is listening on port ' + port)
})

app.get('/latest/:station/', function(req, res) {
    var station = req.params.station.toUpperCase()
    if(validStations.includes(station)) {
        console.log("=Requested latest measurement for station " + req.params.station)
        console.log("=Station name: " + stations[station].names.fi + " Threshold " + stations[station].threshold)
        return getLatestMeasurement(station).then((response) => {
            res.send(response)
        })
    } else {
        console.log("Invalid request: No station with the code (" + station + ") found.") 
        res.sendStatus(400)
    }
})

// Palauttaa viimeisimmän havainnon ja siihen liittyvät arvot
/*
    JSON muodossa
    id: lyhytunniste (esim. NUR)
    fi-name: Suomenkielinen nimi "Nurmijärvi"
    value: Mitattu magneettikentän arvo
    threhsold: Raja-arvo jonka FMI on määrittänyt asemalle jolloin revontulien mahdollisuus on korkea
    timestamp: Epoch (ms) aikaleima UTC-aikaan
    exceedsThreshold: boolean, true jos yrittää raja-arvon, false jos ei.
*/

async function getLatestMeasurement(station) {
    return await axios.get(request_uri)
      .then(function(response) {
        var data = response.data[station]
        var measurement = data.dataSeries[data.dataSeries.length-1]
        var timestamp = measurement[0] + getTimezoneOffsetInMlliseconds()
        var value = measurement[1]
        var d = new Date(measurement[0])
        var hd = d.toISOString().replace(/T/, ' ').replace(/\..+/, '')
        var thresholdAlert = (value >= stations[station].threshold) ? true : false
        return {"id":station,"fi-name":stations[station].names.fi,"value":value,"threshold":stations[station].threshold,"timestamp":hd,"timestamp_epoch":timestamp,"exceedsThreshold": thresholdAlert}
      })
}


// Korjaa FMI:n bugin jossa epoch-aikaleima annetaan UTC muodossa mutta suomen aikaan.
function getTimezoneOffsetInMlliseconds() {
    var d = new Date(Date.now())
    return d.getTimezoneOffset() * 60000
}