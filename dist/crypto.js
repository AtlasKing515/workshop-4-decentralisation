"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.symDecrypt = exports.symEncrypt = exports.importSymKey = exports.exportSymKey = exports.createRandomSymmetricKey = exports.rsaDecrypt = exports.rsaEncrypt = exports.importPrvKey = exports.exportPrvKey = exports.importPubKey = exports.exportPubKey = exports.generateRsaKeyPair = void 0;
const crypto_1 = require("crypto");
// #############
// ### Utils ###
// #############
// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer) {
    return Buffer.from(buffer).toString("base64");
}
// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64) {
    var buff = Buffer.from(base64, "base64");
    return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}
async function generateRsaKeyPair() {
    return await crypto_1.webcrypto.subtle.generateKey({
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
    }, true, ["encrypt", "decrypt"]);
}
exports.generateRsaKeyPair = generateRsaKeyPair;
async function exportPubKey(key) {
    const exported = await crypto_1.webcrypto.subtle.exportKey("spki", key);
    return arrayBufferToBase64(exported);
}
exports.exportPubKey = exportPubKey;
async function importPubKey(strKey) {
    const keyBuffer = base64ToArrayBuffer(strKey);
    return await crypto_1.webcrypto.subtle.importKey("spki", keyBuffer, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
}
exports.importPubKey = importPubKey;
async function exportPrvKey(key) {
    const exported = await crypto_1.webcrypto.subtle.exportKey("pkcs8", key);
    return arrayBufferToBase64(exported);
}
exports.exportPrvKey = exportPrvKey;
async function importPrvKey(strKey) {
    const keyBuffer = base64ToArrayBuffer(strKey);
    return await crypto_1.webcrypto.subtle.importKey("pkcs8", keyBuffer, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]);
}
exports.importPrvKey = importPrvKey;
async function rsaEncrypt(b64Data, strPublicKey) {
    const publicKey = await importPubKey(strPublicKey);
    const encodedData = new TextEncoder().encode(b64Data);
    const encrypted = await crypto_1.webcrypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, encodedData);
    return arrayBufferToBase64(encrypted);
}
exports.rsaEncrypt = rsaEncrypt;
async function rsaDecrypt(data, privateKey) {
    const encryptedBuffer = base64ToArrayBuffer(data);
    const decrypted = await crypto_1.webcrypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encryptedBuffer);
    return new TextDecoder().decode(decrypted);
}
exports.rsaDecrypt = rsaDecrypt;
// ######################
// ### Symmetric keys ###
// ######################
async function createRandomSymmetricKey() {
    return await crypto_1.webcrypto.subtle.generateKey({ name: "AES-CBC", length: 256 }, true, ["encrypt", "decrypt"]);
}
exports.createRandomSymmetricKey = createRandomSymmetricKey;
async function exportSymKey(key) {
    const exportedKey = await crypto_1.webcrypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exportedKey);
}
exports.exportSymKey = exportSymKey;
async function importSymKey(strKey) {
    return await crypto_1.webcrypto.subtle.importKey("raw", base64ToArrayBuffer(strKey), { name: "AES-CBC", length: 256 }, true, ["encrypt", "decrypt"]);
}
exports.importSymKey = importSymKey;
async function symEncrypt(key, data) {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encrypted = await crypto_1.webcrypto.subtle.encrypt({ name: "AES-CBC", iv }, key, new TextEncoder().encode(data));
    return arrayBufferToBase64(iv) + ":" + arrayBufferToBase64(encrypted);
}
exports.symEncrypt = symEncrypt;
async function symDecrypt(strKey, encryptedData) {
    const key = await importSymKey(strKey);
    // Séparer l'IV et les données chiffrées
    const [ivStr, dataStr] = encryptedData.split(":");
    const iv = base64ToArrayBuffer(ivStr);
    const encryptedBuffer = base64ToArrayBuffer(dataStr);
    const decrypted = await crypto_1.webcrypto.subtle.decrypt({ name: "AES-CBC", iv: new Uint8Array(iv) }, key, encryptedBuffer);
    return new TextDecoder().decode(decrypted);
}
exports.symDecrypt = symDecrypt;
