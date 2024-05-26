// Korjaa FMI:n bugin jossa epoch-aikaleima annetaan UTC muodossa mutta suomen aikaan.
export function getTimezoneOffsetInMlliseconds() {
    return new Date(Date.now()).getTimezoneOffset() * 60000
}

// Luo UTC aikaleiman muodossa DD-MM-YYYY HH:MM Z
export function UTCTimestamp() {
    let date = new Date(Date.now())
    return ("0" + date.getUTCDate()).slice(-2) + "." + ("0" + date.getUTCMonth()).slice(-2) + "." + date.getUTCFullYear() + " " + ("0" + date.getUTCHours()).slice(-2) + ":" + ("0" + date.getUTCMinutes()).slice(-2) + ":" + ("0" + date.getUTCSeconds()).slice(-2) + "Z"
}