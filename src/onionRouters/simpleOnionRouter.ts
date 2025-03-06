import bodyParser from "body-parser";
import express from "express";
import axios from "axios";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";

export async function simpleOnionRouter(nodeId: number) {
  const port = BASE_ONION_ROUTER_PORT + nodeId;
  console.log(`🚀 Tentative de démarrage du routeur ${nodeId} sur le port ${port}...`);

  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // Route pour vérifier si le routeur fonctionne
  onionRouter.get("/status", (req, res) => {
    res.json({ status: `Router ${nodeId} is running` });
  });

  // Route pour relayer les messages
  onionRouter.post("/relay", async (req, res) => {
    const { encryptedMessage, nextNode } = req.body;

    console.log(`📨 Router ${nodeId} a reçu un message chiffré !`);

    if (nextNode) {
      console.log(`🔗 Relai du message vers le nœud ${nextNode}...`);
      try {
        await axios.post(`http://localhost:${BASE_ONION_ROUTER_PORT + nextNode}/relay`, {
          encryptedMessage,
          nextNode: null, // Ici, on ne connaît pas les étapes suivantes
        });
        return res.json({ message: `Message relayé vers ${nextNode}` });
      } catch (error) {
        console.error(`Erreur lors du relai vers ${nextNode}:`, (error as Error).message);
        return res.status(500).json({ error: `Erreur de relai vers ${nextNode}` });
      }
    } else {
      console.log("📬 Dernier nœud atteint, livraison finale !");
      return res.json({ message: "Message livré au dernier nœud" });
    }
  });

  // 🔹 Enregistrement automatique du nœud dans le registre
  try {
    await axios.post(`http://localhost:${REGISTRY_PORT}/register`, {
      nodeId,
      pubKey: `PUBLIC_KEY_OF_NODE_${nodeId}`, // On mettra une vraie clé plus tard
    });
    console.log(`Onion Router ${nodeId} enregistré dans le registre.`);
  } catch (error) {
    console.error(`Erreur lors de l'enregistrement du Router ${nodeId}:`, (error as Error).message);
  }

  // Démarrer le serveur
  const server = onionRouter.listen(port, () => {
    console.log(`Onion Router ${nodeId} est actif sur le port ${port}`);
  });

  return server;
}

// Exécuter immédiatement si lancé depuis la ligne de commande
if (require.main === module) {
  const nodeId = process.argv[2] ? parseInt(process.argv[2], 10) : 1;
  simpleOnionRouter(nodeId);
}