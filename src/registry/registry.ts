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
    res.json({ status: "Registry is running", nodeCount: nodes.length });
  });

  // Route pour enregistrer un nœud
  _registry.post("/register", (req: Request, res: Response) => {
    const { nodeId, pubKey } = req.body;

    if (!nodeId || !pubKey) {
      return res.status(400).json({ error: "Missing nodeId or pubKey" });
    }

    nodes.push({ nodeId, pubKey });
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

  return server;
}

// Exécuter immédiatement si lancé depuis la ligne de commande
if (require.main === module) {
  launchRegistry();
}