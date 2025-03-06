"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleOnionRouter = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
async function simpleOnionRouter(nodeId) {
    const port = config_1.BASE_ONION_ROUTER_PORT + nodeId;
    console.log(`🚀 Tentative de démarrage du routeur ${nodeId} sur le port ${port}...`);
    const onionRouter = (0, express_1.default)();
    onionRouter.use(express_1.default.json());
    onionRouter.use(body_parser_1.default.json());
    // Vérifier que le `nodeId` est bien valide
    if (nodeId === undefined || nodeId === null || isNaN(nodeId)) {
        console.error(`❌ Erreur: nodeId invalide (${nodeId})`);
        return;
    }
    // Route pour vérifier si le routeur fonctionne
    onionRouter.get("/status", (req, res) => {
        res.send("live");
    });
    // Variables de stockage
    let lastReceivedEncryptedMessage = null;
    let lastReceivedDecryptedMessage = null;
    let lastMessageDestination = null;
    let lastCircuit = []; // ✅ Correction : initialisé à un tableau vide.
    onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
        res.json({ result: lastReceivedEncryptedMessage ?? null });
    });
    onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
        res.json({ result: lastReceivedDecryptedMessage ?? null });
    });
    onionRouter.get("/getLastMessageDestination", (req, res) => {
        res.json({ result: lastMessageDestination ?? null });
    });
    onionRouter.get("/getLastCircuit", (req, res) => {
        res.json({ result: lastCircuit.length > 0 ? lastCircuit : [] });
    });
    // Route pour relayer les messages
    onionRouter.post("/relay", async (req, res) => {
        const { encryptedMessage, nextNode, destinationUserId, circuit } = req.body;
        if (!encryptedMessage || destinationUserId === undefined) {
            console.error("❌ Erreur: Paramètres invalides dans /relay", req.body);
            return res.status(400).json({ error: "Données invalides" });
        }
        lastReceivedEncryptedMessage = encryptedMessage;
        lastMessageDestination = destinationUserId;
        // ✅ Correction : Mise à jour du circuit
        if (Array.isArray(circuit) && circuit.length > 0) {
            lastCircuit = [...circuit, nodeId];
        }
        else {
            lastCircuit = [nodeId];
        }
        console.log(`📨 [Router ${nodeId}] a reçu un message chiffré.`);
        console.log(`🔍 Prochain noeud: ${nextNode}, Destinataire final: ${destinationUserId}`);
        console.log(`📡 Circuit suivi: ${lastCircuit.join(" -> ")}`);
        if (nextNode !== null && nextNode !== undefined && !isNaN(nextNode)) {
            console.log(`🔗 Relai du message vers le nœud ${nextNode}...`);
            try {
                await axios_1.default.post(`http://localhost:${config_1.BASE_ONION_ROUTER_PORT + nextNode}/relay`, {
                    encryptedMessage,
                    nextNode: null,
                    destinationUserId,
                    circuit: lastCircuit, // ✅ Correction: On passe bien le circuit mis à jour.
                });
                return res.json({ message: `Message relayé vers ${nextNode}` });
            }
            catch (error) {
                console.error(`❌ Erreur lors du relai vers ${nextNode}:`, error);
                return res.status(500).json({ error: `Erreur de relai vers ${nextNode}` });
            }
        }
        else {
            console.log("📬 Dernier nœud atteint, livraison finale !");
            try {
                await axios_1.default.post(`http://localhost:${config_1.BASE_USER_PORT + destinationUserId}/receive`, {
                    message: encryptedMessage,
                });
                return res.json({ message: "Message livré au dernier nœud" });
            }
            catch (error) {
                console.error(`❌ Erreur lors de la livraison finale:`, error);
                return res.status(500).json({ error: "Erreur de livraison finale" });
            }
        }
    });
    // 🔹 Enregistrement automatique du nœud dans le registre
    try {
        console.log(`🛠️ [DEBUG] Tentative d'enregistrement du nœud ${nodeId}...`);
        await axios_1.default.post(`http://localhost:${config_1.REGISTRY_PORT}/register`, {
            nodeId,
            pubKey: `PUBLIC_KEY_OF_NODE_${nodeId}`,
        });
        console.log(`✅ Onion Router ${nodeId} enregistré dans le registre.`);
    }
    catch (error) {
        console.error(`❌ Erreur lors de l'enregistrement du Router ${nodeId}:`, error);
    }
    // Démarrer le serveur
    const server = onionRouter.listen(port, () => {
        console.log(`🟢 Onion Router ${nodeId} est actif sur le port ${port}`);
    });
    server.on("error", (err) => {
        console.error(`❌ Erreur sur le routeur ${nodeId}:`, err);
    });
    return server;
}
exports.simpleOnionRouter = simpleOnionRouter;
// Exécuter immédiatement si lancé depuis la ligne de commande
if (require.main === module) {
    const nodeId = process.argv[2] ? parseInt(process.argv[2], 10) : 1;
    simpleOnionRouter(nodeId);
}
