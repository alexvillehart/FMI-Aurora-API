
  

# FMI-revontuli-parser

  

  

## Toiminta

  

Sovellus hakee Ilmatieteen laitoksen magneettikentän viimeisimmän mittauksen valitulta asemalta.

  

## Käyttö

  

Tuettujen mittauspisteiden sijainnin näet täältä

  

https://www.ilmatieteenlaitos.fi/revontulet-ja-avaruussaa

  

  

### Tuetut asemat (stationid):

  

- KEV (Kevo)

  

- KIL (Kilpisjärvi)

  

- IVA (Ivalo)

  

- MUO (Muonio)

  

- SOD (Sodankylä)

  

- PEL (Pello)

  

- RAN (Ranua)

  

- OUL (Oulujärvi)

  

- MEK (Mekrijärvi)

  

- HAN (Hankasalmi)

  

- NUR (Nurmijärvi)

  

- TAR (Tartto)

  

### Toiminta

Portti: 3005

GET `localhost:{port}/latest/{stationid}`

  

stationid -> kolmikirjaiminen tunniste (esim. NUR).

  

## JSON-vastaus

  

    {
    
    "id": "NUR", // Aseman tunniste, jolla tiedot haettiin
    
    "fi-name": "Nurmijärvi", // Suomenkielinen aseman nimi
    
    "value": 0.023, // Mitattu arvo nT/s
    
    "threshold": 0.3, // FMI:n määritelty raja-arvo nT/s
    
    "timestamp": "2022-10-03 22:20:00", // Kellonaika, jolloin havainto tehty, kellonaika perustuu env-muuttujan aikavyöhykkeeseen
    
    "timestamp_epoch": 1664824800000, // UTC Aikaleima
    
    "exceedsThreshold": false // tosi jos mitattu arvo on sama tai yli raja-arvon.
    
    }
