/* Storage is optional: blocked access or corrupt JSON must not disable a lab. */
window.BallzatramStorage = Object.freeze({
  read(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  }
});
