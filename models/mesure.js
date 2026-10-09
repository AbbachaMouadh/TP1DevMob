const mongoose = require("mongoose");

const mesureSchema = new mongoose.Schema({
  capteur: { type: String, trim: true, required: [true, "Le capteur est obligatoire"] }, // ex. "esp32-salle1"
  type:    { type: String, trim: true, required: [true, "Le type est obligatoire"] },    // ex. "temperature"
  valeur:  { type: Number, required: [true, "La valeur est obligatoire"] },
  unite:   { type: String, trim: true },                                                 // ex. "°C"
  date:    { type: Date, default: Date.now }
});

mesureSchema.set("toJSON", {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model("Mesure", mesureSchema);
