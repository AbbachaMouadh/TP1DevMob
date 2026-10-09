// Rejoue le plan de test (partie 8.1) + exercice Consultations + bonus Mesures.
// Usage : le serveur doit tourner (npm run dev), puis : node tests/run-tests.js
const BASE = process.env.BASE || "http://localhost:5000";
let ok = 0, ko = 0;

async function call(method, path, body, rawBody) {
  const res = await fetch(BASE + path, {
    method,
    headers: body !== undefined || rawBody !== undefined ? { "Content-Type": "application/json" } : {},
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined
  });
  const txt = await res.text();
  let json = null; try { json = txt ? JSON.parse(txt) : null; } catch {}
  return { status: res.status, json, txt };
}
function check(label, got, expected, extra) {
  const contenuOk = extra === undefined || !!extra;
  const pass = got === expected && contenuOk;
  console.log(`${pass ? "✅" : "❌"} ${label} -> ${got} (attendu ${expected})${contenuOk ? "" : "  [contenu inattendu]"}`);
  pass ? ok++ : ko++;
}

(async () => {
  const unique = Date.now();
  // ---------- PATIENTS ----------
  let r = await call("POST", "/api/patients", { nom: "Ben Salah", prenom: "Ali", age: 34, telephone: "22123456", medecin: "Dr Helmi" });
  check("POST patient valide", r.status, 201, r.json && r.json.id && r.json.statut === "Actif" && r.json.createdAt && r.json.updatedAt && !r.json._id && r.json.__v === undefined);
  const id = r.json.id;

  r = await call("POST", "/api/patients", { prenom: "Ali" });
  check("POST sans nom", r.status, 400, r.json && r.json.erreurs && r.json.erreurs.includes("Le nom est obligatoire"));

  r = await call("POST", "/api/patients", { nom: "X", prenom: "Y", statut: "Absent" });
  check("POST statut invalide", r.status, 400, r.json && r.json.erreurs.includes("Statut invalide"));

  r = await call("POST", "/api/patients", undefined, '{ "nom": "X", ');
  check("POST JSON mal formé", r.status, 400, r.json && r.json.message === "JSON invalide");

  await call("POST", "/api/patients", { nom: "Trabelsi", prenom: "Sara", age: 28, statut: "Inactif" });
  await call("POST", "/api/patients", { nom: "Amri", prenom: "Omar", age: 51 });

  r = await call("GET", "/api/patients");
  check("GET tous les patients", r.status, 200, Array.isArray(r.json) && r.json.length >= 3 && r.json[0].nom <= r.json[1].nom);

  r = await call("GET", "/api/patients?statut=Inactif");
  check("GET ?statut=Inactif", r.status, 200, r.json.length >= 1 && r.json.every(p => p.statut === "Inactif"));

  r = await call("GET", "/api/patients?statut=Actif");
  check("GET ?statut=Actif", r.status, 200, r.json.every(p => p.statut === "Actif"));

  r = await call("GET", "/api/patients/" + id);
  check("GET un patient existant", r.status, 200, r.json.id === id);

  r = await call("GET", "/api/patients/64f9e2c8a7b1b23d45f67890");
  check("GET id inexistant", r.status, 404, r.json.message === "Patient introuvable");

  r = await call("GET", "/api/patients/abc");
  check("GET id mal formé", r.status, 400, r.json.message === "Identifiant invalide");

  r = await call("PUT", "/api/patients/" + id, { age: 35 });
  check("PUT age=35", r.status, 200, r.json.age === 35 && r.json.nom === "Ben Salah");

  r = await call("PUT", "/api/patients/" + id, { age: -5 });
  check("PUT age=-5", r.status, 400, r.json.erreurs.includes("L'âge doit être positif"));

  r = await call("PUT", "/api/patients/64f9e2c8a7b1b23d45f67890", { age: 40 });
  check("PUT id inexistant", r.status, 404);

  // ---------- CONSULTATIONS ----------
  const consult = { patient: id, date: "2026-10-05", motif: "Contrôle régulier", traitement: "Aucun", medecin: "Dr Helmi", notes: "Patient en bonne santé" };
  r = await call("POST", "/api/consultations", consult);
  check("POST consultation valide", r.status, 201, r.json && r.json.statut === "En attente" && r.json.id);
  const cid = r.json.id;

  r = await call("POST", "/api/consultations", { ...consult, patient: "64f9e2c8a7b1b23d45f67890" });
  check("POST consultation patient inexistant", r.status, 404, r.json.message === "Patient introuvable");

  // corps non JSON (Content-Type text/plain) : doit répondre 400 et non 500
  const brut = await fetch(BASE + "/api/consultations", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "pas du json" });
  check("POST consultation corps non JSON", brut.status, 400);

  r = await call("POST", "/api/consultations", { patient: id, date: "2026-10-06" });
  check("POST consultation sans motif/médecin", r.status, 400, r.json.erreurs.length === 2);

  r = await call("POST", "/api/consultations", { ...consult, patient: "abc" });
  check("POST consultation patient mal formé", r.status, 400);

  r = await call("POST", "/api/consultations", { ...consult, date: "2026-11-20", motif: "Suivi", statut: "Terminée" });
  check("POST 2e consultation (Terminée)", r.status, 201);

  r = await call("GET", "/api/consultations");
  check("GET consultations (populate + tri date desc)", r.status, 200,
    r.json.length === 2 && r.json[0].patient.nom === "Ben Salah" && r.json[0].patient.prenom === "Ali" &&
    new Date(r.json[0].date) > new Date(r.json[1].date) && r.json[0].patient.age === undefined);

  r = await call("GET", "/api/consultations?statut=Terminée");
  check("GET consultations ?statut=Terminée", r.status, 200, r.json.length === 1 && r.json[0].statut === "Terminée");

  r = await call("GET", "/api/consultations?patient=" + id);
  check("GET consultations ?patient=<id>", r.status, 200, r.json.length === 2);

  r = await call("GET", "/api/consultations/" + cid);
  check("GET une consultation", r.status, 200, r.json.patient.nom === "Ben Salah");

  r = await call("PUT", "/api/consultations/" + cid, { statut: "Terminée" });
  check("PUT consultation statut", r.status, 200, r.json.statut === "Terminée");

  r = await call("PUT", "/api/consultations/" + cid, { statut: "Annulée" });
  check("PUT consultation statut invalide", r.status, 400);

  // ---------- 409 : suppression d'un patient avec consultations ----------
  r = await call("DELETE", "/api/patients/" + id);
  check("DELETE patient avec consultations", r.status, 409, r.json.consultations === 2);

  r = await call("DELETE", "/api/consultations/" + cid);
  check("DELETE consultation", r.status, 204);
  r = await call("DELETE", "/api/consultations/" + cid);
  check("DELETE consultation 2e fois", r.status, 404);

  // nettoyage des consultations restantes puis suppression du patient
  r = await call("GET", "/api/consultations?patient=" + id);
  for (const c of r.json) await call("DELETE", "/api/consultations/" + c.id);

  r = await call("DELETE", "/api/patients/" + id);
  check("DELETE patient (1er)", r.status, 204);
  r = await call("DELETE", "/api/patients/" + id);
  check("DELETE patient (2e fois)", r.status, 404);

  // ---------- MESURES ----------
  r = await call("POST", "/api/mesures", { capteur: "esp32-salle1", type: "temperature", valeur: 22.5, unite: "°C" });
  check("POST mesure", r.status, 201, r.json.date && r.json.id);
  await call("POST", "/api/mesures", { capteur: "esp32-salle1", type: "temperature", valeur: 23.1, unite: "°C", date: "2030-01-01T00:00:00Z" });
  await call("POST", "/api/mesures", { capteur: "esp32-salle2", type: "humidite", valeur: 55, unite: "%" });
  r = await call("POST", "/api/mesures", { capteur: "esp32-salle1" });
  check("POST mesure incomplète", r.status, 400);

  r = await call("GET", "/api/mesures?capteur=esp32-salle1&type=temperature&limit=50");
  check("GET mesures filtrées", r.status, 200, r.json.length === 2 && r.json[0].valeur === 23.1);
  r = await call("GET", "/api/mesures?limit=1");
  check("GET mesures limit=1", r.status, 200, r.json.length === 1);
  r = await call("GET", "/api/mesures?limit=abc");
  check("GET mesures limit invalide (défaut 50)", r.status, 200, Array.isArray(r.json));

  // ---------- DIVERS ----------
  r = await call("GET", "/api/health");
  check("GET /api/health", r.status, 200, r.json.status === "ok");
  r = await call("GET", "/api/inconnu");
  check("GET route inconnue", r.status, 404, r.json.message === "Route introuvable");

  console.log(`\n${ok} réussis, ${ko} échoués`);
  process.exit(ko ? 1 : 0);
})();
