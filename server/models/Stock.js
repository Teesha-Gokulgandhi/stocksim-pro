const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
    },

    companyName: {
      type: String,
      required: true,
    },

    sector: {
      type: String,
      required: true,
    },

    exchange: {
      type: String,
      default: "NSE",
    },

    country: {
      type: String,
      enum: ["IN", "US"],
      default: "IN",
    },

    currency: {
      type: String,
      enum: ["INR", "USD"],
      default: "INR",
    },

    logo: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Stock", stockSchema);