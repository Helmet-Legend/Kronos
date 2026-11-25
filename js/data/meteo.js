// Météo automatique : position GPS puis Open-Meteo (gratuit pour un usage non commercial, CC BY 4.0).

export function position(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Localisation indisponible sur cet appareil')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, alt: p.coords.altitude }),
      (e) => reject(new Error(e.code === 1 ? 'Localisation refusée : autorisez-la ou saisissez la météo' : 'Position introuvable')),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 600000 }
    );
  });
}

export function meteoUrl(lat, lon) {
  const q = new URLSearchParams({
    latitude: lat.toFixed(3), longitude: lon.toFixed(3), // arrondi à 100 m environ : assez pour la météo du stand
    current: 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m',
    wind_speed_unit: 'ms', timezone: 'auto'
  });
  return 'https://api.open-meteo.com/v1/forecast?' + q.toString();
}

/** Transforme la réponse Open-Meteo en conditions de tir. */
export function parseMeteo(j) {
  const c = j && j.current;
  if (!c || typeof c.temperature_2m !== 'number') throw new Error('Réponse météo incomplète');
  return {
    t: Math.round(c.temperature_2m * 10) / 10,
    p: Math.round(c.surface_pressure),
    rh: Math.round(c.relative_humidity_2m),
    alt: typeof j.elevation === 'number' ? Math.round(j.elevation) : null,
    wind: { speed: Math.round(c.wind_speed_10m * 10) / 10, dir: Math.round(c.wind_direction_10m) }
  };
}

export async function fetchMeteo() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Hors ligne : saisissez la météo à la main');
  const pos = await position();
  const r = await fetch(meteoUrl(pos.lat, pos.lon));
  if (!r.ok) throw new Error('Service météo indisponible (' + r.status + ')');
  return { ...parseMeteo(await r.json()), lat: pos.lat, lon: pos.lon };
}

/** Heure d'horloge d'où vient le vent, vue par le tireur qui regarde vers l'azimut donné. */
export function windHour(windFromDeg, shotAzimuthDeg) {
  const rel = ((windFromDeg - shotAzimuthDeg) % 360 + 360) % 360;
  const hr = Math.round(rel / 30) % 12;
  return hr === 0 ? 12 : hr;
}
