import QRCode from "qrcode";

/** Texte ou URL → image PNG en data URL, utilisable dans <img src>. */
export const qrCodeDataUrl = (texte: string, taille = 256) =>
  QRCode.toDataURL(texte, { width: taille, margin: 1, errorCorrectionLevel: "M" });
