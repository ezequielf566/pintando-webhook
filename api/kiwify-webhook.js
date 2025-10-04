import admin from "firebase-admin";

export default async function handler(req, res) {
  try {
    console.log("🧾 Corpo completo recebido:", JSON.stringify(req.body, null, 2));

    // Rejeita requisições que não sejam POST
    if (req.method !== "POST") {
      return res.status(200).json({ message: "Método não permitido (GET test OK)" });
    }

    // Inicializa o Firebase uma única vez
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.FIREBASE_DB_URL,
      });
      console.log("✅ Firebase inicializado com sucesso!");
    }

    // ✅ Extrai dados do JSON real da Kiwify
    const order = req.body.order || {};
    const customer = order.Customer || {};
    const product = order.Product || {};

    const email = customer.email;
    const status = order.order_status;
    const nomeProduto = product.product_name || "Produto Kiwify";

    console.log("📦 Dados interpretados:", { email, status, nomeProduto });

    if (!email) {
      console.warn("❌ Nenhum e-mail encontrado no payload!");
      return res.status(400).json({
        error: true,
        message: "Nenhum e-mail encontrado no payload!",
        body: req.body,
      });
    }

    // 💰 Grava somente se o pagamento foi aprovado
    if (status && status.toLowerCase() === "paid") {
      await admin.firestore().collection("usuarios").doc(email).set(
        {
          ativo: true,
          produto: nomeProduto,
          dataCompra: new Date().toISOString(),
        },
        { merge: true }
      );

      console.log(`✅ Usuário ${email} registrado com sucesso!`);
      return res.status(200).json({ success: true });
    }

    console.log("⚠️ Pagamento ainda não confirmado:", status);
    return res.status(200).json({ success: false, motivo: "Pagamento não confirmado" });
  } catch (err) {
    console.error("❌ ERRO DETECTADO:", err.message);
    return res.status(500).json({
      error: true,
      message: err.message,
      hint: "Verifique os logs no Vercel para detalhes",
    });
  }
}
