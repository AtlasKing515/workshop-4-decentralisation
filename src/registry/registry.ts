import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

// Liste des nœuds enregistrés
let nodes: Node[] = [];

export async function launchRegistry() {
  console.log("Début d'exécution du registre...");

  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // Route pour vérifier si le registre fonctionne
  _registry.get("/status", (req: Request, res: Response) => {
    res.send("live");
  });

  
  _registry.get("/getNodeRegistry", (req: Request, res: Response) => {
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



  console.log(`Tentative de démarrage du registre sur le port ${REGISTRY_PORT}...`);

  // Route pour récupérer la liste des nœuds enregistrés
_registry.get("/nodes", (req: Request, res: Response) => {
  return res.json(nodes);
});

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  server.on("error", (err) => {
    console.error(`❌ Erreur sur le registre :`, err);
  });  

  return server;
}

// Exécuter immédiatement si lancé depuis la ligne de commande
if (require.main === module) {
  launchRegistry();
}