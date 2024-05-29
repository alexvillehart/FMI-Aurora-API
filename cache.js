import cron from "node-cron";
import {getAllStationsLatestMeasurement, UTCTimestamp} from "./utils.js";

const cache = {
    data: {},
    timestamp: 0
}

cron.schedule('4,8,14,18,24,28,34,38,44,48,54,58 * * * *', () => {
    console.info("[CRON]\t" + UTCTimestamp() + " Started cron job...")
    getAllStationsLatestMeasurement().then(function(result) {
        cache.data = result
        cache.timestamp = Date.now()
        console.info(`[CACHE]\t${UTCTimestamp()}\tRenewed cached data`)
    })
})

export function initializeCache() {
    getAllStationsLatestMeasurement().then(function(x) {
        cache.data = x
        cache.timestamp = UTCTimestamp()
        console.info(`[CACHE]\t${UTCTimestamp()}\tGenerated initial cache`)
    })
}

export async function getStationCachedMeasurement(station) {
    return cache.data[station]
}

export async function getAllCachedMeasurements() {
    return cache.data
}