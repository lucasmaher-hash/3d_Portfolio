# to.morrow: Bewegungsanalyse der beiden Glaskontrollen

Referenz: `ScreenRecording_10-26-2026 12-18-03_1.MP4`, 26.10.2026.
Umgesetzt auf der unverlinkten Seite `public/to.morrow2d2.html`.

## Material und Vorgehen

- Aufnahme mit 1206 × 2622 Pixeln und nominell 60 fps; Laufzeit rund 9,75 s.
- 584 decodierte Videobilder mit ihren tatsächlichen Präsentationszeiten ausgewertet.
  Der Container nennt 585 Bilder; die Decodierung liefert 584. Zeitangaben unten
  beziehen sich auf die decodierten Bilder, nicht auf eine erzwungene neue Bildrate.
- Toggle und mittleren Live-Schalter separat ausgeschnitten. Alle Bilder auf
  aufeinanderfolgende Änderungen untersucht; die Übergänge zusätzlich in vergrößerten
  Kontaktbögen geprüft. Helligkeitsprofile der Glaskanten dienen als Größenkontrolle.
- Die Glaskante ist weich, teils transparent und liegt über einem Verlauf. Ein aus
  diesen Kanten geschätzter Maßstab ist deshalb keine pixelgenaue Geometriemessung.
- Die sichtbaren Phasen mit dem vorhandenen App-Code abgeglichen: `SkeuPress.swift`,
  `SkeuMotion.swift`, `SkeuSegmented.swift`, `SkeuRootView.swift`, `SkeuLiveSection.swift`.
  Parameter aus dem Code sind unten von visuellen Zeitfenstern getrennt.

## Was die Einzelbilder zeigen

| Zeitfenster, ungefähr | Beobachtung | Umsetzung |
| --- | --- | --- |
| 0,00–0,80 s | Die Auswahl ruht bei Today’s; die Mulde bewegt sich nicht. | Ein feststehender Rahmen, eine bewegliche Glasfläche. |
| 0,85–1,10 s | Wechsel zu Tomorrow. Die Glasfläche wächst bereits während der Fahrt. Der Zieltext reagiert ebenfalls auf den Tap. | Positionsfeder und Größenfeder starten gemeinsam. Der Text bleibt an seinem Platz und skaliert um seine eigene Mitte. |
| 1,10–1,43 s | Glas und Zieltext gehen auf ihre Ruhegröße zurück. | Eigene Freigabezeit für Glas und Text, gedämpftes Zurückfedern. |
| 1,93–2,40 s | Weiter zu Soon; derselbe Aufbau. | Dieselben Parameter in beide Richtungen und für beide Ziele der Web-Demo. |
| 2,78–3,33 s und 3,67–4,13 s | Rückweg über Tomorrow zu Today’s. Der Rahmen bleibt stabil. | Kein Verschieben des Textes mit der Glasfläche, kein Skalieren der ganzen Mulde. |
| 4,6–6,5 s | Live-Zustand: Symbol und Wort werden gemeinsam kleiner/heller und wieder größer/dunkler. Die Glaskapsel selbst atmet nicht. | Eine gemeinsame Inhaltsebene mit Atmen über 1 s pro Richtung. |
| 6,55–7,10 s | Umschalten auf Off air. Die ganze Kapsel wächst kurz und federt zurück. Während des Textwechsels sind über wenige Bilder beide Beschriftungen zu sehen. | Kapsel-Feder plus 160-ms-Überblendung der Beschriftungen. |
| 7,55–8,02 s | Zurück auf Live; derselbe Kapselimpuls. Danach setzt das gemeinsame Atmen wieder ein. | Derselbe Ablauf beim Ein- und Ausschalten. |
| 8,50–9,00 s | Erneut Off air, anschließend ruhiger Endzustand. | Gedämpfter Inhalt bei voll sichtbarem Glas. |

Die Glaskanten zeigen bei den gut sichtbaren Peaks eine Vergrößerung in der
Größenordnung von etwa 12–15 %. Die Schätzung hängt von der betrachteten Kante ab.
Sie ist mit dem Zielmaßstab 1,115 und dem kleinen Federüberschwingen vereinbar.

## Übernommene Bewegungswerte aus der App

| Bewegung | Werte |
| --- | --- |
| Gleiten zur Auswahl | Spring response 0,40 s; damping 0,86 |
| Aufwölben / Rückkehr | Spring response 0,36 s; damping 0,60 |
| Zielgröße beim Tap | 1,115 × Ruhegröße |
| Freigabe der Kapsel / des angeklickten Labels | nach 260 ms |
| Freigabe der ausgewählten Glasfläche | nach 300 ms |
| Gemeinsames Atmen von Symbol und Wort | Maßstab 1,08 ↔ 0,88; Deckkraft 1 ↔ 0,28; 1 s je Richtung |
| Off-air-Inhalt | Deckkraft 0,55; Glas bleibt voll sichtbar |

Der analytisch berechnete erste Größenpeak beträgt etwa **1,1258**. Die response
ist ein Federparameter, keine feste Gesamtdauer. Ein zweiter Tap übernimmt den
laufenden Wert und dessen Geschwindigkeit; die Bewegung springt nicht an einen
Startpunkt zurück.

## Änderungen am Web-Beispiel

- Der bisherige 400-ms-Bezierweg mit einem verspäteten 5,5-%-Impuls ist ersetzt.
- Die Auswahl bewegt sich mit einer eigenen Positionsfeder. Glas und Zieltext
  erhalten ihren Tap-Impuls gleichzeitig mit dem Beginn der Bewegung.
- Die mittlere Kapsel verwendet denselben Größenimpuls; Symbol und Wort atmen
  gemeinsam. Die aktive Beschriftung lautet wie in der Aufnahme „Live“.
- Beide Kontrollen sind per Klick und Tastatur bedienbar. Auch ein erneuter Klick
  auf die schon gewählte Option erhält sichtbares Feedback.
- Die automatischen Demos verwenden dieselben Bewegungsfunktionen wie echte Klicks.
- Außerhalb des sichtbaren Bereichs und in einem versteckten Dokument werden
  Animationen und Timer gestoppt. Reduce Motion hält die automatische Demo an;
  manuelle Zustandswechsel bleiben ohne Bewegung möglich.

## Prüfung und Grenze

Der tatsächliche Inline-Code wurde mit kontrollierter Uhr und DOM-Ersatz geprüft:
Peak und Rückkehr, getrennte Federn, erneuter Klick auf dieselbe Option,
Richtungswechsel während einer Fahrt, Live-Umschaltung, Timer-Abbruch und Reduce
Motion. Zusätzlich bestanden Skript-/Übersetzungsprüfung und Produktionsbuild.
Die Referenzbilder wurden visuell geprüft. Ein gerenderter Browservergleich der
fertigen Web-Animation war in dieser Sitzung nicht verfügbar; eine pixelidentische
Reproduktion über unterschiedliche Browser wird damit nicht behauptet.
