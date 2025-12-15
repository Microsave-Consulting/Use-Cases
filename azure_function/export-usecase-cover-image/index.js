const {
  getListItemById,
  getListItemAttachments,
  downloadAttachmentByServerRelativeUrl,
} = require("../Shared/spClient");

const MAIN_LIST = process.env.SP_LIST_TITLE;

function getExt(fileName = "") {
  const m = String(fileName).match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "jpg";
}

function guessContentTypeFromExt(ext = "") {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

function isImageFileName(name = "") {
  return /\.(png|jpe?g|webp|gif)$/i.test(String(name));
}

module.exports = async function (context, req) {
  try {
    const itemId = Number(req.query.itemId);
    if (!itemId) {
      context.res = { status: 400, body: "Missing or invalid itemId" };
      return;
    }

    // Optional: allow forcing download behavior
    const download = String(req.query.download || "").toLowerCase();
    const dispositionType = download === "1" || download === "true" ? "attachment" : "inline";

    // 1) Read item to find the Image-column reserved attachment name (best signal)
    const item = await getListItemById(MAIN_LIST, itemId, {
      select: "Id,ID,Image,Attachments,Modified",
    });

    let preferredFileName = null;
    if (item?.Image) {
      try {
        const parsed = typeof item.Image === "string" ? JSON.parse(item.Image) : item.Image;
        preferredFileName = parsed?.fileName || null;
      } catch {
        // ignore; we can still fallback to first image attachment
      }
    }

    // 2) List attachments
    const attachments = await getListItemAttachments(MAIN_LIST, itemId);
    if (!attachments?.length) {
      context.res = { status: 404, body: "No attachments found for this item" };
      return;
    }

    // 3) Choose the cover image:
    //    a) prefer the Image-column referenced filename
    //    b) else first image attachment
    let chosen = null;

    if (preferredFileName) {
      chosen = attachments.find((a) => a.FileName === preferredFileName) || null;
    }

    if (!chosen) {
      chosen = attachments.find((a) => isImageFileName(a.FileName)) || null;
    }

    if (!chosen) {
      context.res = { status: 404, body: "No image attachments found for this item" };
      return;
    }

    const sourceName = chosen.FileName;
    const ext = getExt(sourceName);

    // Enforce image-only export (guardrail)
    if (!isImageFileName(sourceName)) {
      context.res = { status: 400, body: "Chosen attachment is not an image" };
      return;
    }

    const contentType = guessContentTypeFromExt(ext);

    // 4) Download bytes from SharePoint
    const fileBuffer = await downloadAttachmentByServerRelativeUrl(chosen.ServerRelativeUrl);

    // 5) Always export under a stable filename: cover.<ext>
    const exportName = `cover.${ext}`;

    context.res = {
      status: 200,
      isRaw: true,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${dispositionType}; filename="${exportName}"`,
        "Cache-Control": "no-store",
        // Nice-to-have for debugging/export logic:
        "X-Source-Filename": sourceName,
        "X-Item-Id": String(itemId),
      },
      body: fileBuffer,
    };
  } catch (err) {
    const status = err?.response?.status || 500;

    context.log.error("Error in export-usecase-cover-image:", {
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
