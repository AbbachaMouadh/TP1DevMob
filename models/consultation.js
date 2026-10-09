const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: [true, "Le patient est obligatoire"]
  },
  date:       { type: Date, required: [true, "La date est obligatoire"] },
  motif:      { type: String, trim: true, required: [true, "Le motif est obligatoire"] },
  traitement: { type: String, trim: true },
  medecin:    { type: String, trim: true, required: [true, "Le médecin est obligatoire"] },
  notes:      { type: String, trim: true },
  statut: {
    type: String,
    enum: { values: ["En attente", "Terminée"], message: "Statut invalide" },
    default: "En attente"
  }
}, { timestamps: true });

consultationSchema.set("toJSON", {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model("Consultation", consultationSchema);
