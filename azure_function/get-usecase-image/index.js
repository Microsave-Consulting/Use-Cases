const {
  getListItemById,
  getListItemAttachments,
  downloadAttachmentByServerRelativeUrl,
} = require("../Shared/spClient");

const MAIN_LIST = process.env.SP_LIST_TITLE;

function guessContentType(fileName = "") {
  const f = fileName.toLowerCase();
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".webp")) return "image/webp";
  if (f.endsWith(".gif")) return "image/gif";
  if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

module.exports = async function (context, req) {
  try {
    const itemId = Number(req.query.itemId);
    if (!itemId) {
      context.res = { status: 400, body: "Missing or invalid itemId" };
      return;
    }

    // 1) Read item to find the Image-column reserved attachment name (best signal)
    const item = await getListItemById(MAIN_LIST, itemId);

    let imageFileName = null;
    if (item?.Image) {
      // Your output shows Image is a JSON-encoded string
      const parsed = typeof item.Image === "string" ? JSON.parse(item.Image) : item.Image;
      imageFileName = parsed?.fileName || null;
    }

    // 2) List attachments
    const attachments = await getListItemAttachments(MAIN_LIST, itemId);
    if (!attachments?.length) {
      context.res = { status: 404, body: "No attachments found for this item" };
      return;
    }

    // 3) Choose file: prefer Image.fileName, else first image attachment
    let chosen = null;
    if (imageFileName) {
      chosen = attachments.find((a) => a.FileName === imageFileName);
    }
    if (!chosen) {
      chosen =
        attachments.find((a) => /\.(png|jpe?g|webp|gif)$/i.test(a.FileName)) ||
        attachments[0];
    }

    // 4) Download bytes
    const fileName = chosen.FileName;
    const serverRelativeUrl = chosen.ServerRelativeUrl;

    const fileBuffer = await downloadAttachmentByServerRelativeUrl(serverRelativeUrl);

    // 5) Stream back
    context.res = {
      status: 200,
      isRaw: true,
      headers: {
        "Content-Type": guessContentType(fileName),
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
      body: fileBuffer,
    };
  } catch (err) {
    const status = err?.response?.status || 500;

    context.log.error("Error in get-usecase-image:", {
      status,
      message: err?.message,
      spData: err?.response?.data,
      stack: err?.stack,
    });

    context.res = {
      status,
      headers: { "Content-Type": "application/json" },
      body: { error: "Internal server error" },
    };
  }
};
