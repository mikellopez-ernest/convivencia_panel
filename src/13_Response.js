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

function withScriptLock_(context, callback) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(15000)) {
    throw new Error('Could not acquire lock for ' + context + '. Please try again.');
  }

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}
