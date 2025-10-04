import admin from "firebase-admin";

// Garante que o body seja parseado corretamente pelo Vercel
export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  try {
    console.log("🧾 Corpo completo recebido:", JSON.stringify(req.body, null, 2));

    // Só aceita POST
    if (req.method !== "POST") {
      return res.status(200).json({ message: "Método não permitido (GET test OK)" });
    }

    // 🚀 Logs de inicialização do Firebase
    if (!admin.apps.length) {
      console.log("🚀 Tentando inicializar o Firebase com:");
      console.log("🔹 projectId:", process.env.FIREBASE_PROJECT_ID);
      console.log("🔹 clientEmail:", process.env.FIREBASE_CLIENT_EMAIL);
      console.log(
        "🔹 privateKey começa com:",
        process.env.FIREBASE_PRIVATE_KEY?.slice(0, 30)
      );
      console.log("🔹 databaseURL:", process.env.FIREBASE_DB_URL);

      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
          databaseURL: process.env.FIREBASE_DB_URL,
        });
        console.log("✅ Firebase inicializado com sucesso!");
      } catch (error) {
        console.error("❌ ERRO ao inicializar Firebase:", error);
      }
    }

    // 🔍 Extrai os campos principais do corpo
    const body = req.body;
    const email =
      body.Customer?.email ||
      body.customer?.email ||
      body.CustomerEmail ||
      null;

    const status =
      body.order_status?.toLowerCase() ||
      body.webhook_event_type?.toLowerCase() ||
      "";

    const produto =
      body.Product?.product_name ||
      body.product?.product_name ||
      "Produto Kiwify";

    console.log("📦 Dados interpretados:", { email, status, produto });

    if (!email) {
      console.warn("❌ Nenhum e-mail encontrado no payload!");
      return res.status(400).json({
        error: true,
        message: "Nenhum e-mail encontrado no payload!",
        body,
      });
    }

    // 💰 Grava apenas se o pagamento foi aprovado
    if (status === "paid" || status === "order_approved") {
      await admin
        .firestore()
        .collection("usuarios")
        .doc(email)
        .set(
          {
            ativo: true,
            produto,
            dataCompra: new Date().toISOString(),
          },
          { merge: true }
        );

      console.log(`✅ Usuário ${email} registrado/atualizado com sucesso!`);
      return res.status(200).json({ success: true });
    }

    console.log("⚠️ Pagamento ainda não confirmado:", status);
    return res
      .status(200)
      .json({ success: false, motivo: "Pagamento não confirmado" });
  } catch (err) {
    console.error("❌ ERRO DETECTADO:", err.message);
    return res.status(500).json({
      error: true,
      message: err.message,
      hint: "Verifique os logs no Vercel para detalhes",
    });
  }
}
