function runWebAction_(callback, fallbackPayload) {
  try {
    return callback();
  } catch (error) {
    return Object.assign({
      ok: false,
      status: 'error',
      message: error.message || String(error)
    }, fallbackPayload || {});
  }
}
