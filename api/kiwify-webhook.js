import admin from "firebase-admin";

export default async function handler(req, res) {
  try {
    // Mostra o corpo completo recebido
    console.log("🧾 Corpo completo recebido:", JSON.stringify(req.body, null, 2));

    // Rejeita GET (teste)
    if (req.method !== "POST") {
      return res
        .status(200)
        .json({ message: "Método não permitido (GET test OK)" });
    }

    // Inicializa o Firebase (só uma vez)
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

    // 🔍 O corpo já contém as chaves diretamente (Customer, Product, etc.)
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

    // Verifica se o e-mail existe
    if (!email) {
      console.warn("❌ Nenhum e-mail encontrado no payload!");
      return res.status(400).json({
        error: true,
        message: "Nenhum e-mail encontrado no payload!",
        body: req.body,
      });
    }

    // Se o status for "paid" ou "order_approved", grava no Firestore
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
