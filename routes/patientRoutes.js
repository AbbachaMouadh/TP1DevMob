const express = require("express");
const router = express.Router();
const Patient = require("../models/patient");
const Consultation = require("../models/consultation");

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

// CREATE -> 201
router.post("/", async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (err) { handleError(res, err); }
});

// READ ALL -> 200 (filtre optionnel : ?statut=Actif)
router.get("/", async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) filtre.statut = req.query.statut;
    const patients = await Patient.find(filtre).sort({ nom: 1 });
    res.json(patients);
  } catch (err) { handleError(res, err); }
});

// READ ONE -> 200 ou 404
router.get("/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient introuvable" });
    res.json(patient);
  } catch (err) { handleError(res, err); }
});

// UPDATE -> 200 ou 404 (les validations s'appliquent aussi)
router.put("/:id", async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body,
      { returnDocument: "after", runValidators: true });
    if (!patient) return res.status(404).json({ message: "Patient introuvable" });
    res.json(patient);
  } catch (err) { handleError(res, err); }
});

// DELETE -> 204 (sans corps), 404 ou 409 (le patient a encore des consultations)
router.delete("/:id", async (req, res) => {
  try {
    // Pour aller plus loin : refuser la suppression si le patient a des consultations
    const nbConsultations = await Consultation.countDocuments({ patient: req.params.id });
    if (nbConsultations > 0) {
      return res.status(409).json({
        message: "Suppression impossible : ce patient a des consultations",
        consultations: nbConsultations
      });
    }
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient introuvable" });
    res.status(204).send();
  } catch (err) { handleError(res, err); }
});

module.exports = router;
