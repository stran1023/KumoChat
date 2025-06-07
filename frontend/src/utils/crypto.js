import forge from "node-forge";

// Sinh RSA keypair (2048-bit)
export function generateRSAKeyPair(password) {
  return new Promise((resolve) => {
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, keypair) => {
      const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

      // Encrypt private key với mật khẩu
      const privateKeyPem = forge.pki.encryptRsaPrivateKey(
        keypair.privateKey,
        password,
        { algorithm: "aes256" }
      );

      resolve({ publicKey: publicKeyPem, encryptedPrivateKey: privateKeyPem });
    });
  });
}