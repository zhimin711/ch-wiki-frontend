/**
 * SM2 加密工具（纯 BigInt 实现，零依赖）。
 * 移植自 ch-wiki 后端 sm2-library.js，仅保留 C1C3C2 加密功能。
 *
 * 用法：
 *   import { sm2Encrypt } from '~/services/sm2-crypto'
 *   const cipherBase64 = sm2Encrypt('明文密码', publicKeyBase64)
 */

// --- SM2 曲线参数 (SM2 P-256) ---
const P = BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF')
const A = BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC')
const B = BigInt('0x28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93')
const N = BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123')
const GX = BigInt('0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7')
const GY = BigInt('0xBC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0')

const INF: Point = { inf: true }

interface Point {
  x?: bigint
  y?: bigint
  inf: boolean
}

function mod(v: bigint, m: bigint): bigint {
  const r = v % m
  return r >= 0n ? r : r + m
}

function inv(v: bigint, m: bigint): bigint {
  let a = mod(v, m)
  let b = m
  let x = 1n
  let y = 0n
  while (b !== 0n) {
    const q = a / b
    const t = a % b
    a = b
    b = t
    const tt = x - q * y
    x = y
    y = tt
  }
  if (a !== 1n) throw new Error('inverse failed')
  return mod(x, m)
}

function pt(x: bigint, y: bigint): Point {
  return { x, y, inf: false }
}

function pointAdd(p1: Point, p2: Point): Point {
  if (p1.inf) return p2
  if (p2.inf) return p1
  if (p1.x === p2.x) {
    if (mod(p1.y! + p2.y!, P) === 0n) return INF
    return pointDouble(p1)
  }
  const l = mod((p2.y! - p1.y!) * inv(p2.x! - p1.x!, P), P)
  const x3 = mod(l * l - p1.x! - p2.x!, P)
  const y3 = mod(l * (p1.x! - x3) - p1.y!, P)
  return pt(x3, y3)
}

function pointDouble(p1: Point): Point {
  if (p1.inf || p1.y === 0n) return INF
  const l = mod((3n * p1.x! * p1.x! + A) * inv(2n * p1.y!, P), P)
  const x3 = mod(l * l - 2n * p1.x!, P)
  const y3 = mod(l * (p1.x! - x3) - p1.y!, P)
  return pt(x3, y3)
}

function pointMul(k: bigint, p1: Point): Point {
  let result: Point = INF
  let addend = p1
  while (k > 0n) {
    if ((k & 1n) === 1n) result = pointAdd(result, addend)
    addend = pointDouble(addend)
    k >>= 1n
  }
  return result
}

// --- 字节 / BigInt 互转 ---

function bytesToBigInt(bytes: Uint8Array): bigint {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0')
  return BigInt('0x' + (hex || '0'))
}

function bigIntToBytes(v: bigint, len: number): Uint8Array {
  let hex = v.toString(16)
  if (hex.length % 2) hex = '0' + hex
  const out: number[] = []
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substring(i, i + 2), 16))
  while (out.length < len) out.unshift(0)
  return new Uint8Array(out.slice(-len))
}

