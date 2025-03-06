"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.user = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const crypto_1 = require("../crypto");
async function user(userId) {
    const _user = (0, express_1.default)();
    _user.use(express_1.default.json());
    _user.use(body_parser_1.default.json());
    console.log(`🔑 Génération de la clé RSA pour l'utilisateur ${userId}...`);
    // 🔹 Générer une paire de clés RSA pour l'utilisateur
    const { publicKey, privateKey } = await (0, crypto_1.generateRsaKeyPair)();
    const publicKeyBase64 = await (0, crypto_1.exportPubKey)(publicKey);
    console.log(`✅ Clé publique générée pour User ${userId}`);
    // 🔹 Variables pour stocker les derniers messages envoyés et reçus
    let lastReceivedMessage = null;
    let lastSentMessage = null;
    // 🔹 Route pour vérifier l'état de l'utilisateur
    _user.get("/status", (req, res) => {
        res.send("live");
    });
    _user.post("/message", (req, res) => {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        lastReceivedMessage = message;
        console.log(`📩 Utilisateur ${userId} a reçu un message : ${message}`);
        return res.send("success");
    });
    _user.get("/getLastReceivedMessage", (req, res) => {
        return res.json({ result: lastReceivedMessage ?? null });
    });
    // 🔹 Route pour récupérer le dernier message envoyé
    _user.get("/getLastSentMessage", (req, res) => {
        res.json({ result: lastSentMessage });
    });
    let lastCircuit = null;
    _user.get("/getLastCircuit", (req, res) => {
        res.json({ result: lastCircuit });
    });
    _user.post("/receive", (req, res) => {
        const { message } = req.body;
        console.log(`📩 [DEBUG] Avant : lastReceivedMessage = ${lastReceivedMessage}`);
        lastReceivedMessage = message;
        console.log(`📩 [DEBUG] Après : lastReceivedMessage = ${lastReceivedMessage}`);
        res.json({ success: true });
    });
    // 🔹 Route pour envoyer un message via Onion Routing
    _user.post("/send", async (req, res) => {
        const { message, destinationUserId } = req.body;
        console.log(`📨 [DEBUG] Envoi du message : "${message}" vers l'utilisateur ${destinationUserId}`);
        lastSentMessage = message;
        console.log(`📨 Utilisateur ${userId} envoie un message à ${destinationUserId}...`);
        try {
            // 🔹 1. Récupérer la liste des nœuds du registre
            const response = await axios_1.default.get(`http://localhost:${config_1.REGISTRY_PORT}/nodes`);
            let nodes = response.data;
            if (nodes.length === 0) {
                return res.status(500).json({ error: "Aucun nœud disponible" });
            }
            console.log(`🔍 Nœuds disponibles :`, nodes);
            // 🔹 2. Construire la route Onion (dernier → premier)
            nodes = nodes.sort((a, b) => b.nodeId - a.nodeId); // Trie les nœuds du plus grand au plus petit
            const route = nodes.filter(n => n.nodeId !== destinationUserId); // Supprime le destinataire de la liste des nœuds
            route.push({ nodeId: destinationUserId, pubKey: "" }); // Ajoute uniquement à la fin      
            console.log(`🛣️ Route construite : ${route.map((n) => n.nodeId).join(" -> ")}`);
            // 🔹 3. Chiffrer le message en plusieurs couches (Onion Routing)
            let encryptedMessage = message;
            for (const node of route) {
                if (!node.pubKey)
                    continue; // Ne pas chiffrer avec la clé du destinataire
                console.log(`🔒 Chiffrement avec la clé du nœud ${node.nodeId}...`);
                const publicKey = await (0, crypto_1.importPubKey)(node.pubKey);
                const publicKeyBase64 = await (0, crypto_1.exportPubKey)(publicKey);
                encryptedMessage = await (0, crypto_1.rsaEncrypt)(encryptedMessage, publicKeyBase64);
            }
            console.log("✅ Message totalement chiffré.");
            // 🔹 4. Vérifier que l'entrée de Onion Router existe
            const entryNode = route[0];
            const entryPort = config_1.BASE_ONION_ROUTER_PORT + entryNode.nodeId;
            console.log(`🛂 Vérification du nœud d'entrée ${entryNode.nodeId} sur le port ${entryPort}...`);
            try {
                await axios_1.default.get(`http://localhost:${entryPort}/status`);
            }
            catch {
                console.error(`❌ Le nœud ${entryNode.nodeId} n'est pas accessible sur ${entryPort}`);
                return res.status(500).json({ error: `Nœud ${entryNode.nodeId} injoignable` });
            }
            // 🔹 5. Envoyer le message au premier nœud de la route
            console.log(`📤 Envoi du message chiffré au nœud ${entryNode.nodeId}`);
            await axios_1.default.post(`http://localhost:${entryPort}/relay`, {
                encryptedMessage,
                nextNode: route[1]?.nodeId ?? null,
            }, { timeout: 5000 });
            console.log("✅ Message chiffré envoyé !");
            return res.json({ message: "Message envoyé avec succès" });
        }
        catch (error) {
            console.error("⚠️ Erreur lors de l'envoi du message:", error.message);
            return res.status(500).json({ error: "Erreur lors de l'envoi du message" });
        }
    });
    const server = _user.listen(config_1.BASE_USER_PORT + userId, () => {
        console.log(`🟢 User ${userId} is listening on port ${config_1.BASE_USER_PORT + userId}`);
    });
    server.on("error", (err) => {
        console.error(`❌ Erreur sur le serveur de l'utilisateur ${userId}:`, err);
    });
    return server;
}
exports.user = user;
// Exécuter immédiatement si lancé depuis la ligne de commande
if (require.main === module) {
    const userId = process.argv[2] ? parseInt(process.argv[2], 10) : 1;
    user(userId);
}
