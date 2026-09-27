# Jumpbar

Pelaa: **https://latemake.github.io/jumpbar/**

Selaimessa toimiva voimistelupeli: aidot 3D-grafiikat ja kaksiulotteinen pelimekaniikka. Avaa `index.html` selaimessa. Ei asennusta tai palvelinta. Grafiikat vaativat WebGL 2 -tuen.

Peli täyttää koko selainikkunan. Valitse rata päävalikosta ja paina **Pelaa**. Painike käynnistää myös selaimen koko näytön tilan, jos selain tukee sitä. Päävalikon ⛶-painike vaihtaa koko näytön tilaa. Ohjeet löytyvät päävalikon **Miten pelataan?** -painikkeesta.

## Ohjaus

- **Välilyönti pohjassa:** pidä ote ja tartu seuraavaan tankoon. Vapauta hypätäksesi.
- **Alanuoli tai S pohjassa:** keräasento. Vapauta suoristaaksesi vartalon.
- Kerää vauhtia menemällä kerään heilunnan alhaalla ja suoristumalla ääriasennossa. Alun pieni heilunta auttaa liikkeelle.
- Ilmassa keräasento nopeuttaa volttia, suoristuminen hidastaa. Ojenna ennen kiinniottoa ja alastuloa.
- Maton yläpuolella suoristuminen aktivoi kevyen alastuloavustuksen: pyöriminen hidastuu ja jalat hakeutuvat alaspäin. Matto on leveämpi, ja hieman vino tai koukistettu alastulo sallitaan. Pää edellä laskeutuminen on edelleen kaatuminen.
- Käy jokaisella tangolla ja laskeudu vihreälle matolle jaloillesi, suorana ja pyöriminen hidastettuna.
- **R:** uusi yritys. Kosketusnäytöllä käytä kahta pidettävää painiketta.
- **Esc / Ⅱ:** tauko. Taukovalikosta voit jatkaa, aloittaa uudelleen tai palata päävalikkoon. Toiseen ikkunaan siirtyminen pysäyttää suorituksen.

## Radat ja pisteet

Valitse päävalikosta Puistotreeni (5 tankoa), Rantakaari (7 tankoa) tai Auringonlasku (8 tankoa). Radoilla on eri välimatkat, korkeudet, värit ja omat selaimeen tallennettavat ennätykset. Radan vaihtaminen aloittaa uuden yrityksen. Pelaamisen aikana näkyvät vain pisteet, tankoeteneminen ja tauko-/uudelleenaloituspainikkeet.

Uusi tanko +100, kokonainen ilmavoltti +250, onnistunut alastulo +500.

## Grafiikat

Three.js-renderöinti, ortografinen sivukamera, kolmiulotteinen nivelhahmo, materiaalit, dynaamiset varjot ja rataa seuraava kamera. Puistoradalla on puita ja kumpuileva tausta, rannalla meri ja palmut, auringonlaskuradalla lämmin valaistus. Tankojen rungot, pehmusteet, kiinnikkeet ja alastulomatto ovat 3D-malleja. Syvyys on visuaalinen: fysiikka ja ohjaus toimivat yhdessä tasossa.

Tangot ovat noin viidenneksen alkuperäistä matalampia. Kamera seuraa pehmeästi myös pystysuunnassa ja loittonee korkeassa lennossa, jotta pelaaja ja maa pysyvät näkyvissä.

`renderer.js` muuntaa fysiikan nivelpisteet 3D-hahmoksi. `vendor/three.min.js` sisältää paikallisen Three.js 0.180.0 -kirjaston, joten pelaaminen ei vaadi CDN-yhteyttä. MIT-lisenssi on tiedostossa `vendor/THREE-LICENSE.txt`.

## Fysiikka

Kiinteä 120 Hz aika-askel. Tangossa muuttuvapituinen heiluri, ilmassa painovoima ja vartalon asennosta riippuva hitausmomentti. Suuntanäppäimet eivät lisää heilahdusvoimaa. Kiinniotto on avustettu.

Hahmo käyttää aktiivista ragdollia: Verlet-nivelet ja pituusrajoitteet muodostavat vartalon, kyynärpäät ja polvet. Asentojouset ohjaavat raajoja, liikkeen keskipiste seuraa heiluri- ja lentomallia. Kaatuminen poistaa asentojouset, jolloin hahmo retkahtaa vapaasti maahan. Alastulo tarkistetaan nivelten maakosketuksesta.

