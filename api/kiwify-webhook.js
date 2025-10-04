import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    const { status, buyer_email, customer_email } = req.body;
    const email = buyer_email || customer_email;

    if (!email) {
      return res.status(400).json({ error: "Email não encontrado no payload" });
    }

    if (status && status.toLowerCase() === "paid") {
      await admin.firestore().collection("usuarios").doc(email).set(
        {
          ativo: true,
          produto: "Pacote Completo",
          dataCompra: new Date().toISOString(),
        },
        { merge: true }
      );
      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ success: false, motivo: "Pagamento não confirmado" });
  } catch (err) {
    console.error("Erro no webhook:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
}