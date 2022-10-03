
  

# FMI-revontuli-parser

  

  

## Toiminta

  

Sovellus hakee Ilmatieteen laitoksen magneettikentän viimeisimmän mittauksen valitulta asemalta.

  

## Käyttö

  

Tuettujen mittauspisteiden sijainnin näet [Ilmatieteen laitoksen sivuilta](https://www.ilmatieteenlaitos.fi/revontulet-ja-avaruussaa)

  

### Tuetut asemat _(stationid)_

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

`GET /latest/:stationid`



  

### JSON-vastaus

  

    {
    
    "id": "NUR",
    // Aseman tunniste, jolla tiedot haettiin
    
    "fi-name": "Nurmijärvi",
    // Suomenkielinen aseman nimi
    
    "value": 0.023, 
    // Mitattu arvo nT/s
    
    "threshold": 0.3, 
    // FMI:n määritelty raja-arvo nT/s
    
    "timestamp": "2022-10-03 22:20:00", 
    // Kellonaika, jolloin havainto tehty suomen aikana (GMT +3 kesällä ja GMT +2 talvella)
    
    "timestamp_epoch": 1664824800000,
    // UTC Aikaleima
    
    "exceedsThreshold": false
    // Tosi jos mitattu arvo on sama tai yli raja-arvon.
    
    }

### Rate-limiting

Kyselyiden määrä on rajoitettu 10 kyselyyn/15min, eli 40 kyselyyn tunnissa.

Havainnot päivittyvät ilmatieteen laitoksen sivuille 10 minuutin välein. 