Keräasennossa molemmat reidet nousevat yhdessä vartalon eteen ja sääret taittuvat takaisin kohti lantiota. Asento määritellään vartalon omassa koordinaatistossa, joten taivutussuunta säilyy myös volteissa.

Molempien käsien kyynärpäät käyttävät samaa taivutussuuntaa. Tangossa käsien asento ratkaistaan otteen ja hartian väliltä, joten keräasento ei peilaa käsiä vastakkaisiin suuntiin. Kaatuessa raajat vapautuvat edelleen ragdolliksi.

`node --test physics.test.js` tarkistaa keräasennon suunnan, vauhdinoton, ilmapyörimisen, kaikkien ratojen tankovälit ja alastulot, ragdollin vakauden ja radan vaihdon.

Fontit ladataan Google Fontsista; ilman verkkoyhteyttä käytetään järjestelmäfontteja.


## Puhelimella

Avaa pelilinkki puhelimen selaimessa. Pysty- ja vaaka-asento toimivat.

- Oikea peukalo: **OTE** pohjassa pitää otteen ja tarttuu seuraavaan tankoon; vapauta hypätäksesi.
- Vasen peukalo: **KERÄÄN** pohjassa koukistaa vartalon; vapauta suoristuaksesi.
- Molempia nappeja voi painaa yhtä aikaa. Sormi saa liukua napin ulkopuolelle otteen katkeamatta.
- Yläkulmassa ovat tauko ja uusi yritys. Puhelimen kääntäminen tai kosketuksen keskeytyminen pysäyttää pelin tauolle.
- Kamera näyttää enemmän rataa ja jättää tilaa ohjaimille. Renderöinnin tarkkuutta ja varjoja on kevennetty mobiililaitteille.

Selaimen koko näytön tilan tuki vaihtelee laitteittain. Peli täyttää käytettävissä olevan selainalueen myös ilman sitä.
## Kaatumiset

Epäonnistunut alastulo valitsee asennon perusteella yhden viidestä koomisesta ragdoll-reaktiosta: nuppi edellä, mahalasku, selkäpomppu, pyykkilinko tai pyllähdys. Pöly, kiertävät tähdet ja sarjakuvatekstit täydentävät animaatiota. Tulosruutu avautuu animaation jälkeen; uuden yrityksen voi aloittaa heti R-näppäimellä tai uudelleenaloituspainikkeella.
## Ilmakierrot ja yhdistelmät

- **Vasen/oikea nuoli tai A/D:** pidä kiertääksesi vartaloa sen pituusakselin ympäri ilmassa. Vapauttaminen jarruttaa kiertoa.
- Puhelimella käytä keskellä olevia **↶ / ↷** -nappeja. Kierron voi yhdistää keräasentoon.
- Täysi 360° kierto +200 pistettä. Voltti +250. Voltin ja täyden kierron yhdistelmä antaa lisäksi +150 combo-pistettä kerran lentoa kohti, esimerkiksi **BACKFLIP 360°**.
- Kierron nopeus kasvaa keräasennossa. Tangossa kierto on lukittu, ja kiinniotto palauttaa hahmon otteeseen.
- Pelin lentorata pysyy kaksiulotteisena, mutta hahmo kiertyy aidosti kolmiulotteisesti.

Hahmon mallissa on muotoiltu urheilupaita, J-tunnus, hihat, kapenevat raajat, tarkemmat kasvot ja hiukset, otsapanta sekä raidalliset kengät.
## Hahmot

Päävalikon hahmovalinta vaihtaa hahmon heti 3D-esikatselussa. Valinta tallentuu selaimeen ja säilyy radan vaihdossa sekä uusissa yrityksissä.

- **Kipinä:** oranssi urheiluasu ja otsapanta.
- **Neon:** turkoosi asu, violetit housut ja nuttura.
- **Astro:** vaalea avaruuspuku ja visiirikypärä.
- **Varjo:** violetti ninja-asu, kasvomaski ja sidottu otsanauha.

Kaikilla hahmoilla on sama fysiikka, temput ja pisteytys.
