import forge from "node-forge";
import CryptoJS from "crypto-js";

// Giải mã RSA (dùng private key PEM + password)
export function decryptPrivateKey(encryptedPrivateKeyPem, password) {
  try {
    return forge.pki.decryptRsaPrivateKey(encryptedPrivateKeyPem, password);
  } catch (err) {
    console.error("❌ Sai mật khẩu hoặc private key lỗi");
    return null;
  }
}

// Giải mã AES key đã được RSA mã hóa
export function decryptAESKey(encryptedAESKeyBase64, privateKey) {
  const encryptedBytes = forge.util.decode64(encryptedAESKeyBase64);
  const aesKey = privateKey.decrypt(encryptedBytes, "RSA-OAEP");
  return aesKey;
}

// Giải mã nội dung bằng AES key
export function decryptContentAES(encryptedContent, aesKey) {
  const bytes = CryptoJS.AES.decrypt(encryptedContent, aesKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function decryptGroupKey(encryptedBase64, privateKey) {
  try {
    const encryptedBytes = forge.util.decode64(encryptedBase64);
    const rawKey = privateKey.decrypt(encryptedBytes, "RSA-OAEP");
    return rawKey;
  } catch (err) {
    console.error("❌ Lỗi giải mã group key:", err);
    return null;
  }
}

export function decryptGroupMessage(encryptedBase64, aesKeyRaw) {
  try {
    const encryptedBytes = forge.util.decode64(encryptedBase64);

    // Cắt IV (16 byte đầu)
    const iv = encryptedBytes.slice(0, 16);
    const ciphertext = encryptedBytes.slice(16);

    const decipher = forge.cipher.createDecipher("AES-CBC", aesKeyRaw);
    decipher.start({ iv });
    decipher.update(forge.util.createBuffer(ciphertext));
    const success = decipher.finish();

    if (!success) throw new Error("❌ Giải mã thất bại (finish false)");

    return decipher.output.toString("utf8");
  } catch (err) {
    console.error("❌ decryptGroupMessage failed:", err);
    return "❌ Không giải mã được";
  }
}
