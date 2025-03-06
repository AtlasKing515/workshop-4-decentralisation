import bodyParser from "body-parser";
import express from "express";
import axios from "axios";
import { BASE_USER_PORT, REGISTRY_PORT, BASE_ONION_ROUTER_PORT } from "../config";
import { rsaEncrypt, importPubKey, exportPubKey, generateRsaKeyPair } from "../crypto";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  console.log(`Génération de la clé RSA pour l'utilisateur ${userId}...`);

  // 🔹 Générer une paire de clés RSA pour l'utilisateur
  const { publicKey, privateKey } = await generateRsaKeyPair();
  const publicKeyBase64 = await exportPubKey(publicKey);

  console.log(`Clé publique générée pour User ${userId}`);

  // Route pour vérifier l'état de l'utilisateur
  _user.get("/status", (req, res) => {
    res.json({ status: `User ${userId} is running` });
  });

  // Route pour envoyer un message via Onion Routing
  _user.post("/send", async (req, res) => {
    const { message, destinationUserId }: SendMessageBody = req.body;

    console.log(`📨 Utilisateur ${userId} envoie un message à ${destinationUserId}...`);

    try {
      // 🔹 1. Récupérer la liste des nœuds du registre
      const response = await axios.get(`http://localhost:${REGISTRY_PORT}/nodes`);
      let nodes: { nodeId: number; pubKey: string }[] = response.data;

      if (nodes.length === 0) {
        return res.status(500).json({ error: "Aucun nœud disponible" });
      }

      console.log(`Nœuds disponibles :`, nodes);

      // 🔹 2. Construire la route Onion (dernier → premier)
      nodes = nodes.sort((a, b) => b.nodeId - a.nodeId); // Trie les nœuds du plus grand au plus petit
      const route = nodes.filter(n => n.nodeId !== destinationUserId); // Supprime le destinataire de la liste des nœuds
      route.push({ nodeId: destinationUserId, pubKey: "" }); // Ajoute uniquement à la fin      

      console.log(`Route construite : ${route.map((n) => n.nodeId).join(" -> ")}`);

      // 🔹 3. Chiffrer le message en plusieurs couches (Onion Routing)
      let encryptedMessage = message;

      for (const node of route) {
        if (!node.pubKey) continue; // Ne pas chiffrer avec la clé du destinataire

        console.log(`Chiffrement avec la clé du nœud ${node.nodeId}...`);
        const publicKey = await importPubKey(node.pubKey);
        const publicKeyBase64 = await exportPubKey(publicKey);
        encryptedMessage = await rsaEncrypt(encryptedMessage, publicKeyBase64);
      }

      console.log("Message totalement chiffré.");

      // 🔹 4. Vérifier que l'entrée de Onion Router existe
      const entryNode = route[0];
      const entryPort = BASE_ONION_ROUTER_PORT + entryNode.nodeId;

      console.log(`Vérification du nœud d'entrée ${entryNode.nodeId} sur le port ${entryPort}...`);

      try {
        await axios.get(`http://localhost:${entryPort}/status`);
      } catch {
        console.error(`Le nœud ${entryNode.nodeId} n'est pas accessible sur ${entryPort}`);
        return res.status(500).json({ error: `Nœud ${entryNode.nodeId} injoignable` });
      }

      // 🔹 5. Envoyer le message au premier nœud de la route
      console.log(`📤 Envoi du message chiffré au nœud ${entryNode.nodeId}`);

      await axios.post(`http://localhost:${entryPort}/relay`, {
        encryptedMessage,
        nextNode: route[1]?.nodeId ?? null,
      }, { timeout: 5000 });

      console.log("Message chiffré envoyé !");
      return res.json({ message: "Message envoyé avec succès" });

    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", (error as Error).message);
      return res.status(500).json({ error: "Erreur lors de l'envoi du message" });
    }
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(`User ${userId} is listening on port ${BASE_USER_PORT + userId}`);
  });

  return server;
}

// Exécuter immédiatement si lancé depuis la ligne de commande
if (require.main === module) {
  const userId = process.argv[2] ? parseInt(process.argv[2], 10) : 1;
  user(userId);
}