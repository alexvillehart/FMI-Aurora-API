// Korjaa FMI:n bugin jossa epoch-aikaleima annetaan UTC muodossa mutta suomen aikaan.
import axios from "axios";
import {stations} from "./stations.js";
import {request_uri} from "./server.js";


function getTimezoneOffsetInMilliseconds() {
    return new Date(Date.now()).getTimezoneOffset() * 60000
}

// Luo UTC aikaleiman muodossa DD-MM-YYYY HH:MM Z
export function UTCTimestamp() {
    let date = new Date(Date.now())
    return ("0" + date.getUTCDate()).slice(-2) + "." + ("0" + date.getUTCMonth()).slice(-2) + "." + date.getUTCFullYear() + " " + ("0" + date.getUTCHours()).slice(-2) + ":" + ("0" + date.getUTCMinutes()).slice(-2) + ":" + ("0" + date.getUTCSeconds()).slice(-2) + "Z"
}

// validates if
export function ValidateUserInput(input) {
    let UserInputRegex = /\b([A-Za-z]{3})\b/g
    return (UserInputRegex.test(input) && input.toUpperCase() in stations)
}

export async function getAllStationsLatestMeasurement() {
    let measurements = {}
    return await axios.get(request_uri)
        .then(function(response) {
            let data = response.data
            for(const station in stations) {
                try {
                    // noinspection JSUnresolvedReference
                    let dataSerie = data[station].dataSeries
                    measurements[station] = parseMeasurement(station, dataSerie[dataSerie.length-1])
                } catch(error) {
                    console.error("[ERROR]\t" + UTCTimestamp() + "\tMeasurement station " + station + ": " + error + " (Asema pois käytöstä?)")
                    // Asemalta ei ole havaintoja saatavilla, joten aseman tilalle laitetaan virheviesti.
                    measurements[station] = {
                        error: {
                            id: station,
                            message: 'Unable to receive station data',
                            code: 204
                        },

                    }
                }
            }
            return measurements
        })
        .catch(function(error) {
            console.error("[ERROR]\t" + UTCTimestamp() + "\tgetAllStationsLatestMeasurement encountered an error: " + error)
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
    let timestamp           = data[0] + getTimezoneOffsetInMilliseconds()
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
    /* FOR LATER USER, BETTER FORMATTING OF CURRENT JSON RESPONSE.
    return {
        "id": stationIdentifier,
        "names": station.names,
        "value": latestValue,
        "thresholds": {
            "low": station.low_threshold,
            "high": station.high_threshold,
            "exceeds_low": exceeds.low_threshold,
            "exceeds_high": exceeds.high_threshold
        },
        "aurora_probability": auroraProbability,
        "timestamp_fi": prettyTimestamp,
        "epoch":  timestamp
    }
    */
}