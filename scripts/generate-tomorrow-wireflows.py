"""Regenerate only the two explanatory SVG wireflows and their language overrides."""
from pathlib import Path
import re, json, html
PAGE = Path(__file__).resolve().parents[1] / 'public/to.morrow2d2.html'
TR = {'de': {}, 'en': {}}
ACC = 'var(--wire-accent, #607D9E)'
def bind(k, de, en):
    k = 'wf-' + k
    TR['de'][k], TR['en'][k] = de, en
    return k

def text(x, y, de, en=None, size=14, fill='#303030', weight=400, center=False, key=None, strike=False):
    attr = f' data-i18n="{bind(key, de, en)}"' if en is not None else ''
    if strike: attr += ' text-decoration="line-through"'
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{"middle" if center else "start"}"{attr}>{html.escape(de)}</text>'
def box(x, y, w, h, radius=0, fill='#fff', stroke='none', anchor=None, active=False):
    attrs = f' data-flow-anchor="{anchor}"' if anchor else ''
    if active:
        stroke = ACC
        attrs += ' vector-effect="non-scaling-stroke"'
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{1.95 if active else 1}"{attrs}/>'
def circle(x, y, radius=9, color='#777', anchor=None, active=False):
    attrs = f' data-flow-anchor="{anchor}"' if anchor else ''
    return f'<circle cx="{x}" cy="{y}" r="{radius}" fill="none" stroke="{ACC if active else color}" stroke-width="{1.95 if active else 1.5}" vector-effect="non-scaling-stroke"{attrs}/>'
def phone(body, ident, de, en, bg='#fff', island=True):
    title = text(25, 32, '9:41', size=10, weight=600)
    title += box(219, 22, 20, 9, 2, 'none', '#555') + box(221, 24, 14, 5, 1, '#555') + box(240, 25, 2, 3, 1, '#555')
    if island: title += box(100, 18, 80, 22, 11, '#171717')
    return f'<svg class="wireflow-phone" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 600" role="img" aria-labelledby="{ident}-title"><title id="{ident}-title" data-i18n="{bind(ident+"-alt", de, en)}">{html.escape(de)}</title><defs><clipPath id="{ident}-screen"><rect x="8" y="8" width="264" height="584" rx="33"/></clipPath></defs><g font-family="Arial, Helvetica, sans-serif">' + box(3,3,274,594,38,'#242424') + box(8,8,264,584,33,bg) + title + body + '</g></svg>'
def header(tomorrow=False, live=False):
    de,en,k = ('Live','Live','live') if live else ('Morgen','Tomorrow','tomorrow') if tomorrow else ('Heute','Today','today')
    return text(24,76,'Personal',size=13,weight=600)+text(86,75,'⌄',size=15)+circle(246,71,9)+circle(246,71,3)+text(24,122,de,en,27,weight=600,key=k)
def nav(active, ident):
    out = f'<g clip-path="url(#{ident}-screen)">' + box(8,535,264,65,0,'#efefef') + '<path d="M9 535H271" stroke="#ddd"/>'
    for i,(de,en,k) in enumerate([('Live','Live','live'),('Heute','Today','today'),('Morgen','Tomorrow','tomorrow'),('Bald','Soon','soon')]):
        x=16+i*63
        if i==active: out+=box(x,550,61,27,8,'#d6d6d6')
        out+=text(x+30.5,568,de,en,11,weight=600 if i==active else 400,center=True,key=k)
    return out+'</g>'
def task(y,de,en,key,anchor=None,active=False,x=20):
    return box(x,y-25,240,50,8,'#ededed',anchor=anchor,active=active)+circle(x+17,y,8)+text(x+34,y+5,de,en,key=key)
