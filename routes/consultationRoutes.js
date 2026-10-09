const express = require("express");
const router = express.Router();
const Consultation = require("../models/consultation");
const Patient = require("../models/patient");

// Traduit les erreurs Mongoose en codes HTTP
function handleError(res, err) {
  if (err.name === "ValidationError") {
    const erreurs = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: "Données invalides", erreurs });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Identifiant invalide" });
  }
  console.error(err);
  return res.status(500).json({ message: "Erreur serveur" });
}

// CREATE -> 201 (404 si le patient n'existe pas)
router.post("/", async (req, res) => {
  try {
    // Express 5 : req.body vaut undefined si le client n'envoie pas de JSON
    const body = req.body || {};
    // Le patient doit exister avant de créer la consultation.
    // Si "patient" est absent, on laisse la validation Mongoose répondre 400.
    if (body.patient) {
      const existe = await Patient.exists({ _id: body.patient });
      if (!existe) return res.status(404).json({ message: "Patient introuvable" });
    }
    const consultation = new Consultation(body);
    await consultation.save();
    res.status(201).json(consultation);
  } catch (err) { handleError(res, err); }
});

// READ ALL -> 200 (filtres optionnels : ?patient=<id>&statut=Terminée), triées par date décroissante
router.get("/", async (req, res) => {
  try {
    const filtre = {};
    if (req.query.patient) filtre.patient = req.query.patient;
    if (req.query.statut) filtre.statut = req.query.statut;
    const consultations = await Consultation.find(filtre)
      .populate("patient", "nom prenom")
      .sort({ date: -1 });
    res.json(consultations);
  } catch (err) { handleError(res, err); }
});

// READ ONE -> 200 ou 404
router.get("/:id", async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate("patient", "nom prenom");
    if (!consultation) return res.status(404).json({ message: "Consultation introuvable" });
    res.json(consultation);
  } catch (err) { handleError(res, err); }
});

// UPDATE -> 200 ou 404
router.put("/:id", async (req, res) => {
  try {
    const body = req.body || {};
    // Si on change de patient, il doit exister
    if (body.patient) {
      const existe = await Patient.exists({ _id: body.patient });
      if (!existe) return res.status(404).json({ message: "Patient introuvable" });
    }
    const consultation = await Consultation.findByIdAndUpdate(req.params.id, body,
      { returnDocument: "after", runValidators: true });
    if (!consultation) return res.status(404).json({ message: "Consultation introuvable" });
    res.json(consultation);
  } catch (err) { handleError(res, err); }
});

// DELETE -> 204 ou 404
router.delete("/:id", async (req, res) => {
  try {
    const consultation = await Consultation.findByIdAndDelete(req.params.id);
    if (!consultation) return res.status(404).json({ message: "Consultation introuvable" });
    res.status(204).send();
  } catch (err) { handleError(res, err); }
});

module.exports = router;
