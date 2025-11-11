export const byteArraysAreEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false
  if (a === b) return true
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}
