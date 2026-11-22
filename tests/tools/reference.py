"""Génère tests/data/reference1000.json avec py-ballisticcalc (calculateur libre, indépendant de Kronos).

Utilisation (hors application, Kronos n'en dépend pas) :
    python3 -m venv /tmp/pbc && /tmp/pbc/bin/pip install py-ballisticcalc==3.1.1
    /tmp/pbc/bin/python tests/tools/reference.py > tests/data/reference1000.json

Toutes les trajectoires : hausse 40 mm, zéro à 100 m en atmosphère ICAO, vent de 4 m/s plein travers,
sans dérive gyroscopique. Les distances et les hauteurs sont relevées le long de la ligne de visée.
"""
import json, warnings
warnings.filterwarnings('ignore')
from py_ballisticcalc import *

LOADS = [  # nom, modèle, BC (lb/in²), V0 (m/s) : valeurs d'essai, pas des données de catalogue
    ('.308 175 gr SMK', 'G1', 0.505, 790), ('6.5 CM 140 gr ELD-M', 'G1', 0.646, 823), ('.223 77 gr SMK', 'G1', 0.372, 838),
    ('.308 175 gr SMK', 'G7', 0.243, 790), ('6.5 CM 140 gr ELD-M', 'G7', 0.326, 823), ('.338 LM 300 gr SMK', 'G7', 0.381, 838),
    ('.223 77 gr SMK', 'G7', 0.190, 838),
]
EXTRA = [('.308 175 gr SMK', 'G1', 0.505, 790), ('6.5 CM 140 gr ELD-M', 'G7', 0.326, 823), ('.223 77 gr SMK', 'G7', 0.190, 838)]
CONDS = [dict(t=30, p=900, rh=60, angle=10), dict(t=-10, p=1030, rh=0, angle=-10), dict(t=25, p=1013.25, rh=100, angle=0)]

calc = Calculator(engine='rk4_engine')

def run(model, bc, v0, c):
    dm = DragModel(bc, TableG1 if model == 'G1' else TableG7, weight=Weight.Grain(150), diameter=Distance.Inch(0.3), length=Distance.Inch(1.2))
    ammo = Ammo(dm, Velocity.MPS(v0))
    weapon = Weapon(sight_height=Distance.Millimeter(40), twist=0)
    calc.set_weapon_zero(Shot(weapon=weapon, ammo=ammo, atmo=Atmo.icao()), Distance.Meter(100))
    atmo = Atmo(altitude=0, pressure=Pressure.hPa(c['p']), temperature=Temperature.Celsius(c['t']), humidity=c['rh'])
    shot = Shot(weapon=weapon, ammo=ammo, atmo=atmo, look_angle=Angular.Degree(c['angle']), winds=[Wind(Velocity.MPS(4), Angular.Degree(90))])
    res = calc.fire(shot, trajectory_range=Distance.Meter(1000), trajectory_step=Distance.Meter(0.5), raise_range_error=False)
    pts = [(p.slant_distance >> Distance.Meter, p.slant_height >> Distance.Meter, p.windage >> Distance.Meter, p.velocity >> Velocity.MPS) for p in res.trajectory]
    rows = {}
    for d in range(100, 1001, 100):
        for a, b in zip(pts, pts[1:]):
            if a[0] <= d <= b[0]:
                q = (d - a[0]) / (b[0] - a[0]); f = lambda i: a[i] + q * (b[i] - a[i])
                rows[d] = {'dropMrad': round(-f(1) / d * 1000, 4), 'windMrad': round(abs(f(2)) / d * 1000, 4), 'v': round(f(3), 1)}
                break
    return rows

cases = [dict(name=n, model=m, bc=b, v0=v, cond=dict(t=15, p=1013.25, rh=0, angle=0)) for n, m, b, v in LOADS]
cases += [dict(name=n, model=m, bc=b, v0=v, cond=c) for n, m, b, v in EXTRA for c in CONDS]
for c in cases:
    c['rows'] = run(c['model'], c['bc'], c['v0'], c['cond'])
print(json.dumps({'source': 'py-ballisticcalc 3.1.1, moteur RK4, tables G1/G7 standard. Généré par tests/tools/reference.py',
                  'setup': {'sightHmm': 40, 'zeroM': 100, 'zeroAtmosphere': 'ICAO', 'windMps': 4, 'windFrom': '3 h (plein travers)', 'spinDrift': 'exclue'},
                  'cases': cases}, indent=1, ensure_ascii=False))
