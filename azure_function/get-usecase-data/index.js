const { getListItems } = require("../Shared/spClient");

const MAIN_LIST = process.env.SP_LIST_TITLE;

module.exports = async function (context, req) {
  try {
    const items = await getListItems(MAIN_LIST, {
      orderby: "Created desc",
    });

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: items,
    };
  } catch (err) {
    const status = err?.response?.status || 500;

    context.log.error("Error in get-usecase-data:", {
      status,
      message: err?.message,
      spData: err?.response?.data,
      stack: err?.stack,
    });

    context.res = {
      status,
      headers: { "Content-Type": "application/json" },
      body: {
        error: "Internal server error",
      },
    };
  }
};
