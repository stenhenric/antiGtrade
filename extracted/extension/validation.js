function validateMessage(msg) {
  if (!msg || typeof msg !== 'object') return { valid: false, reason: 'Invalid message' };
  const num = v => typeof v === 'number' ? v : Number(v);

  switch (msg.command) {
    case 'save_keys':
      if (!msg.keys || !msg.keys.apiKey || !msg.keys.secret || !msg.keys.passphrase) {
        return { valid: false, reason: 'All credential fields are required' };
      }
      return { valid: true };
    case 'place_order':
      if (!msg.instId || !/^[A-Z0-9\-]{3,}$/.test(msg.instId)) return { valid: false, reason: 'Invalid instrument id' };
      if (!['buy','sell'].includes(msg.side)) return { valid: false, reason: 'Invalid side' };
      if (!['market','limit','stop','trailing stop'].includes(String(msg.type).toLowerCase())) return { valid: false, reason: 'Invalid order type' };
      const sz = num(msg.sz);
      if (!Number.isFinite(sz) || sz <= 0) return { valid: false, reason: 'Size must be > 0' };
      if (msg.px && (!Number.isFinite(num(msg.px)) || num(msg.px) <= 0)) return { valid: false, reason: 'Price must be > 0' };
      return { valid: true };
    case 'set_leverage':
      if (!msg.instId) return { valid: false, reason: 'Instrument required' };
      const lever = num(msg.lever);
      if (!Number.isFinite(lever) || lever < 1 || lever > 125) return { valid: false, reason: 'Leverage must be between 1-125' };
      return { valid: true };
    case 'stop_bot':
      if (!msg.algoId || !msg.instId) return { valid: false, reason: 'Missing bot identifiers' };
      if (!msg.algoOrdType || !/^[a-zA-Z_]{1,20}$/.test(msg.algoOrdType)) return { valid: false, reason: 'Invalid algo order type' };
      return { valid: true };
    case 'close_position':
      if (!msg.instId) return { valid: false, reason: 'Instrument required' };
      return { valid: true };
    default:
      return { valid: true };
  }
}

module.exports = { validateMessage };