def reschedule(n):
    ident=f'reschedule-{n}'; tomorrow=n==3
    b=header(tomorrow)+text(246,121,'1' if tomorrow else '3',size=13,fill='#777')
    if tomorrow:
        b+=task(174,'Portfolio senden','Send portfolio','portfolio','task-arrived',True)
    else:
        b+=task(174,'Skizzen sortieren','Sort sketches','sketches')
        if n==2:
            # Intentional overflow: the dragged task leaves the phone, without a nested clip.
            b+=box(126,207,240,50,8,'#62676F',anchor='task-dragged',active=True)+circle(143,232,8,'#fff')+text(160,237,'Portfolio senden','Send portfolio',fill='#fff',key='portfolio')
        else:
            b+=task(232,'Portfolio senden','Send portfolio','portfolio','task-start' if n==1 else 'task-restored',True)
        b+=task(290,'Einkaufen','Buy groceries','groceries')
    if n==3:
        b+=box(20,386,240,52,9,'#e4e4e4')+text(32,406,'Verschoben','Moved',11,fill='#666',key='moved')+text(32,425,'Rückgängig','Undo',14,weight=600,key='undo')+circle(237,412,14,anchor='undo',active=True)+'<path d="M243 411a7 7 0 1 0 -1 7 M243 411h-5 M243 411v-5" fill="none" stroke="#444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    if n==4: b+=box(20,390,240,40,8,'#ededed')+text(140,415,'Wieder unter Heute','Back in Today',13,center=True,key='restored')
    b+=nav(2 if tomorrow else 1,ident)
    return phone(b,ident,["Heute mit drei Aufgaben, darunter Portfolio senden.","Portfolio senden wird aus dem Bildschirm nach rechts gezogen.","Portfolio senden steht unter Morgen. Rückgängig ist verfügbar.","Optional: Rückgängig stellt Portfolio senden unter Heute wieder her."][n-1],["Today contains three tasks, including Send portfolio.","Send portfolio is dragged right, out of the screen.","Send portfolio is in Tomorrow. Undo is available.","Optional: Undo returns Send portfolio to Today."][n-1])
def lockbase():
    return text(140,98,'Montag, 26. Oktober','Monday, 26 October',14,center=True,key='date')+text(140,164,'9:41',size=64,weight=300,center=True,fill='#555')+circle(43,548,17,'#aaa')+circle(237,548,17,'#aaa')+box(37,541,12,14,3,'#999')+box(229,543,16,10,3,'#999')
def home():
    b=''
    for row in range(3):
        for col in range(4):
            x,y=26+col*60,181+row*76
            b+=box(x,y,46,46,11,'#d7d7d7')+box(x+7,y+54,32,3,1,'#c2c2c2')
    b+=box(18,503,244,60,19,'#e4e4e4')
    for col in range(4): b+=box(28+col*60,513,42,40,10,'#c4c4c4')
    return b

def live(n):
    ident=f'live-{n}'
    if n==1:
        b=header(live=True)+box(20,151,240,133,12,'#f0f0f0','#bbb')+text(35,181,'Reisepass mitnehmen','Bring passport',17,key='passport')+'<path d="M35 190v22" stroke="#444" stroke-width="1.5"/>'
        b+=box(91,301,98,33,16,'#e2e2e2',anchor='live-switch',active=True)+circle(109,317,5)+text(126,322,'Live')
        b+=f'<g clip-path="url(#{ident}-screen)">'+box(9,373,262,219,0,'#dedede')+box(211,380,48,30,6,'#fff','#777')+text(235,400,'Fertig','Done',11,weight=600,center=True,key='done')
        for row,chars in enumerate(['QWERTYUIOP','ASDFGHJKL','ZXCVBNM']):
            start=(280-len(chars)*25)/2
            for col,c in enumerate(chars):b+=box(start+col*25,420+row*36,23,29,4,'#fafafa')+text(start+col*25+11.5,439+row*36,c,size=11,center=True)
        b+=box(73,530,134,27,5,'#fafafa')+'</g>'
    elif n==2:
        b=lockbase()+box(19,352,242,84,16,'#fff','#b8b8b8',anchor='live-card')+text(34,375,'to.morrow',size=11,fill='#666')+text(34,403,'Reisepass mitnehmen','Bring passport',15,weight=600,key='passport')+circle(237,399,14,'#333')+'<path d="M230 399l5 5 9-11" fill="none" stroke="#333" stroke-width="1.95" stroke-linecap="round" stroke-linejoin="round"/>'
    elif n==3:
        b=home()+box(90,16,116,29,14,'#242424',anchor='island-compact')+circle(193,30,7,'#ddd')+circle(193,30,2,'#ddd')+circle(193,30,12.74,active=True)
    else:
        b=home()+box(15,16,250,108,28,'#242424',anchor='island-expanded')+box(99,23,82,19,10,'#111')
        b+=text(31,84,'Reisepass mitnehmen','Bring passport',15,fill='#fff',weight=600,key='passport',strike=True)+circle(236,79,14,anchor='island-tick',active=True)+f'<path d="M229 79l5 5 9-11" fill="none" stroke="{ACC}" stroke-width="1.95" stroke-linecap="round" stroke-linejoin="round"/>'
    titles=[('Live: Aufgabe eingeben und die Tastatur schließen.','Live: enter a task and close the keyboard.'),('Die Aufgabe bleibt auf dem Sperrbildschirm sichtbar.','The task stays visible on the Lock Screen.'),('Geschlossene Dynamic Island mit blau markiertem Live-Ring.','Compact Dynamic Island with an accent ring around its Live icon.'),('Geöffnete Dynamic Island mit weiß durchgestrichener Aufgabe und Abhak-Kreis mit Haken.','Expanded Dynamic Island with a white struck-through task and a checked completion circle.')]
    return phone(b,ident,*titles[n-1],bg='#f3f3f3' if n>1 else '#fff',island=n<3)
