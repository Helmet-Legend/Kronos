"""Parcours de l'interface dans Chrome sans écran (Playwright). Usage : python3 tests/ui_check.py [dossier_captures]"""
import sys, threading, http.server, socketserver, functools, os, re
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else None
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
Handler = functools.partial(Quiet, directory=ROOT)
srv = socketserver.TCPServer(('127.0.0.1', 0), Handler); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{port}/'
errors = []

def shot(page, name):
    # aucun texte technique ne doit apparaître à l'écran
    t = page.inner_text('#app')
    m = re.search(r'.{0,30}\b(null|undefined|NaN)\b.{0,30}', t)
    if m: errors.append(name + ' : texte suspect « ' + m.group(0) + ' »')
    if OUT: page.screenshot(path=os.path.join(OUT, name + '.png'))

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, locale='fr-FR')
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
    page.goto(URL); page.wait_for_selector('.onb')
    # accueil du premier lancement : 3 écrans
    assert 'Kronos' in page.inner_text('.onb')
    shot(page, '00-accueil')
    page.locator('.onb').get_by_role('button', name='Suivant').click()
    page.locator('.onb').get_by_role('button', name='Explorer avec les exemples').click()
    assert 'Vos données restent ici' in page.inner_text('.onb')
    page.locator('.onb').get_by_role('button', name='C’est parti').click()
    assert page.locator('.onb').count() == 0
    # bulles : la première de l'écran Tir, puis la suivante après « Compris »
    assert 'Lire le poste de tir' in page.inner_text('.tip')
    page.locator('.tip').get_by_role('button', name='Compris').click()
    assert 'Zone probable' in page.inner_text('.tip')
    page.locator('.tip').get_by_role('button', name='Masquer toutes les bulles').click()
    assert page.locator('.tip').count() == 0
    page.wait_for_selector('.corr')
    assert 'clics HAUT' in page.inner_text('.hero'), page.inner_text('.hero')
    assert 'cm vertical' in page.inner_text('.conf') and 'Arme' in page.inner_text('.conf'), 'zone probable absente'
    shot(page, '01-tir')
    el0 = page.inner_text('.corr .val')
    page.get_by_role('button', name='Plus 50 mètres').click()
    assert page.inner_text('.corr .val') != el0, 'la distance ne change pas le calcul'
    page.get_by_role('button', name='Vent venant de 9 heures').click()
    assert 'GAUCHE' in page.inner_text('.corr.wd')
    page.fill('.dist-val', '600'); page.keyboard.press('Enter'); page.wait_for_timeout(100)
    # météo manuelle
    page.locator('.pill').click(); page.wait_for_selector('.sheet')
    shot(page, '02-meteo')
    page.get_by_label('Température (°C)').fill('28'); page.get_by_role('button', name='Enregistrer').click()
    assert '28 °C' in page.inner_text('.pill'), page.inner_text('.pill')
    # table
    page.get_by_role('button', name='Table', exact=True).click(); page.wait_for_selector('.ttable')
    assert page.locator('.ttable tbody tr').count() == 19
    shot(page, '03-table')
    # carnet de séance : 6 impacts dont le coup à froid, enregistrement, recalage à partir de la séance
    page.locator('nav.tabs button', has_text='Tir').click()
    page.fill('.dist-val', '600'); page.keyboard.press('Enter'); page.wait_for_timeout(100)
    page.get_by_role('button', name='Saisir une séance').click(); page.wait_for_selector('.sheet .target')
    page.get_by_role('button', name='Quadrillage').click(); page.get_by_role('button', name='Zoom 2 fois').click()
    bx = page.locator('.sheet .target svg').bounding_box()
    for x, y in [(60, 70), (0, -60), (10, -70), (-8, -55), (5, -45), (-4, -66)]:
        page.mouse.click(bx['x'] + (0.5 + x / 250) * bx['width'], bx['y'] + (0.5 - y / 250) * bx['height'])
    assert '6 impacts' in page.inner_text('.sheet'), page.inner_text('.sheet')
    assert 'Coup à froid' in page.inner_text('.sheet .notice.info')
    shot(page, '08-seance')
    page.locator('.sheet').get_by_role('button', name='Enregistrer').click()
    page.wait_for_selector('.sheet h3:has-text("Carnet de séances")')
    shot(page, '09-carnet')
    page.locator('.sheet .item').first.click(); page.wait_for_selector('.sheet h3:has-text("Recaler la munition")')
    assert '→' in page.inner_text('.sheet') and 'm/s' in page.inner_text('.sheet')
    shot(page, '10-recalage')
    page.get_by_role('button', name='Appliquer à la munition').click()
    assert 'V0 recalée' in page.inner_text('.toast')
    page.get_by_role('button', name='Fermer').click()
    page.locator('nav.tabs button', has_text='Table').click(); page.wait_for_selector('.ttable')
    # armes : ajout depuis le catalogue
    page.locator('nav.tabs button', has_text='Armes').click()
    page.locator('.item', has_text='Carabine .308').click()
    shot(page, '04-arme')
    page.get_by_role('button', name='Depuis le catalogue').click()
    page.locator('.sheet .item', has_text='Lapua · 167 gr Scenar').click()
    page.wait_for_selector('.sheet h3:has-text("Nouvelle munition")')
    page.locator('.sheet').get_by_role('button', name='Enregistrer').click()
    assert 'Lapua 167 gr Scenar' in page.inner_text('main')
    # chronographe : trois mesures sur 20 °C, puis application à la munition
    page.locator('main button', has_text='Chronographe').click(); page.wait_for_selector('.sheet h3:has-text("Chronographe")')
    for t, v in [('5', '780'), ('15', '786'), ('25', '791')]:
        page.get_by_label('Température de la poudre (°C)').fill(t); page.get_by_label('V0 moyenne (m/s)').fill(v)
        page.get_by_role('button', name='Ajouter la mesure').click()
    assert 'Sensibilité apprise' in page.inner_text('.sheet'), page.inner_text('.sheet')
    shot(page, '04b-chrono')
    page.get_by_role('button', name='Appliquer V0 et sensibilité').click()
    assert 'V0 mesurée' in page.inner_text('.toast')
    page.get_by_role('button', name='Fermer').click()
    assert 'mesurée' in page.inner_text('main')
    # compteur
    page.get_by_role('button', name='+ Coups').click(); page.get_by_role('button', name='+20').click()
    page.get_by_role('button', name='Nettoyage fait').click(); page.locator('.sheet').get_by_role('button', name='Nettoyage fait').click()
    t = page.inner_text('main'); assert '26' in t, t  # 6 coups de la séance + 20
    # nouvelle arme avec erreur puis correction
    page.get_by_role('button', name='Retour à la liste').click()
    page.get_by_role('button', name='+ Ajouter une arme').click()
    page.get_by_label('Distance de zéro (m)').fill('5'); page.locator('.sheet').get_by_role('button', name='Enregistrer').click()
    assert 'zéro' in page.inner_text('.errors')
    page.get_by_label('Nom').fill('MAS 36'); page.get_by_label('Distance de zéro (m)').fill('200')
    page.locator('.sheet .chip', has_text='œilleton').click()
    page.locator('.sheet').get_by_role('button', name='Enregistrer').click()
    assert 'MAS 36' in page.inner_text('main')
    # tir avec visée mécanique
    page.locator('nav.tabs button', has_text='Tir').click()
    assert 'CRAN DE HAUSSE' in page.inner_text('.hero').upper(), page.inner_text('.profile') + ' | ' + page.inner_text('.hero')
    shot(page, '05-tir-iron')
    # hausse graduée : cran suivant, table avec colonne Cran, étalonnage d'un cran
    c0 = page.inner_text('.hero .corr .val')
    page.get_by_role('button', name='Cran suivant').click(); assert page.inner_text('.hero .corr .val') != c0
    page.get_by_role('button', name='Auto').click()
    page.locator('nav.tabs button', has_text='Table').click(); page.wait_for_selector('.ttable')
    assert 'Cran' in page.inner_text('.ttable thead')
    page.locator('nav.tabs button', has_text='Armes').click(); page.locator('main .item', has_text='MAS 36').click()
    page.get_by_role('button', name='Étalonner un cran').click(); page.wait_for_selector('.sheet h3:has-text("Étalonner")')
    page.get_by_role('button', name='Plus 5 cm').click()
    page.get_by_role('button', name='Enregistrer l’angle réel du cran').click()
    assert 'étalonné' in page.inner_text('.toast')
    shot(page, '11-etalonnage')
    page.get_by_role('button', name='Fermer').click()
    assert 'MESURÉ' in page.inner_text('.crans') and 'AJUSTÉ' in page.inner_text('.crans')
    page.locator('nav.tabs button', has_text='Tir').click()
    # persistance après rechargement
    page.wait_for_timeout(400); page.reload(); page.wait_for_selector('.corr')
    assert 'MAS 36' in page.inner_text('.profile'), 'données non conservées'
    # thème nuit
    page.locator('nav.tabs button', has_text='Réglages').click()
    page.get_by_role('button', name='Nuit (rouge)').click()
    assert page.evaluate('document.documentElement.dataset.theme') == 'night'
    page.locator('nav.tabs button', has_text='Tir').click(); page.locator('.profile').click(); page.locator('.sheet .item', has_text='Carabine .308').click(); page.keyboard.press('Escape')
    page.locator('.scrim').click(position={'x': 10, 'y': 10})
    shot(page, '06-nuit')
    # paysage
    page.set_viewport_size({'width': 844, 'height': 390}); page.wait_for_timeout(150)
    page.locator('nav.tabs button', has_text='Réglages').click(); page.get_by_role('button', name='Sombre', exact=True).click()
    page.locator('nav.tabs button', has_text='Tir').click(); page.wait_for_timeout(100)
    shot(page, '07-paysage')
    over = page.evaluate('(() => { const m = document.querySelector("main"); return m.scrollHeight - m.clientHeight; })()')
    assert over <= 0, f'paysage : {over} px à faire défiler'
    # export
    page.locator('nav.tabs button', has_text='Réglages').click()
    page.get_by_role('button', name='Exporter').first.click(); page.wait_for_selector('.sheet h3:has-text("Exporter")')
    with page.expect_download() as d: page.get_by_role('button', name='Télécharger').click()
    assert d.value.suggested_filename.startswith('kronos-sauvegarde-')
    assert 'jamais' not in page.inner_text('main'), 'date de sauvegarde non enregistrée'
    # export chiffré puis import avec le mot de passe
    page.get_by_role('button', name='Exporter').first.click()
    page.get_by_label('Mot de passe (facultatif)').fill('Kronos-200m'); page.get_by_label('Confirmer le mot de passe').fill('Kronos-200m')
    with page.expect_download(timeout=30000) as d2: page.get_by_role('button', name='Télécharger').click()
    enc_path = d2.value.path()
    assert d2.value.suggested_filename.endswith('-chiffree.json')
    assert 'MAS 36' not in open(enc_path, encoding='utf8').read(), 'données en clair dans le fichier chiffré'
    page.locator('input[type=file][aria-label="Fichier de sauvegarde"]').set_input_files(enc_path)
    page.wait_for_selector('.sheet h3:has-text("Sauvegarde chiffrée")')
    page.get_by_label('Mot de passe de la sauvegarde').fill('mauvais'); page.get_by_role('button', name='Déchiffrer').click()
    page.wait_for_selector('.sheet .errors:has-text("Mot de passe incorrect")', timeout=30000)
    page.get_by_label('Mot de passe de la sauvegarde').fill('Kronos-200m'); page.get_by_role('button', name='Déchiffrer').click()
    page.wait_for_selector('.sheet h3:has-text("Restaurer la sauvegarde")', timeout=30000)
    assert '1 séance' in page.inner_text('.sheet') or '1 séance(s)' in page.inner_text('.sheet'), page.inner_text('.sheet')
    page.locator('.sheet').get_by_role('button', name='Restaurer').click()
    assert 'Sauvegarde restaurée' in page.inner_text('.toast')
    # aide : réafficher les bulles et revoir l'accueil
    page.get_by_role('button', name='Aide').click(); page.wait_for_selector('.sheet h3:has-text("Aide")')
    assert 'Toutes les explications'.upper() in page.inner_text('.sheet').upper()
    page.get_by_role('button', name='Revoir l’accueil').click(); page.wait_for_selector('.onb')
    page.locator('.onb').get_by_role('button', name='Passer').click()
    assert page.locator('.onb').count() == 0
    page.wait_for_timeout(400)  # sauvegarde différée
    # service worker
    page.set_viewport_size({'width': 390, 'height': 844}); page.goto(URL); page.wait_for_timeout(800)
    sw = page.evaluate('navigator.serviceWorker.getRegistration().then(r => !!r)')
    assert sw, 'service worker absent'
    page.reload(); page.wait_for_timeout(800)
    ctx.set_offline(True); page.reload(); page.wait_for_selector('.corr', timeout=5000)
    assert 'clics' in page.inner_text('.hero'), 'hors ligne : application non chargée'
    page.locator('.pill').click(); page.get_by_role('button', name='Météo automatique (GPS)').click(); page.wait_for_timeout(300)
    assert 'Hors ligne' in page.inner_text('#app') or 'Localisation' in page.inner_text('#app'), page.inner_text('#app')[-200:]
    ctx.set_offline(False)
    b.close()
srv.shutdown()
if errors:
    print('\n'.join(errors)); sys.exit(1)
print('UI OK')
