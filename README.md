# FMI-revontuli-parser

## Toiminta
Sovellus hakee Ilmatieteen laitoksen magneettikentän viimeisimmän mittauksen valitulta asemalta.
## Käyttö
Tuettujen mittauspisteiden sijainnin näet täältä
https://www.ilmatieteenlaitos.fi/revontulet-ja-avaruussaa

### Tuetut asemat:
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
 `localhost:3005/latest/{station}` 
 Station = kolmikirjaiminen tunniste (esim. NUR).
 
 Palauttaa JSON-arvoina aseman tunnisteen, suomenkielisen nimen, mitatun arvon, asemalle asetetun raja-arvon, aikaleiman UTC-ajassa sekä true/false arvon jos raja-arvo ylittyy.
