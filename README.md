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

Tangot ovat noin viidenneksen alkuperäistä matalampia. Tietokoneella kamera seuraa pystysuunnassa ja loittonee korkeassa lennossa. Puhelimella lähikamera seuraa hahmoa molempiin suuntiin kiinteällä zoomilla, myös korkeissa hypyissä. Ruudun ulkopuolelle jäävän seuraavan tangon tai maalin suunnan näyttää pieni nuoli.

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
- Puhelimen kamera pitää hahmon lähellä ruudun keskikohtaa ja näyttää sen suurempana. Renderöinnin tarkkuutta ja varjoja on kevennetty mobiililaitteille.

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

Päävalikon keskellä on suuri, seisova 3D-hahmo. Vaihda hahmoa sen vasemmalla ja oikealla puolella olevista nuolista tai näppäimistön nuolinäppäimillä. Valinta päivittyy heti esikatseluun. Valinta tallentuu selaimeen ja säilyy radan vaihdossa sekä uusissa yrityksissä.

- **Kipinä:** oranssi urheiluasu ja otsapanta.
- **Neon:** turkoosi asu, violetit housut ja nuttura.
- **Astro:** vaalea avaruuspuku ja visiirikypärä.
- **Varjo:** violetti ninja-asu, kasvomaski ja sidottu otsanauha.

Kaikilla hahmoilla on sama fysiikka, temput ja pisteytys.


## Ratakaruselli ja ympäristöt

Hahmon alapuolella oleva ratakaruselli näyttää valitun radan keskellä sekä kaksi pienempää haamukorttia kummallakin puolella. Vaihda pyyhkäisemällä, hiirellä vetämällä, reunan nuolilla tai karusellin ollessa kohdistettuna näppäimistön nuolilla.

- **Puistotreeni:** suihkulähde, huvimaja, puut ja istutukset.
- **Rantakaari:** majakka, purjeveneet, aurinkovarjot ja laituri.
- **Aavikkokaari:** kivikaaret ja kaktukset lämpimässä auringonlaskussa.
- **Kattokaupunki:** pilvenpiirtäjät, kattolaitteet ja vesisäiliö.
- **Konttisatama:** konttipinot, suuret nosturit ja rahtilaiva.
- **Lumihuiput:** lumiset vuoret, kuuset, mökki ja köysirata.

Kaikilla kuudella radalla on omat tankosijoittelut, vaikeustaso ja ennätys. Rakennukset ovat maisemaa; varsinainen rata ja törmäysfysiikka pysyvät kaksiulotteisina.

## Water jumps

Two full bar courses remain: Puistotreeni and Kattokaupunki. Turkoosilahti,
Kultakalliot, Saaristoloikka and Vuoristojarvi are now two-bar water courses.
Visit both bars, then launch over the cliff into the lake. A water finish awards
500 points; a straight feet-first or head-first entry adds 200. Other entry poses
are accepted. Flight tricks and combo bonuses still count. Landing on the cliff
or skipping a bar does not complete the course. The four locations have distinct
rock formations, shoreline scenery, animated water, spray and expanding ripples.

## Campaign and characters

The eleven chapters unlock in the order listed under Expanded world. A successful finish must meet that
chapter's score goal. Replays earn up to three stars. All gates can be reached
with the free starter character; characters are optional purchases.

Campaign progress uses `jumpbar-campaign-v1` in localStorage. Runs grant coins
on the results screen (including trick earnings on failed runs), successful
finishes add 20, and first chapter clears add 60-280. Each run can be claimed
once and first-clear bonuses cannot repeat. Old sandbox records are retained
under their old storage keys but do not unlock campaign chapters.

Boxer Barry starts in patterned underwear. The shop adds Big Bruno, Whistle Willie, Sauna Sausage and Flipper Phil.
Hold E / TRICK for the character's signature pose. Bruno also has a dedicated
B / BOMB button that automatically tucks. Clear chapter 3 to unlock F / DIVE:
hold for 0.35 seconds, then release and tuck within 0.8 seconds of water entry
for the timed-fold bonus. Each special scores once per flight.

The menu's Trick Book lists every move, its owner, inputs and unlock condition.
Newly unlocked signature moves and Death dive show a short looping tutorial
before the next run. Dismissed examples remain queued until acknowledged.

