"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchRegistry = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const config_1 = require("../config");
// Liste des nœuds enregistrés
let nodes = [];
async function launchRegistry() {
    console.log("Début d'exécution du registre...");
    const _registry = (0, express_1.default)();
    _registry.use(express_1.default.json());
    _registry.use(body_parser_1.default.json());
    // Route pour vérifier si le registre fonctionne
    _registry.get("/status", (req, res) => {
        res.send("live");
    });
    _registry.get("/getNodeRegistry", (req, res) => {
        console.log("✅ Route /getNodeRegistry appelée !");
        return res.json({ nodes });
    });
    _registry.post("/register", (req, res) => {
        const { nodeId, pubKey } = req.body;
        console.log(`🛠️ [DEBUG] Enregistrement du nœud ${nodeId} avec clé ${pubKey}`);
        if (!nodeId || !pubKey) {
            console.log("❌ Enregistrement échoué : nodeId ou pubKey manquant");
            return res.status(400).json({ error: "Missing nodeId or pubKey" });
        }
        if (!nodes.some(n => n.nodeId === nodeId)) {
            nodes.push({ nodeId, pubKey });
        }
        console.log(`✅ Nœud enregistré avec succès. Total : ${nodes.length}`);
        return res.json({ message: "Node registered successfully", nodes });
    });
    console.log(`Tentative de démarrage du registre sur le port ${config_1.REGISTRY_PORT}...`);
    // Route pour récupérer la liste des nœuds enregistrés
    _registry.get("/nodes", (req, res) => {
        return res.json(nodes);
    });
    const server = _registry.listen(config_1.REGISTRY_PORT, () => {
        console.log(`Registry is listening on port ${config_1.REGISTRY_PORT}`);
    });
    server.on("error", (err) => {
        console.error(`❌ Erreur sur le registre :`, err);
    });
    return server;
}
exports.launchRegistry = launchRegistry;
// Exécuter immédiatement si lancé depuis la ligne de commande
if (require.main === module) {
    launchRegistry();
}
