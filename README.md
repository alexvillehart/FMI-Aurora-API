
  

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
}


### Rate-limiting

Kyselyiden määrä on rajoitettu 25 kyselyyn/15min, eli 100 kyselyyn tunnissa.

Havainnot päivittyvät ilmatieteen laitoksen sivuille 5-10 minuutin välein. 