Courses have wider bar spacing and four distinct water terrain profiles:
a low bay, a sandstone arch, uneven islands, and a tall jagged alpine cliff.
Map cards use actual rendered WebP images in assets/maps.

Feet-first falls onto solid ground can be recovered: tuck briefly (0.035-0.6
seconds) and release to bounce towards the next missed bar. Hold grip to catch.
Landing assistance is stronger; head-first falls still end the attempt.

Validation: `node --test physics.test.js campaign.test.js`.

## Character and language refresh

The interface, chapter dialogue, course names, controls, help, trick feedback
and results are now in English. The current roster is Boxer Barry, Big Bruno, Whistle Willie, Sauna Sausage
and Flipper Phil. Shadow and Astro have been retired: loading a save refunds their
420 / 700 coin purchase prices, removes their ownership, and switches a retired
equipped character to Barry. Subsequent saves do not repeat the refund.

Character rendering now uses a single smooth torso profile (including Bruno's
belly), continuous bending limb surfaces, and textured underwear / shorts.
There are no separate elbow/knee balls or overlapping belly pieces. Physics
and existing chapter progress are preserved.

Grab: hold Up / GRAB for 0.35 s to hold both ankles behind the body for 150 points once per flight. All characters can use it; the first run after this update includes a tutorial. Feet-first landings now absorb impact with a damped knee bend and arm balance, including successful finishes. Golden Cliffs and Alpine Lake have much taller drops; the mobile camera widens to include the water and cliff edge.

Neon is retired with a one-time 220-coin refund. New shop characters: Whistle Willie (160, Salute), Sauna Sausage (240, Sauna star), Flipper Phil (320, Flipper fold). Each purchase unlocks a tutorial and Trick Book entry. Their bodies, headgear and accessories are distinct; mass also affects splash size.

Sound: 26 compact recorded foley/water samples plus hand-built spring and whistle accents. Pitch variations avoid identical repeated impacts. Splash pitch and loudness follow impact strength. Mute from the menu; pause for the volume slider. Audio starts on the first gesture, stops on pause/tab blur, and preferences persist. Serve the folder over HTTP(S) to load audio buffers. Sources and CC0 credits: assets/audio/CREDITS.md.

## Shared records and new address

Play at https://jumpbar.pages.dev/ . The menu's Leaderboards has jump, run, combo, daily streak and eleven course rankings. Choose a public nickname before playing to submit new runs. Streaks use UTC days and require one successful course per day. Use PLAY ONLINE on the old GitHub site to carry browser-local campaign progress to the new address. Deployment and limitations: server/README.md.


## Expanded world

Eleven chapters: Park Practice, Flip Academy, Sandy Splash, Pebble Cove, Amber Arch, Dune Dash, Sauna Escape, Rooftop Run, Alpine Lake, Moon Motel, Ironworks. New courses retain stable map IDs for existing records. Legacy saves retain coins, characters, earlier course access and unlocked death dive. New players progress through all eleven chapters.

Even chapters have required fire-ring or star objectives; Sauna Escape also requires passing through its window after both bars. Fire rings animate; moving rings use simulation time. Moon Motel (chapter 10) uses 0.48× gravity and Ironworks (chapter 11) uses 1.30× gravity for swings, flight and falling ragdolls. Earlier chapters use normal gravity. Large terrain and water extend beyond wide cliff views. Thumbnails are renders of the actual environments. All eleven courses have global leaderboard categories.


## Completion reward and physical contacts

Clear all eleven story goals to unlock Sandbox in the menu. Free play includes all story environments plus Endless Recess (12 bars), Cloud Drop (a 1,200-unit cliff) and Orbit Playground (0.35× gravity). Sandbox removes compulsory objectives and bar visitation requirements, grants no campaign currency and never submits competitive leaderboard results.

Airborne bodies and limbs collide with the crossbars using swept contact checks; a hit rebounds and breaks the combo. Gripping remains possible. Landing alignment and spin braking apply only over the landing mat. Outside it, a recovery needs a nearly upright body, low spin, modest sideways speed and a survivable downward speed. Ground balance outside the mat no longer automatically rights a tilted body.
