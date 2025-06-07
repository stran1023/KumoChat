import forge from "node-forge";
import CryptoJS from "crypto-js";

// Sinh AES key ngẫu nhiên
// function generateAESKey() {
//   return CryptoJS.lib.WordArray.random(32).toString(); // 256-bit
// }

// Mã hóa nội dung bằng AES key
// function encryptAES(content, aesKey) {
//   return CryptoJS.AES.encrypt(content, aesKey).toString();
// }

// Mã hóa AES key bằng publicKey người nhận (RSA)
export function encryptAESKeyWithPublicKey(aesKey, publicKeyPem) {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  const encrypted = publicKey.encrypt(aesKey, "RSA-OAEP");
  return forge.util.encode64(encrypted);
}

export function encryptMessage(content, recipientPublicKeyPem, returnRawKey = false) {
  const aesKeyRaw = CryptoJS.lib.WordArray.random(32).toString(); // 256-bit
  const encryptedContent = CryptoJS.AES.encrypt(content, aesKeyRaw).toString();
  const publicKey = forge.pki.publicKeyFromPem(recipientPublicKeyPem);
  const encryptedAESKey = forge.util.encode64(publicKey.encrypt(aesKeyRaw, "RSA-OAEP"));

  if (returnRawKey) {
    return { encryptedContent, encryptedAESKey, aesKeyRaw };
  }

  return { encryptedContent, encryptedAESKey };
}

// Dùng khi gửi tin nhắn nhóm bằng AES key đã giải mã
export function encryptGroupMessage(plainText, aesKeyRaw) {
  const iv = forge.random.getBytesSync(16);
  const cipher = forge.cipher.createCipher("AES-CBC", aesKeyRaw);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(plainText, "utf8"));
  cipher.finish();

  const encrypted = forge.util.encode64(iv + cipher.output.getBytes());
  return { encryptedContent: encrypted };
}