function concatBytes(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(len)
  let offset = 0
  for (const a of arrs) { out.set(a, offset); offset += a.length }
  return out
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

// --- 解析公钥 (04 || X || Y 格式) ---

function parsePublicKey(publicKeyBase64: string): Point {
  const bytes = base64ToBytes(publicKeyBase64)
  const candidate = bytes.length >= 65 ? bytes.slice(bytes.length - 65) : bytes
  if (candidate.length === 65 && candidate[0] === 4) {
    return pt(bytesToBigInt(candidate.slice(1, 33)), bytesToBigInt(candidate.slice(33, 65)))
  }
  for (let i = 0; i <= bytes.length - 65; i++) {
    if (bytes[i] === 4) {
      const c = bytes.slice(i, i + 65)
      return pt(bytesToBigInt(c.slice(1, 33)), bytesToBigInt(c.slice(33, 65)))
    }
  }
  throw new Error('invalid public key')
}

// --- SM3 杂凑 ---

function rotl(x: number, n: number): number {
  n = n & 31
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function p0(x: number): number {
  return (x ^ rotl(x, 9) ^ rotl(x, 17)) >>> 0
}

function p1(x: number): number {
  return (x ^ rotl(x, 15) ^ rotl(x, 23)) >>> 0
}

function sm3(bytes: Uint8Array): Uint8Array {
  const len = bytes.length
  const bitLen = len * 8
  const k = (56 - (len + 1) % 64 + 64) % 64
  const padded = new Uint8Array(len + 1 + k + 8)
  padded.set(bytes)
  padded[len] = 0x80
  const high = Math.floor(bitLen / 0x100000000)
  const low = bitLen >>> 0
  const pos = padded.length - 8
  padded[pos] = (high >>> 24) & 0xff
  padded[pos + 1] = (high >>> 16) & 0xff
  padded[pos + 2] = (high >>> 8) & 0xff
  padded[pos + 3] = high & 0xff
  padded[pos + 4] = (low >>> 24) & 0xff
  padded[pos + 5] = (low >>> 16) & 0xff
  padded[pos + 6] = (low >>> 8) & 0xff
  padded[pos + 7] = low & 0xff

  let v = [0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600,
    0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e]

  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Array<number>(68)
    const w1 = new Array<number>(64)
    for (let i = 0; i < 16; i++) {
      const p = offset + i * 4
      w[i] = ((padded[p] << 24) | (padded[p + 1] << 16) | (padded[p + 2] << 8) | padded[p + 3]) >>> 0
    }
    for (let j = 16; j < 68; j++) {
      w[j] = (p1(w[j - 16] ^ w[j - 9] ^ rotl(w[j - 3], 15)) ^ rotl(w[j - 13], 7) ^ w[j - 6]) >>> 0
    }
    for (let j2 = 0; j2 < 64; j2++) {
      w1[j2] = (w[j2] ^ w[j2 + 4]) >>> 0
    }
    let [a, b, c, d, e, f, g, h] = v
    for (let r = 0; r < 64; r++) {
      const tj = r < 16 ? 0x79cc4519 : 0x7a879d8a
      const ss1 = rotl((((rotl(a, 12) + e) >>> 0) + rotl(tj, r)) >>> 0, 7)
      const ss2 = (ss1 ^ rotl(a, 12)) >>> 0
      const ff = r < 16 ? (a ^ b ^ c) : ((a & b) | (a & c) | (b & c))
      const gg = r < 16 ? (e ^ f ^ g) : ((e & f) | ((~e) & g))
      const tt1 = (((((ff + d) >>> 0) + ss2) >>> 0) + w1[r]) >>> 0
      const tt2 = (((((gg + h) >>> 0) + ss1) >>> 0) + w[r]) >>> 0
      d = c; c = rotl(b, 9); b = a; a = tt1
      h = g; g = rotl(f, 19); f = e; e = p0(tt2)
    }
    v = [v[0] ^ a, v[1] ^ b, v[2] ^ c, v[3] ^ d, v[4] ^ e, v[5] ^ f, v[6] ^ g, v[7] ^ h]
      .map(x => x >>> 0)
  }

  const out = new Uint8Array(32)
  for (let oi = 0; oi < 8; oi++) {
    out[oi * 4] = (v[oi] >>> 24) & 0xff
    out[oi * 4 + 1] = (v[oi] >>> 16) & 0xff
    out[oi * 4 + 2] = (v[oi] >>> 8) & 0xff
    out[oi * 4 + 3] = v[oi] & 0xff
  }
  return out
}

// --- KDF 密钥派生 ---

function kdf(z: Uint8Array, length: number): Uint8Array {
  let ct = 1
  const out = new Uint8Array(length)
  let offset = 0
  while (offset < length) {
    const counter = new Uint8Array([ct >>> 24, (ct >>> 16) & 0xff, (ct >>> 8) & 0xff, ct & 0xff])
    const hash = sm3(concatBytes(z, counter))
    const take = Math.min(hash.length, length - offset)
    out.set(hash.slice(0, take), offset)
    offset += take
    ct++
  }
  return out
}

// --- 安全随机数 ---

function randomScalar(): bigint {
  const cryptoObj = globalThis.crypto
  if (!cryptoObj || !cryptoObj.getRandomValues) throw new Error('secure random unavailable')
  const bytes = new Uint8Array(32)
  let k: bigint
  do {
    cryptoObj.getRandomValues(bytes)
    k = bytesToBigInt(bytes)
  } while (k <= 0n || k >= N)
  return k
}

// --- SM2 加密 (C1C3C2 模式) ---

/**
 * 使用 SM2 公钥加密消息，返回 Base64 编码的密文 (C1C3C2 格式)。
 *
 * @param message  明文字符串
 * @param publicKeyBase64  Base64 编码的 SM2 公钥 (04 || X || Y)
 * @returns Base64 编码的密文
 */
export function sm2Encrypt(message: string, publicKeyBase64: string): string {
  const msg = textToBytes(message)
  const publicPoint = parsePublicKey(publicKeyBase64)

  let c1: Uint8Array
  let c2: Uint8Array
  let c3: Uint8Array

  do {
    const k = randomScalar()
    const p1 = pointMul(k, pt(GX, GY))
    const p2 = pointMul(k, publicPoint)
    const x2 = bigIntToBytes(p2.x!, 32)
    const y2 = bigIntToBytes(p2.y!, 32)
    const t = kdf(concatBytes(x2, y2), msg.length)

    let allZero = true
    c2 = new Uint8Array(msg.length)
    for (let i = 0; i < msg.length; i++) {
      if (t[i] !== 0) allZero = false
      c2[i] = msg[i] ^ t[i]
    }
    if (allZero) continue

    c1 = concatBytes(new Uint8Array([4]), bigIntToBytes(p1.x!, 32), bigIntToBytes(p1.y!, 32))
    c3 = sm3(concatBytes(x2, msg, y2))
    break
  } while (true)

  return bytesToBase64(concatBytes(c1, c3, c2))
}
