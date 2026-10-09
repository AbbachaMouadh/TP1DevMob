const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  nom:    { type: String, trim: true, required: [true, "Le nom est obligatoire"] },
  prenom: { type: String, trim: true, required: [true, "Le prénom est obligatoire"] },
  age:    { type: Number, min: [0, "L'âge doit être positif"] },
  telephone:      { type: String, trim: true },
  derniereVisite: { type: Date },
  medecin:        { type: String, trim: true },
  statut: {
    type: String,
    enum: { values: ["Actif", "Inactif"], message: "Statut invalide" },
    default: "Actif"
  }
}, { timestamps: true });

// JSON plus simple à consommer côté Kotlin : "id" au lieu de "_id", sans "__v"
patientSchema.set("toJSON", {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model("Patient", patientSchema);