NOTES={
'reschedule': [('Ausgangsliste','Starting list','Drei Aufgaben für heute.','Three tasks for today.'),('Nach rechts wischen','Swipe right','Die Aufgabe auf später verschieben.','Move the task to a later day.'),('Unter Morgen','In Tomorrow','Die Aufgabe ist verschoben.','The task has moved.'),('Optional: Rückgängig','Optional: Undo','Die Aufgabe kehrt zu Heute zurück.','The task returns to Today.')],
'live':[('Aufgabe eingeben','Enter a task','Tastatur schließen startet Live.','Closing the keyboard starts Live.'),('Sperrbildschirm','Lock Screen','Die Aufgabe bleibt beim Sperren sichtbar.','The task stays visible when locked.'),('Dynamic Island','Dynamic Island','Kompakt sichtbar, während du das iPhone nutzt.','Visible in compact form as you use your iPhone.'),('Öffnen und abhaken','Expand and complete','Island öffnen und die Aufgabe direkt abhaken.','Expand the Island and complete the task here.')]
}
def band(kind):
    title=('Von Heute nach Morgen','From Today to Tomorrow') if kind=='reschedule' else ('Von der Eingabe bis zum Abhaken','From entering a task to ticking it off')
    desc=('Ein Wisch verschiebt die Aufgabe. Rückgängig bleibt ein optionaler Schritt.','A swipe moves the task. Undo is an optional step.') if kind=='reschedule' else ('Eine Aufgabe auf dem Sperrbildschirm und in der Dynamic Island.','One task on the Lock Screen and in the Dynamic Island.')
    out=f'<div class="flow-band no-shade wireflow wireflow--{kind}" data-wireflow="{kind}">\n          <div class="band-head"><p class="band-title" data-i18n="n-flow-{"swipe" if kind=="reschedule" else "live"}">{title[0]}</p><span class="wireflow-kind">WIREFLOW</span></div>\n'
    out+=f'          <p class="wireflow-intro" data-i18n="{bind(kind+"-intro",*desc)}">{desc[0]}</p>\n          <div class="wireflow-scroll" tabindex="0" role="group" aria-labelledby="{kind}-flow-label"><span class="wireflow-sr" id="{kind}-flow-label" data-i18n="{bind("scroll-label","Vier Schritte. Auf Mobile horizontal wischen.","Four steps. Swipe horizontally on mobile.")}">Vier Schritte. Auf Mobile horizontal wischen.</span><div class="wireflow-track"><ol class="wireflow-steps">\n'
    for i,(de,en,note,english_note) in enumerate(NOTES[kind],1):
        out+=f'            <li class="wireflow-step"><figure>{(reschedule if kind=="reschedule" else live)(i)}<figcaption><span class="wireflow-step-no">0{i}</span><strong data-i18n="{bind(kind+str(i)+"-caption",de,en)}">{de}</strong><span data-i18n="{bind(kind+str(i)+"-note",note,english_note)}">{note}</span></figcaption></figure></li>\n'
    return out+'          </ol><svg class="wireflow-connectors" aria-hidden="true"></svg></div></div>\n        </div>'
def main():
    s=PAGE.read_text()
    pattern=r'<div class="flow-band no-shade wireflow[^\"]*"[^>]*>.*?(?=\n        (?:<div class="rot-scrolly"|<!-- 2\.1b))'
    matches=list(re.finditer(pattern,s,re.S));assert len(matches)==2, 'Expected exactly two explanatory wireflows'
    for m,kind in reversed(list(zip(matches,['reschedule','live']))):s=s[:m.start()]+band(kind)+s[m.end():]
    overrides='    // BEGIN generated wireflow translations\n'+''.join('    Object.assign(TRANSLATIONS.'+lang+', '+json.dumps(values,ensure_ascii=False,indent=2)+');\n' for lang,values in TR.items())+'    // END generated wireflow translations\n'
    if '// BEGIN generated wireflow translations' in s:s=re.sub(r'    // BEGIN generated wireflow translations.*?    // END generated wireflow translations\n',lambda _:overrides,s,flags=re.S)
    else:s=s.replace('    const NARROW =',overrides+'    const NARROW =')
    PAGE.write_text(s)
    print('Generated two wireflows with',len(TR['en']),'localized labels and accessible titles.')
if __name__=='__main__':main()
