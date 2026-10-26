# Abgleich mit dem ursprünglichen Änderungsauftrag

## to.morrow data status · confirmed by Lucas, 2026-10-26

The published case study is `public/to.morrow2d.html`. Lucas explicitly confirms that its
user research, feedback and result statistics are actual findings from real users, not
fictional or placeholder data. The sole exception is the opening competitor comparison:
its app-by-app tap counts and timings are illustrative and must not be described as a
verified user benchmark.

Current results: **3 → 1 actions** to reschedule; **9 of the 15 accompanied/interviewed
participants use Go Live**; **90 total app downloads as of October 2026**. Downloads are
not active users. The 15 participants form one shared user/interview group.

Keep the distinction between user-confirmed facts and independent verification: this
confirmation comes from Lucas. Keep feedback paraphrases labelled as paraphrases and
retain the small-group limitation. Neither implies that the research is fictional.
Do not restore retired draft quantities, retention rates or the replaced active-user count.
Do not invent additional findings or relabel old draft examples as actual results.


Stand: 26.10.2026. Grundlage: die vom Nutzer nachgereichte Datei „Pasted text.txt“.
Geprüfte Seite: `public/to.morrow2d2.html`, einschließlich der aktiven EN/DE-Werte.
Spätere ausdrücklich gewünschte Verfeinerungen bleiben erhalten.

## Befund zu den Texten

Die fünf angeforderten Kernänderungen waren seit `b4bce23` bereits über einen
zusätzlichen `Object.assign`-Block aktiv. Die HTML-Fallbacks enthielten ebenfalls die
neuen deutschen Texte. Im Grundwörterbuch standen jedoch noch die alten Fassungen.
Das war eine unnötige zweite Textquelle und erschwerte den Abgleich. Die bisherige
Abschlussmeldung unterschied auch nicht ausreichend zwischen geprüftem Code und
visuell geprüfter Browserdarstellung.

Der ausgelieferte HTML-Inhalt auf `localhost:5173/to.morrow2d2.html` entsprach beim
Abgleich dem lokalen Stand und enthielt die neuen englischen Texte. Daraus folgt
kein Nachweis, welchen Zustand der Nutzer zuvor im Browser gesehen hatte.

Jetzt sind die neuen Texte direkt in den EN/DE-Wörterbüchern hinterlegt. Der spätere
Überschreibungsblock und die alten Textfassungen sind entfernt. Die Begründung mit
Timer, Kalender und Live ist näher am ursprünglichen Wortlaut formuliert.

## Punktweiser Abgleich

| Ursprünglicher Wunsch | Befund / aktuelles Ergebnis |
| --- | --- |
| Live-Wireframe-Einleitung auf Mobile entfernen | CSS blendet sie bis 860 px aus. |
| Mobile Schrittlabels über den Screens | Vor den Screens angeordnet. |
| Mobile Screens 20 % kleiner, dadurch niedrigerer Rahmen | Live-Spalten 176 statt 220 px auf Phones, 148 statt 185 px im Zwischenband; keine bloße Skalierung mit altem Leerraum. |
| Screenshots, dann Name, dann Informationen in vier Vergleichskarten | Vorhanden; spätere Freigabe der vollen Breite und quadratischen Bilder erhalten. |
| Kompakte Island mit Ring, danach geöffnete Island | Screens 3 und 4 bilden diese Reihenfolge ab. |
| App-Name aus geöffneter Island entfernen | Dort steht nur die Aufgabe mit Abhak-Control. |
| Nur eine Sekunde finaler Stillstand vor dem Loop | Clip-Endpunkte und sichtbare Ankunftseffekte bestimmen den letzten Bewegungszeitpunkt; danach 1000 ms. |
| Fortschrittslinien an Videozeit statt Pixelpunkt koppeln | Eigene Playback-Berechnung; Linie 1 endet beim Start des mittleren Handys, Linie 2 an dessen erster Abspielgrenze. |
| Windows-Schlussaussage in der Pixelschrift der App | W95FA; bestehende Größen- und Positionsregeln beibehalten. |
| „Aufgabe hinzufügen“ im Verschieben-Wireframe entfernen | Entfernt. |
| Abgeschnittenen Zusatzpfeil entfernen | Entfernt; später auch der Morgen-Hintergrund hinter der gezogenen Karte entfernt. |
| Portfolio-Karte aus dem Handy herausziehen | Vollständige Karte mit sichtbarem Überstand; später dunkelgrau gestaltet. |
| S-Pfeile zwischen tatsächlichen Elementen | Karte → Karte und Undo-Symbol → wiederhergestellte Karte. |
| Akzent an realen Elementkanten; gemeinsame stärkere Strichstärke | Rechteckige Kartenkonturen und runde Controls; gemeinsame 1,95-px-Konturen. Spätere ausdrückliche größere Ringe erhalten. |
| Live-Ablauf nach demselben Verbindungsprinzip | Live-Schalter → Sperrbildschirm-Karte → kompakte → geöffnete Island. |
| Wireframe-Skill lokal und auf GitHub speichern | `wireframes` installiert; im bestehenden Repository `claude-skills` veröffentlicht. |
| Home-Indikatoren entfernen, Navigation absenken, grauen Fuß füllen | In den generierten Screens umgesetzt. |
| Wenig Zeit in To-do-Apps und minimale Reibung als Kernprinzip | Jetzt ausdrücklich im Absatz „problem-1“ in DE und EN. |
| Zielgruppe: überplanen, Überblick verlieren, aufgeben | Direkt in „n-problem-user“ in beiden Sprachen hinterlegt. |
| Vergleichseinleitung unter Überschrift, über Karten, gleiche Breite, linksbündig | Gemeinsamer `.taps-wrap`, entsprechende Reihenfolge und Ausrichtung. |
| Mehr Abstand zwischen Titel und Text im rotierenden Handyblock | Gemeinsame Regel für beide Orientierungszustände mit 20–28 px. |
| „Visible outside the app“ → „Always in view“ | EN „Always in view“, DE „Immer im Blick“. |
| Timer zu aufdringlich, Kalender zu passiv; Live dazwischen, neuer Absatz | In beiden Sprachen neu formuliert; echter Absatzabstand innerhalb des Textblocks. |
| Tastaturschluss zeigt Aufgabe auf Lock/Home Screen; Überschrift entfernen | Text nennt Sperrbildschirm und Dynamic Island auf dem Home-Bildschirm. „Controlling the display“ samt ungenutztem Sprachschlüssel entfernt. |
| Letzter Auftrag „Change … design system … To:“ | Ersatztext fehlte in der Datei. Auf Rückfrage „just leave it out“: beide genannten Einleitungsabsätze und Sprachschlüssel entfernt. |

## Prüfung

- Aktive Sprachwerte und tatsächlicher EN→DE→EN-Message-Pfad mit DOM-Ersatz geprüft.
- Clip-Sequenz mit kontrollierter Zeit geprüft, einschließlich Fortschritt und Loop-Ende.
- Elementverbindungen bei Größenänderung und Scrollversatz geprüft.
- Die Wireframe-Grafiken wurden zuvor als SVG gerendert und visuell geprüft.
- Zahlen, Vergleichswerte und deutsche Originalzitate bleiben erhalten.
- Der Gesamtaufbau wurde in diesem Abgleich nicht in einem steuerbaren Browser geprüft.
