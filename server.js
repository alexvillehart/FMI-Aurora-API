import {app, initializeCache} from "./api.js";
import {UTCTimestamp} from "./utils.js";
import rateLimit from "express-rate-limit";

const port = 3005
export const request_uri = 'https://cdn.fmi.fi/apps/magnetic-disturbance-observation-graphs/serve-data.php'
let timestamp = UTCTimestamp()

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuuttia
    max: 25,
    message: {'error': {
            message: 'Too many requests, try again later.',
            code: 429
        }},
    statusCode: 429,
    standardHeaders: true,
    legacyHeaders: false,
})

app.set('trust proxy', 1)
// noinspection JSCheckFunctionSignatures
app.use(limiter)

app.listen(port, () => {
    console.info("[INIT]\t" + timestamp + "\tListening on port", port)
    initializeCache()
})